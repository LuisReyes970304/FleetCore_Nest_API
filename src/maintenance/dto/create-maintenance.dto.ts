import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { MaintenanceTypeEnum } from '../enum/maintenance-type.enum.js';

// status is deliberately not a field here — it is always forced to SCHEDULED by the service.
// Letting a client set the initial status would bypass every business-rule check below it.
export class CreateMaintenanceDto {
  @ApiProperty({ description: 'Id of the vehicle', example: 1 })
  @IsInt()
  vehicleId: number;

  @ApiProperty({ description: 'Id of the mechanic', example: 2 })
  @IsInt()
  mechanicId: number;

  @ApiProperty({ description: 'Id of the workshop', example: 1 })
  @IsInt()
  workshopId: number;

  @ApiProperty({ enum: MaintenanceTypeEnum, example: MaintenanceTypeEnum.PREVENTIVE })
  @IsEnum(MaintenanceTypeEnum)
  type: MaintenanceTypeEnum;

  @ApiProperty({
    description: 'Description of the work to be done',
    example: 'Cambio de aceite y filtros',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Vehicle mileage at scheduling time (km)', example: 45000 })
  @IsInt()
  @Min(0)
  mileage: number;

  @ApiProperty({ description: 'Scheduled start date/time', example: '2026-10-28T07:30:00.000Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({
    description: 'Scheduled end date/time (defaults to a fixed duration after scheduledAt if omitted)',
    required: false,
    example: '2026-10-28T09:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledEndAt?: string;
}
