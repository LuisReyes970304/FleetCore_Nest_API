import { Entity, Column, PrimaryGeneratedColumn, OneToMany, Index, type Relation } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { VehicleStatusEnum } from '../enum/vehicle-status.enum.js';
import { Maintenance } from '../../maintenance/entities/maintenance.entity.js';

@Entity()
export class Vehicle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Index()
  plate: string;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int' })
  mileage: number;

  // status === INACTIVE is the soft-delete marker for this entity — no separate isActive flag,
  // since the status enum already encodes "usable or not" (see docs/plan.md).
  @ApiProperty({ enum: VehicleStatusEnum, example: VehicleStatusEnum.AVAILABLE })
  @Column({
    type: 'enum',
    enum: VehicleStatusEnum,
    default: VehicleStatusEnum.AVAILABLE,
  })
  @Index()
  status: VehicleStatusEnum;

  // Relation<T> avoids a non-lazy "design:type" class reference that would crash at module-load
  // time in this ESM circular-import cycle with Maintenance (see maintenance.entity.ts).
  @OneToMany(() => Maintenance, (maintenance) => maintenance.vehicle)
  maintenances: Relation<Maintenance[]>;
}
