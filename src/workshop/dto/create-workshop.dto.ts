import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateWorkshopDto {
  @ApiProperty({ description: 'The name of the workshop', example: 'Taller Norte' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'The address of the workshop', example: 'Calle 10 # 20-30' })
  @IsString()
  @IsNotEmpty()
  address: string;
}
