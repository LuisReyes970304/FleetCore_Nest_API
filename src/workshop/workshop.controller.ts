import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkshopService } from './workshop.service.js';
import { CreateWorkshopDto } from './dto/create-workshop.dto.js';
import { UpdateWorkshopDto } from './dto/update-workshop.dto.js';
import { Roles, RoleEnum } from '../auth/enum/role.enum.js';
import { WorkshopStatusEnum } from './enum/workshop-status.enum.js';

@ApiTags('Workshop')
@ApiBearerAuth()
@Controller('workshop')
export class WorkshopController {
  constructor(private readonly workshopService: WorkshopService) {}

  @Post()
  @Roles([RoleEnum.ADMIN])
  create(@Body() createWorkshopDto: CreateWorkshopDto) {
    return this.workshopService.create(createWorkshopDto);
  }

  @Get()
  findActive() {
    return this.workshopService.findActive();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.workshopService.findOne(id);
  }

  @Patch(':id')
  @Roles([RoleEnum.ADMIN])
  update(@Param('id', ParseIntPipe) id: number, @Body() updateWorkshopDto: UpdateWorkshopDto) {
    return this.workshopService.update(id, updateWorkshopDto);
  }

  @Patch(':id/activate')
  @Roles([RoleEnum.ADMIN])
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.workshopService.setStatus(id, WorkshopStatusEnum.ACTIVE);
  }

  @Patch(':id/deactivate')
  @Roles([RoleEnum.ADMIN])
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.workshopService.setStatus(id, WorkshopStatusEnum.INACTIVE);
  }
}
