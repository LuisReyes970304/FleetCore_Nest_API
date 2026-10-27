import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MechanicService } from './mechanic.service.js';
import { CreateMechanicDto } from './dto/create-mechanic.dto.js';
import { UpdateMechanicDto } from './dto/update-mechanic.dto.js';
import { Roles, RoleEnum } from '../auth/enum/role.enum.js';
import { MechanicStatusEnum } from './enum/mechanic-status.enum.js';

@ApiTags('Mechanic')
@ApiBearerAuth()
@Controller('mechanic')
export class MechanicController {
  constructor(private readonly mechanicService: MechanicService) {}

  @Post()
  @Roles([RoleEnum.ADMIN])
  create(@Body() createMechanicDto: CreateMechanicDto) {
    return this.mechanicService.create(createMechanicDto);
  }

  @Get()
  findAll() {
    return this.mechanicService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.mechanicService.findOne(id);
  }

  @Patch(':id')
  @Roles([RoleEnum.ADMIN])
  update(@Param('id', ParseIntPipe) id: number, @Body() updateMechanicDto: UpdateMechanicDto) {
    return this.mechanicService.update(id, updateMechanicDto);
  }

  @Patch(':id/activate')
  @Roles([RoleEnum.ADMIN])
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.mechanicService.setStatus(id, MechanicStatusEnum.ACTIVE);
  }

  @Patch(':id/deactivate')
  @Roles([RoleEnum.ADMIN])
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.mechanicService.setStatus(id, MechanicStatusEnum.INACTIVE);
  }
}
