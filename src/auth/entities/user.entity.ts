import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';
import { RoleEnum } from '../enum/role.enum.js';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
    default: null,
  })
  email: string;

  @Column()
  firstname: string;

  @Column()
  lastname: string;

  @Column()
  password: string;

  @ApiProperty({
    description: 'Choose between Admin and Technician',
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

  @Column({ default: true })
  isActive: boolean;
}
