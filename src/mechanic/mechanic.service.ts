import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from '../auth/user.service.js';
import { CreateMechanicDto } from './dto/create-mechanic.dto.js';
import { UpdateMechanicDto } from './dto/update-mechanic.dto.js';
import { Mechanic } from './entities/mechanic.entity.js';
import { MechanicStatusEnum } from './enum/mechanic-status.enum.js';

@Injectable()
export class MechanicService {
  constructor(
    @InjectRepository(Mechanic)
    private readonly mechanicRepository: Repository<Mechanic>,
    private readonly userService: UserService,
  ) {}

  async create(createMechanicDto: CreateMechanicDto) {
    const existingEmail = await this.mechanicRepository.findOneBy({
      email: createMechanicDto.email,
    });
    if (existingEmail) {
      throw new ConflictException('A mechanic with this email already exists');
    }
    if (createMechanicDto.userId) {
      await this.assertUserLinkable(createMechanicDto.userId);
    }
    const mechanic = this.mechanicRepository.create(createMechanicDto);
    mechanic.userId = createMechanicDto.userId ?? null;
    mechanic.status = MechanicStatusEnum.ACTIVE;
    return this.mechanicRepository.save(mechanic);
  }

  findAll() {
    return this.mechanicRepository.find();
  }

  async findOne(id: number) {
    const mechanic = await this.mechanicRepository.findOneBy({ id });
    if (!mechanic) {
      throw new NotFoundException(`Mechanic #${id} not found`);
    }
    return mechanic;
  }

  // Resolves "my maintenances" for a logged-in TECHNICIAN from their user id.
  async findByUserId(userId: number) {
    const mechanic = await this.mechanicRepository.findOneBy({ userId });
    if (!mechanic) {
      throw new NotFoundException('No mechanic profile is linked to the current user');
    }
    return mechanic;
  }

  async update(id: number, updateMechanicDto: UpdateMechanicDto) {
    await this.findOne(id);
    if (updateMechanicDto.userId) {
      await this.assertUserLinkable(updateMechanicDto.userId, id);
    }
    await this.mechanicRepository.update(id, updateMechanicDto);
    return this.findOne(id);
  }

  async setStatus(id: number, status: MechanicStatusEnum) {
    await this.findOne(id);
    await this.mechanicRepository.update(id, { status });
    return this.findOne(id);
  }

  // Consumed by MaintenanceService when assigning a mechanic to a new maintenance.
  async assertActiveAndExists(id: number): Promise<Mechanic> {
    const mechanic = await this.findOne(id);
    if (mechanic.status !== MechanicStatusEnum.ACTIVE) {
      throw new ConflictException(`Mechanic #${id} is inactive`);
    }
    return mechanic;
  }

  private async assertUserLinkable(userId: number, excludeMechanicId?: number) {
    await this.userService.findOne(userId);
    const linked = await this.mechanicRepository.findOneBy({ userId });
    if (linked && linked.id !== excludeMechanicId) {
      throw new ConflictException(`User #${userId} is already linked to another mechanic`);
    }
  }
}
