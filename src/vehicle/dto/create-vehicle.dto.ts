import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ description: 'The license plate of the vehicle', example: 'ABC123' })
  @IsString()
  @IsNotEmpty()
  plate: string;

  @ApiProperty({ description: 'The brand of the vehicle', example: 'Chevrolet' })
  @IsString()
  @IsNotEmpty()
  brand: string;

  @ApiProperty({ description: 'The model of the vehicle', example: 'NPR' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ description: 'The manufacturing year of the vehicle', example: 2020 })
  @IsInt()
  @Min(1900)
  year: number;

  @ApiProperty({ description: 'The current mileage of the vehicle (km)', example: 45000 })
  @IsInt()
  @Min(0)
  mileage: number;
}
