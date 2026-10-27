import { Entity, Column, PrimaryGeneratedColumn, OneToMany, OneToOne, JoinColumn, Index, type Relation } from 'typeorm';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { MechanicStatusEnum } from '../enum/mechanic-status.enum.js';
import { User } from '../../auth/entities/user.entity.js';
import { Maintenance } from '../../maintenance/entities/maintenance.entity.js';

@Entity()
export class Mechanic {
  @ApiProperty({ description: 'Unique identifier of the mechanic', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'The name of the mechanic', example: 'Carlos Pérez' })
  @Column()
  name: string;

  @ApiProperty({
    description: 'The email of the mechanic (unique)',
    example: 'carlos.perez@fleetcore.com',
  })
  @Column({ unique: true })
  @Index()
  email: string;

  @ApiProperty({ description: 'The specialty of the mechanic', example: 'Engine diagnostics' })
  @Column()
  specialty: string;

  @ApiProperty({
    description:
      'ACTIVE (can be assigned new maintenances) or INACTIVE (soft-deactivated via ' +
      'PATCH /mechanic/:id/deactivate, history is kept).',
    enum: MechanicStatusEnum,
    example: MechanicStatusEnum.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: MechanicStatusEnum,
    default: MechanicStatusEnum.ACTIVE,
  })
  @Index()
  status: MechanicStatusEnum;

  // Optional link to a login account: lets a logged-in TECHNICIAN see "their" maintenances.
  // Nullable + unique: a mechanic doesn't need a login, and a user maps to at most one mechanic.
  @ApiProperty({
    description: 'Id of the User account linked to this mechanic, if any (lets a TECHNICIAN see their own maintenances)',
    example: 2,
    nullable: true,
  })
  @Column({ nullable: true, unique: true })
  userId: number | null;

  // Hidden from Swagger: MechanicService never loads this relation, so it never appears in a
  // response — userId is the documented way to see which account (if any) is linked.
  @ApiHideProperty()
  @OneToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  // Relation<T> avoids a non-lazy "design:type" class reference that would crash at module-load
  // time in this ESM circular-import cycle with Maintenance (see maintenance.entity.ts). Hidden
  // from Swagger: MechanicService never loads this relation either.
  @ApiHideProperty()
  @OneToMany(() => Maintenance, (maintenance) => maintenance.mechanic)
  maintenances: Relation<Maintenance[]>;
}
