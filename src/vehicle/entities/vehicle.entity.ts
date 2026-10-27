import { Entity, Column, PrimaryGeneratedColumn, OneToMany, Index, type Relation } from 'typeorm';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { VehicleStatusEnum } from '../enum/vehicle-status.enum.js';
import { Maintenance } from '../../maintenance/entities/maintenance.entity.js';

@Entity()
export class Vehicle {
  @ApiProperty({ description: 'Unique identifier of the vehicle', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'The license plate of the vehicle (unique)', example: 'ABC123' })
  @Column({ unique: true })
  @Index()
  plate: string;

  @ApiProperty({ description: 'The brand of the vehicle', example: 'Chevrolet' })
  @Column()
  brand: string;

  @ApiProperty({ description: 'The model of the vehicle', example: 'NPR' })
  @Column()
  model: string;

  @ApiProperty({ description: 'The manufacturing year of the vehicle', example: 2020 })
  @Column({ type: 'int' })
  year: number;

  @ApiProperty({
    description:
      'Current odometer reading (km). Kept in sync with the latest COMPLETED maintenance.',
    example: 45000,
  })
  @Column({ type: 'int' })
  mileage: number;

  // status === INACTIVE is the soft-delete marker for this entity — no separate isActive flag,
  // since the status enum already encodes "usable or not" (see the CLAUDE.md module layout notes).
  @ApiProperty({
    description:
      'AVAILABLE (ready for use), IN_MAINTENANCE (set automatically while a maintenance is ' +
      'IN_PROGRESS), or INACTIVE (soft-deleted via PATCH /vehicle/:id/deactivate).',
    enum: VehicleStatusEnum,
    example: VehicleStatusEnum.AVAILABLE,
  })
  @Column({
    type: 'enum',
    enum: VehicleStatusEnum,
    default: VehicleStatusEnum.AVAILABLE,
  })
  @Index()
  status: VehicleStatusEnum;

  // Relation<T> avoids a non-lazy "design:type" class reference that would crash at module-load
  // time in this ESM circular-import cycle with Maintenance (see maintenance.entity.ts). Hidden
  // from Swagger: VehicleService never loads this relation, so it never appears in a response.
  @ApiHideProperty()
  @OneToMany(() => Maintenance, (maintenance) => maintenance.vehicle)
  maintenances: Relation<Maintenance[]>;
}
