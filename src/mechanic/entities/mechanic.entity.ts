import { Entity, Column, PrimaryGeneratedColumn, OneToMany, OneToOne, JoinColumn, Index, type Relation } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { MechanicStatusEnum } from '../enum/mechanic-status.enum.js';
import { User } from '../../auth/entities/user.entity.js';
import { Maintenance } from '../../maintenance/entities/maintenance.entity.js';

@Entity()
export class Mechanic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  specialty: string;

  @ApiProperty({ enum: MechanicStatusEnum, example: MechanicStatusEnum.ACTIVE })
  @Column({
    type: 'enum',
    enum: MechanicStatusEnum,
    default: MechanicStatusEnum.ACTIVE,
  })
  @Index()
  status: MechanicStatusEnum;

  // Optional link to a login account: lets a logged-in TECHNICIAN see "their" maintenances.
  // Nullable + unique: a mechanic doesn't need a login, and a user maps to at most one mechanic.
  @Column({ nullable: true, unique: true })
  userId: number | null;

  @OneToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  // Relation<T> avoids a non-lazy "design:type" class reference that would crash at module-load
  // time in this ESM circular-import cycle with Maintenance (see maintenance.entity.ts).
  @OneToMany(() => Maintenance, (maintenance) => maintenance.mechanic)
  maintenances: Relation<Maintenance[]>;
}
