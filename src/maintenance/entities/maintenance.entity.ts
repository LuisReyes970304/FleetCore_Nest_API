import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index, type Relation } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { MaintenanceTypeEnum } from '../enum/maintenance-type.enum.js';
import { MaintenanceStatusEnum } from '../enum/maintenance-status.enum.js';
import { Vehicle } from '../../vehicle/entities/vehicle.entity.js';
import { Mechanic } from '../../mechanic/entities/mechanic.entity.js';
import { Workshop } from '../../workshop/entities/workshop.entity.js';

@Entity()
export class Maintenance {
  @ApiProperty({ description: 'Unique identifier of the maintenance', example: 10 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'PREVENTIVE (routine/scheduled) or CORRECTIVE (repair of an existing issue)',
    enum: MaintenanceTypeEnum,
    example: MaintenanceTypeEnum.PREVENTIVE,
  })
  @Column({ type: 'enum', enum: MaintenanceTypeEnum })
  type: MaintenanceTypeEnum;

  @ApiProperty({ description: 'Description of the work to be done', example: 'Cambio de aceite y filtros' })
  @Column()
  description: string;

  // Odometer reading at scheduling time — must be >= vehicle.mileage.
  @ApiProperty({ description: "Vehicle's odometer reading (km) at scheduling time", example: 45000 })
  @Column({ type: 'int' })
  mileage: number;

  @ApiProperty({ description: 'Scheduled start date/time', example: '2026-10-28T07:30:00.000Z' })
  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

  // Window end, used to detect overlapping bookings for the same mechanic. Not in the spec's
  // literal minimum field list — added so the mechanic double-booking rule is computable at all.
  @ApiProperty({
    description:
      'Scheduled end date/time. Defaults to 90 minutes after scheduledAt when the client omits ' +
      'it; used to detect overlapping bookings for the same mechanic.',
    example: '2026-10-28T09:00:00.000Z',
  })
  @Column({ type: 'timestamptz' })
  scheduledEndAt: Date;

  @ApiProperty({
    description:
      'SCHEDULED -> IN_PROGRESS -> COMPLETED, or -> CANCELLED from either of the first two. ' +
      'COMPLETED and CANCELLED are terminal.',
    enum: MaintenanceStatusEnum,
    example: MaintenanceStatusEnum.SCHEDULED,
  })
  @Column({
    type: 'enum',
    enum: MaintenanceStatusEnum,
    default: MaintenanceStatusEnum.SCHEDULED,
  })
  @Index()
  status: MaintenanceStatusEnum;

  // Completion fields — only ever populated by the COMPLETED transition.
  @ApiProperty({
    description: 'Work actually performed. Set only when the maintenance is completed.',
    example: 'Reemplazo de pastillas de freno',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  workPerformed: string | null;

  @ApiProperty({
    description: 'Final cost of the maintenance. Set only when completed.',
    example: '400000.00',
    nullable: true,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  finalCost: string | null;

  @ApiProperty({
    description: 'Date/time the maintenance was completed. Set only when completed.',
    example: '2026-10-28T14:00:00.000Z',
    nullable: true,
  })
  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @ApiProperty({
    description:
      "Vehicle's odometer reading (km) at completion time; synced onto vehicle.mileage. Set only when completed.",
    example: 45620,
    nullable: true,
  })
  @Column({ type: 'int', nullable: true })
  finalMileage: number | null;

  // Relation<T> (type-only) instead of a direct class reference: with emitDecoratorMetadata,
  // TS would otherwise bake a non-lazy "design:type" reference to the related class, which
  // crashes at module-load time in this ESM circular-import cycle (Maintenance <-> Vehicle/
  // Mechanic/Workshop). The @ManyToOne thunk stays lazy; this just keeps the *type annotation*
  // from doing the same thing implicitly. @ApiProperty also uses a lazy `() => Vehicle` thunk
  // for the same reason, and is accurate here: every query method eagerly loads this relation.
  // The thunk itself only runs when Swagger actually builds the OpenAPI document — see
  // maintenance.entity.spec.ts, which builds a real document to exercise it.
  @ApiProperty({ description: 'The vehicle this maintenance is for', type: () => Vehicle })
  @ManyToOne(() => Vehicle, (vehicle) => vehicle.maintenances, { nullable: false })
  @JoinColumn({ name: 'vehicleId' })
  @Index()
  vehicle: Relation<Vehicle>;

  @ApiProperty({ description: 'Id of the vehicle this maintenance is for', example: 1 })
  @Column()
  vehicleId: number;

  @ApiProperty({ description: 'The mechanic assigned to this maintenance', type: () => Mechanic })
  @ManyToOne(() => Mechanic, (mechanic) => mechanic.maintenances, { nullable: false })
  @JoinColumn({ name: 'mechanicId' })
  @Index()
  mechanic: Relation<Mechanic>;

  @ApiProperty({ description: 'Id of the mechanic assigned to this maintenance', example: 2 })
  @Column()
  mechanicId: number;

  @ApiProperty({ description: 'The workshop where this maintenance takes place', type: () => Workshop })
  @ManyToOne(() => Workshop, (workshop) => workshop.maintenances, { nullable: false })
  @JoinColumn({ name: 'workshopId' })
  @Index()
  workshop: Relation<Workshop>;

  @ApiProperty({ description: 'Id of the workshop where this maintenance takes place', example: 1 })
  @Column()
  workshopId: number;
}
