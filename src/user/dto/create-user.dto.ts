import { ApiProperty } from "@nestjs/swagger";
import { RoleEnum } from "../enum/roleEnum.js";
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({description: 'The email of the user', example: 'luisreyes@gmail.com'})
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({description: 'The first name of the user', example: 'Luis'})
  @IsString()
  @IsNotEmpty()
  firstname: string;

  @ApiProperty({description: 'The last name of the user', example: 'Reyes'})
  @IsString()
  @IsNotEmpty()
  lastname: string;

  @ApiProperty({description: 'The password of the user', example: 'password123'})
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: "Choose between Admin and Technician", enum: RoleEnum, default: RoleEnum.ADMIN, isArray: true })
  roles: RoleEnum[] = [];

  @ApiProperty({ description: "Indicates if the user is active", required: false, default: true })
  isActive: boolean = true;    
}
