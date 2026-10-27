import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WorkshopService } from './workshop.service.js';
import { CreateWorkshopDto } from './dto/create-workshop.dto.js';
import { UpdateWorkshopDto } from './dto/update-workshop.dto.js';
import { Roles, RoleEnum } from '../user/enum/roleEnum.js';
import { WorkshopStatusEnum } from './enum/workshop-status.enum.js';

@ApiTags('Workshop')
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
  findOne(@Param('id') id: string) {
    return this.workshopService.findOne(+id);
  }

  @Patch(':id')
  @Roles([RoleEnum.ADMIN])
  update(@Param('id') id: string, @Body() updateWorkshopDto: UpdateWorkshopDto) {
    return this.workshopService.update(+id, updateWorkshopDto);
  }

  @Patch(':id/activate')
  @Roles([RoleEnum.ADMIN])
  activate(@Param('id') id: string) {
    return this.workshopService.setStatus(+id, WorkshopStatusEnum.ACTIVE);
  }

  @Patch(':id/deactivate')
  @Roles([RoleEnum.ADMIN])
  deactivate(@Param('id') id: string) {
    return this.workshopService.setStatus(+id, WorkshopStatusEnum.INACTIVE);
  }
}
