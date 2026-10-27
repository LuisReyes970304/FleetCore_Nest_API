import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { ExternalVehicleResponseDto } from './dto/external-vehicle-response.dto.js';
import { Vehicle } from './entities/vehicle.entity.js';
import { VehicleStatusEnum } from './enum/vehicle-status.enum.js';
import { Maintenance } from '../maintenance/entities/maintenance.entity.js';

@Injectable()
export class VehicleService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(Maintenance)
    private readonly maintenanceRepository: Repository<Maintenance>,
  ) {}

  async create(createVehicleDto: CreateVehicleDto) {
    const existingPlate = await this.vehicleRepository.findOneBy({
      plate: createVehicleDto.plate,
    });
    if (existingPlate) {
      throw new ConflictException(`A vehicle with plate ${createVehicleDto.plate} already exists`);
    }
    const vehicle = this.vehicleRepository.create(createVehicleDto);
    vehicle.status = VehicleStatusEnum.AVAILABLE;
    return this.vehicleRepository.save(vehicle);
  }

  findAll() {
    return this.vehicleRepository.find();
  }

  async findOne(id: number) {
    const vehicle = await this.vehicleRepository.findOneBy({ id });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle #${id} not found`);
    }
    return vehicle;
  }

  async findByPlate(plate: string) {
    const vehicle = await this.vehicleRepository.findOneBy({ plate });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with plate ${plate} not found`);
    }
    return vehicle;
  }

  async update(id: number, updateVehicleDto: UpdateVehicleDto) {
    await this.findOne(id);
    if (updateVehicleDto.plate) {
      const existingPlate = await this.vehicleRepository.findOneBy({
        plate: updateVehicleDto.plate,
      });
      if (existingPlate && existingPlate.id !== id) {
        throw new ConflictException(
          `A vehicle with plate ${updateVehicleDto.plate} already exists`,
        );
      }
    }
    await this.vehicleRepository.update(id, updateVehicleDto);
    return this.findOne(id);
  }

  // Only AVAILABLE <-> INACTIVE here, deliberately: IN_MAINTENANCE is only ever set by
  // MaintenanceService as a side effect of a real maintenance starting/finishing.
  async setStatus(id: number, status: VehicleStatusEnum.AVAILABLE | VehicleStatusEnum.INACTIVE) {
    const vehicle = await this.findOne(id);
    if (vehicle.status === VehicleStatusEnum.IN_MAINTENANCE) {
      throw new ConflictException(
        'Cannot change the status of a vehicle that is currently in maintenance',
      );
    }
    await this.vehicleRepository.update(id, { status });
    return this.findOne(id);
  }

  // Consumed by MaintenanceService when assigning a vehicle to a new maintenance.
  async assertExistsAndActive(id: number): Promise<Vehicle> {
    const vehicle = await this.findOne(id);
    if (vehicle.status === VehicleStatusEnum.INACTIVE) {
      throw new ConflictException(`Vehicle #${id} is inactive`);
    }
    return vehicle;
  }

  // Internal-only: driven by MaintenanceService inside its status-transition transactions, never
  // exposed directly on the controller, so a client can never desync vehicle state/mileage from
  // its actual maintenance history. Accepts an optional transactional EntityManager so the
  // vehicle update commits atomically with the maintenance update that triggered it.
  async updateMileageAndStatus(
    id: number,
    changes: { mileage?: number; status: VehicleStatusEnum },
    manager?: EntityManager,
  ) {
    const repository = manager ? manager.getRepository(Vehicle) : this.vehicleRepository;
    await repository.update(id, changes);
  }

  async getExternalProfile(plate: string): Promise<ExternalVehicleResponseDto> {
    const vehicle = await this.findByPlate(plate);
    const maintenances = await this.maintenanceRepository.find({
      where: { vehicleId: vehicle.id },
      relations: { mechanic: true, workshop: true },
      order: { scheduledAt: 'DESC' },
    });

    return {
      vehicle: {
        id: vehicle.id,
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        available: vehicle.status === VehicleStatusEnum.AVAILABLE,
      },
      maintenances: maintenances.map((maintenance) => ({
        id: maintenance.id,
        type: maintenance.type,
        status: maintenance.status,
        description: maintenance.description,
        mileage: maintenance.mileage,
        finishedAt: maintenance.finishedAt ? maintenance.finishedAt.toISOString() : null,
        mechanic: { id: maintenance.mechanic.id, name: maintenance.mechanic.name },
        workshop: { id: maintenance.workshop.id, name: maintenance.workshop.name },
      })),
    };
  }
}
