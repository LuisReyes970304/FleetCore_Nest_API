import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';
import { RoleEnum } from '../enum/role.enum.js';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

// Never returned directly by any controller — AuthService.buildAuthResponse() always builds a
// hand-picked response shape instead, so password can never leak through the response
// envelope. @ApiHideProperty() on it is still worth keeping: it documents the field as
// sensitive and keeps it out of the schema if this entity is ever reused as a response type.
@Entity()
export class User {
  @ApiProperty({ description: 'Unique identifier of the user', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'The email of the user (unique)', example: 'luisreyes@gmail.com' })
  @Column({
    unique: true,
    default: null,
  })
  email: string;

  @ApiProperty({ description: 'The first name of the user', example: 'Luis' })
  @Column()
  firstname: string;

  @ApiProperty({ description: 'The last name of the user', example: 'Reyes' })
  @Column()
  lastname: string;

  @ApiHideProperty()
  @Column()
  password: string;

  @ApiProperty({
    description: 'ADMIN (manages the fleet) or TECHNICIAN (works their own assigned maintenances)',
    enum: RoleEnum,
    example: RoleEnum.ADMIN,
  })
  @Column({
    type: 'enum',
    enum: RoleEnum,
    default: RoleEnum.ADMIN,
  })
  @Index()
  role: RoleEnum;

  @ApiProperty({
    description: 'Whether the account is active. A deactivated user can no longer log in.',
    example: true,
  })
  @Column({ default: true })
  isActive: boolean;
}
