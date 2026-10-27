import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { MaintenanceStatusEnum } from '../enum/maintenance-status.enum.js';

export class UpdateMaintenanceStatusDto {
  @ApiProperty({ enum: MaintenanceStatusEnum, example: MaintenanceStatusEnum.IN_PROGRESS })
  @IsEnum(MaintenanceStatusEnum)
  status: MaintenanceStatusEnum;

  // The four fields below are required together, but only when completing the maintenance —
  // enforced via @ValidateIf instead of plain @IsNotEmpty since the requirement is conditional
  // on the `status` field, which class-validator alone can't express declaratively.
  @ApiProperty({
    description: 'Work performed (required when status is COMPLETED)',
    required: false,
    example: 'Reemplazo de pastillas de freno',
  })
  @ValidateIf((dto: UpdateMaintenanceStatusDto) => dto.status === MaintenanceStatusEnum.COMPLETED)
  @IsString()
  @IsNotEmpty()
  workPerformed?: string;

  @ApiProperty({
    description: 'Final cost (required when status is COMPLETED)',
    required: false,
    example: 400000,
  })
  @ValidateIf((dto: UpdateMaintenanceStatusDto) => dto.status === MaintenanceStatusEnum.COMPLETED)
  @IsNumber()
  @Min(0)
  finalCost?: number;

  @ApiProperty({
    description: 'Final mileage (required when status is COMPLETED)',
    required: false,
    example: 52300,
  })
  @ValidateIf((dto: UpdateMaintenanceStatusDto) => dto.status === MaintenanceStatusEnum.COMPLETED)
  @IsNumber()
  @Min(0)
  finalMileage?: number;

  @ApiProperty({
    description: 'Completion date/time (defaults to now if omitted)',
    required: false,
    example: '2026-10-14T09:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  finishedAt?: string;
}
