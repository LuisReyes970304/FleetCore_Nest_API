import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index, type Relation } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { MaintenanceTypeEnum } from '../enum/maintenance-type.enum.js';
import { MaintenanceStatusEnum } from '../enum/maintenance-status.enum.js';
import { Vehicle } from '../../vehicle/entities/vehicle.entity.js';
import { Mechanic } from '../../mechanic/entities/mechanic.entity.js';
import { Workshop } from '../../workshop/entities/workshop.entity.js';

@Entity()
export class Maintenance {
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ enum: MaintenanceTypeEnum, example: MaintenanceTypeEnum.PREVENTIVE })
  @Column({ type: 'enum', enum: MaintenanceTypeEnum })
  type: MaintenanceTypeEnum;

  @Column()
  description: string;

  // Odometer reading at scheduling time — must be >= vehicle.mileage.
  @Column({ type: 'int' })
  mileage: number;

  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

  // Window end, used to detect overlapping bookings for the same mechanic. Not in the spec's
  // literal minimum field list — added so the mechanic double-booking rule is computable at all
  // (see docs/plan.md).
  @Column({ type: 'timestamptz' })
  scheduledEndAt: Date;

  @ApiProperty({ enum: MaintenanceStatusEnum, example: MaintenanceStatusEnum.SCHEDULED })
  @Column({
    type: 'enum',
    enum: MaintenanceStatusEnum,
    default: MaintenanceStatusEnum.SCHEDULED,
  })
  @Index()
  status: MaintenanceStatusEnum;

  // Completion fields — only ever populated by the COMPLETED transition.
  @Column({ type: 'text', nullable: true })
  workPerformed: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  finalCost: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  finalMileage: number | null;

  // Relation<T> (type-only) instead of a direct class reference: with emitDecoratorMetadata,
  // TS would otherwise bake a non-lazy "design:type" reference to the related class, which
  // crashes at module-load time in this ESM circular-import cycle (Maintenance <-> Vehicle/
  // Mechanic/Workshop). The @ManyToOne thunk stays lazy; this just keeps the *type annotation*
  // from doing the same thing implicitly.
  @ManyToOne(() => Vehicle, (vehicle) => vehicle.maintenances, { nullable: false })
  @JoinColumn({ name: 'vehicleId' })
  @Index()
  vehicle: Relation<Vehicle>;

  @Column()
  vehicleId: number;

  @ManyToOne(() => Mechanic, (mechanic) => mechanic.maintenances, { nullable: false })
  @JoinColumn({ name: 'mechanicId' })
  @Index()
  mechanic: Relation<Mechanic>;

  @Column()
  mechanicId: number;

  @ManyToOne(() => Workshop, (workshop) => workshop.maintenances, { nullable: false })
  @JoinColumn({ name: 'workshopId' })
  @Index()
  workshop: Relation<Workshop>;

  @Column()
  workshopId: number;
}
