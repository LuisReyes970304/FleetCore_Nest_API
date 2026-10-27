import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMechanicDto {
  @ApiProperty({ description: 'The name of the mechanic', example: 'Carlos Pérez' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'The email of the mechanic', example: 'carlos.perez@fleetcore.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'The specialty of the mechanic', example: 'Engine diagnostics' })
  @IsString()
  @IsNotEmpty()
  specialty: string;

  @ApiProperty({
    description: 'Id of the user account to link this mechanic to (optional)',
    required: false,
    example: 2,
  })
  @IsOptional()
  @IsInt()
  userId?: number;
}
