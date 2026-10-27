import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { VehicleService } from '../vehicle/vehicle.service.js';
import { MechanicService } from '../mechanic/mechanic.service.js';
import { WorkshopService } from '../workshop/workshop.service.js';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto.js';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto.js';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto.js';
import { Maintenance } from './entities/maintenance.entity.js';
import { ACTIVE_MAINTENANCE_STATUSES, MaintenanceStatusEnum } from './enum/maintenance-status.enum.js';
import { assertValidTransition } from './maintenance-state-machine.js';
import { VehicleStatusEnum } from '../vehicle/enum/vehicle-status.enum.js';
import { RequestUser } from '../common/types/request-user.type.js';
import { RoleEnum } from '../user/enum/roleEnum.js';

// Not in the spec's literal field list — applied when a client omits scheduledEndAt, so the
// mechanic-overlap rule always has a real window to compare against.
const DEFAULT_MAINTENANCE_DURATION_MINUTES = 90;

const RELATIONS = { vehicle: true, mechanic: true, workshop: true } as const;

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(Maintenance)
    private readonly maintenanceRepository: Repository<Maintenance>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly vehicleService: VehicleService,
    private readonly mechanicService: MechanicService,
    private readonly workshopService: WorkshopService,
  ) {}

  async create(dto: CreateMaintenanceDto) {
    const vehicle = await this.vehicleService.assertExistsAndActive(dto.vehicleId);
    const mechanic = await this.mechanicService.assertActiveAndExists(dto.mechanicId);
    const workshop = await this.workshopService.assertActiveAndExists(dto.workshopId);

    if (dto.mileage < vehicle.mileage) {
      throw new BadRequestException(
        `Maintenance mileage (${dto.mileage}) cannot be lower than the vehicle's current mileage (${vehicle.mileage})`,
      );
    }

    const scheduledAt = new Date(dto.scheduledAt);
    const scheduledEndAt = dto.scheduledEndAt
      ? new Date(dto.scheduledEndAt)
      : new Date(scheduledAt.getTime() + DEFAULT_MAINTENANCE_DURATION_MINUTES * 60_000);

    // Two distinct "no double-booking" rules: the vehicle rule is flat (any active maintenance
    // at all blocks a new one), the mechanic rule is genuinely time-window/interval-based.
    await this.assertVehicleHasNoActiveMaintenance(vehicle.id);
    await this.assertMechanicHasNoOverlap(mechanic.id, scheduledAt, scheduledEndAt);

    const maintenance = this.maintenanceRepository.create({
      type: dto.type,
      description: dto.description,
      mileage: dto.mileage,
      scheduledAt,
      scheduledEndAt,
      status: MaintenanceStatusEnum.SCHEDULED,
      vehicleId: vehicle.id,
      mechanicId: mechanic.id,
      workshopId: workshop.id,
    });
    return this.maintenanceRepository.save(maintenance);
  }

  findAll() {
    return this.maintenanceRepository.find({ relations: RELATIONS });
  }

  findActive() {
    return this.maintenanceRepository.find({
      where: { status: In(ACTIVE_MAINTENANCE_STATUSES) },
      relations: RELATIONS,
    });
  }

  async findByVehicle(vehicleId: number) {
    await this.vehicleService.findOne(vehicleId);
    return this.maintenanceRepository.find({
      where: { vehicleId },
      relations: RELATIONS,
      order: { scheduledAt: 'DESC' },
    });
  }

  async findByMechanic(mechanicId: number) {
    await this.mechanicService.findOne(mechanicId);
    return this.maintenanceRepository.find({
      where: { mechanicId },
      relations: RELATIONS,
      order: { scheduledAt: 'DESC' },
    });
  }

  // "My maintenances" for a logged-in TECHNICIAN, resolved from their linked mechanic profile.
  async findMine(currentUser: RequestUser) {
    const mechanic = await this.mechanicService.findByUserId(currentUser.id);
    return this.findByMechanic(mechanic.id);
  }

  async findOne(id: number) {
    const maintenance = await this.maintenanceRepository.findOne({
      where: { id },
      relations: RELATIONS,
    });
    if (!maintenance) {
      throw new NotFoundException(`Maintenance #${id} not found`);
    }
    return maintenance;
  }

  async update(id: number, dto: UpdateMaintenanceDto) {
    await this.findOne(id);
    const changes: Partial<Maintenance> = {
      type: dto.type,
      description: dto.description,
      mileage: dto.mileage,
      vehicleId: dto.vehicleId,
      mechanicId: dto.mechanicId,
      workshopId: dto.workshopId,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      scheduledEndAt: dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : undefined,
    };
    await this.maintenanceRepository.update(id, changes);
    return this.findOne(id);
  }

  async updateStatus(id: number, dto: UpdateMaintenanceStatusDto, currentUser: RequestUser) {
    const maintenance = await this.findOne(id);
    await this.assertOwnership(maintenance, currentUser);
    assertValidTransition(maintenance.status, dto.status);

    if (dto.status === MaintenanceStatusEnum.COMPLETED) {
      if (dto.finalMileage == null || dto.finalCost == null || !dto.workPerformed) {
        throw new BadRequestException(
          'workPerformed, finalCost and finalMileage are required to complete a maintenance',
        );
      }
      if (dto.finalMileage < maintenance.mileage) {
        throw new BadRequestException(
          `Final mileage (${dto.finalMileage}) cannot be lower than the maintenance's scheduled mileage (${maintenance.mileage})`,
        );
      }
    }

    // Maintenance status and the vehicle's status/mileage must change together or not at all —
    // a transaction keeps a failed vehicle update from leaving the maintenance row half-updated.
    return this.dataSource.transaction(async (manager) => {
      const maintenanceRepository = manager.getRepository(Maintenance);

      const changes: Partial<Maintenance> = { status: dto.status };
      if (dto.status === MaintenanceStatusEnum.COMPLETED) {
        changes.workPerformed = dto.workPerformed!;
        changes.finalCost = String(dto.finalCost);
        changes.finalMileage = dto.finalMileage!;
        changes.finishedAt = dto.finishedAt ? new Date(dto.finishedAt) : new Date();
      }
      await maintenanceRepository.update(id, changes);

      if (dto.status === MaintenanceStatusEnum.IN_PROGRESS) {
        await this.vehicleService.updateMileageAndStatus(
          maintenance.vehicleId,
          { status: VehicleStatusEnum.IN_MAINTENANCE },
          manager,
        );
      } else if (dto.status === MaintenanceStatusEnum.COMPLETED) {
        await this.vehicleService.updateMileageAndStatus(
          maintenance.vehicleId,
          { status: VehicleStatusEnum.AVAILABLE, mileage: dto.finalMileage },
          manager,
        );
      } else if (
        dto.status === MaintenanceStatusEnum.CANCELLED &&
        maintenance.status === MaintenanceStatusEnum.IN_PROGRESS
      ) {
        // Safety net: a maintenance cancelled mid-service must not leave its vehicle stuck
        // IN_MAINTENANCE with nothing actively holding it there.
        await this.vehicleService.updateMileageAndStatus(
          maintenance.vehicleId,
          { status: VehicleStatusEnum.AVAILABLE },
          manager,
        );
      }

      return maintenanceRepository.findOne({ where: { id }, relations: RELATIONS });
    });
  }

  private async assertOwnership(maintenance: Maintenance, currentUser: RequestUser) {
    if (currentUser.role === RoleEnum.ADMIN) {
      return;
    }
    const mechanic = await this.mechanicService.findByUserId(currentUser.id).catch(() => null);
    if (!mechanic || mechanic.id !== maintenance.mechanicId) {
      throw new ForbiddenException('You can only update maintenances assigned to you');
    }
  }

  private async assertVehicleHasNoActiveMaintenance(vehicleId: number) {
    const existing = await this.maintenanceRepository.findOne({
      where: { vehicleId, status: In(ACTIVE_MAINTENANCE_STATUSES) },
    });
    if (existing) {
      throw new ConflictException(`Vehicle #${vehicleId} already has an active maintenance`);
    }
  }

  private async assertMechanicHasNoOverlap(
    mechanicId: number,
    scheduledAt: Date,
    scheduledEndAt: Date,
  ) {
    const candidates = await this.maintenanceRepository.find({
      where: { mechanicId, status: In(ACTIVE_MAINTENANCE_STATUSES) },
    });
    const overlaps = candidates.some(
      (existing) => scheduledAt < existing.scheduledEndAt && scheduledEndAt > existing.scheduledAt,
    );
    if (overlaps) {
      throw new ConflictException(
        `Mechanic #${mechanicId} already has an overlapping maintenance scheduled in this time window`,
      );
    }
  }
}
