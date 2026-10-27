import { Entity, Column, PrimaryGeneratedColumn, OneToMany, Index, type Relation } from 'typeorm';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { WorkshopStatusEnum } from '../enum/workshop-status.enum.js';
import { Maintenance } from '../../maintenance/entities/maintenance.entity.js';

@Entity()
export class Workshop {
  @ApiProperty({ description: 'Unique identifier of the workshop', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'The name of the workshop', example: 'Taller Norte' })
  @Column()
  name: string;

  @ApiProperty({ description: 'The physical address of the workshop', example: 'Calle 10 # 20-30' })
  @Column()
  address: string;

  @ApiProperty({
    description:
      'ACTIVE (can be assigned new maintenances) or INACTIVE (soft-deactivated via ' +
      'PATCH /workshop/:id/deactivate, history is kept).',
    enum: WorkshopStatusEnum,
    example: WorkshopStatusEnum.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: WorkshopStatusEnum,
    default: WorkshopStatusEnum.ACTIVE,
  })
  @Index()
  status: WorkshopStatusEnum;

  // Relation<T> avoids a non-lazy "design:type" class reference that would crash at module-load
  // time in this ESM circular-import cycle with Maintenance (see maintenance.entity.ts). Hidden
  // from Swagger: WorkshopService never loads this relation, so it never appears in a response.
  @ApiHideProperty()
  @OneToMany(() => Maintenance, (maintenance) => maintenance.workshop)
  maintenances: Relation<Maintenance[]>;
}
