import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateWorkshopDto } from './dto/create-workshop.dto.js';
import { UpdateWorkshopDto } from './dto/update-workshop.dto.js';
import { Workshop } from './entities/workshop.entity.js';
import { WorkshopStatusEnum } from './enum/workshop-status.enum.js';

@Injectable()
export class WorkshopService {
  constructor(
    @InjectRepository(Workshop)
    private readonly workshopRepository: Repository<Workshop>,
  ) {}

  create(createWorkshopDto: CreateWorkshopDto) {
    const workshop = this.workshopRepository.create(createWorkshopDto);
    workshop.status = WorkshopStatusEnum.ACTIVE;
    return this.workshopRepository.save(workshop);
  }

  // "list active workshops" per spec — admins see inactive ones via findOne instead.
  findActive() {
    return this.workshopRepository.find({ where: { status: WorkshopStatusEnum.ACTIVE } });
  }

  async findOne(id: number) {
    const workshop = await this.workshopRepository.findOneBy({ id });
    if (!workshop) {
      throw new NotFoundException(`Workshop #${id} not found`);
    }
    return workshop;
  }

  async update(id: number, updateWorkshopDto: UpdateWorkshopDto) {
    await this.findOne(id);
    await this.workshopRepository.update(id, updateWorkshopDto);
    return this.findOne(id);
  }

  async setStatus(id: number, status: WorkshopStatusEnum) {
    await this.findOne(id);
    await this.workshopRepository.update(id, { status });
    return this.findOne(id);
  }

  // Consumed by MaintenanceService when assigning a workshop to a new maintenance.
  async assertActiveAndExists(id: number): Promise<Workshop> {
    const workshop = await this.findOne(id);
    if (workshop.status !== WorkshopStatusEnum.ACTIVE) {
      throw new ConflictException(`Workshop #${id} is inactive`);
    }
    return workshop;
  }
}
