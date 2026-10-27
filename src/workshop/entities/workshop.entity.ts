import { Entity, Column, PrimaryGeneratedColumn, OneToMany, Index, type Relation } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { WorkshopStatusEnum } from '../enum/workshop-status.enum.js';
import { Maintenance } from '../../maintenance/entities/maintenance.entity.js';

@Entity()
export class Workshop {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  address: string;

  @ApiProperty({ enum: WorkshopStatusEnum, example: WorkshopStatusEnum.ACTIVE })
  @Column({
    type: 'enum',
    enum: WorkshopStatusEnum,
    default: WorkshopStatusEnum.ACTIVE,
  })
  @Index()
  status: WorkshopStatusEnum;

  // Relation<T> avoids a non-lazy "design:type" class reference that would crash at module-load
  // time in this ESM circular-import cycle with Maintenance (see maintenance.entity.ts).
  @OneToMany(() => Maintenance, (maintenance) => maintenance.workshop)
  maintenances: Relation<Maintenance[]>;
}
