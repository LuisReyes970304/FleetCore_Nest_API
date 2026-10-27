import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service.js';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto.js';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto.js';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto.js';
import { Roles, RoleEnum } from '../auth/enum/role.enum.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../common/types/request-user.type.js';

@ApiTags('Maintenance')
@ApiBearerAuth()
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @Roles([RoleEnum.ADMIN])
  create(@Body() createMaintenanceDto: CreateMaintenanceDto) {
    return this.maintenanceService.create(createMaintenanceDto);
  }

  @Get()
  @Roles([RoleEnum.ADMIN])
  findAll() {
    return this.maintenanceService.findAll();
  }

  @Get('active')
  @Roles([RoleEnum.ADMIN])
  findActive() {
    return this.maintenanceService.findActive();
  }

  // Technician's own assigned maintenances, no id param (avoids a technician enumerating other
  // mechanics' ids). Declared before ':id' so the static 'mine' segment isn't swallowed by it.
  @Get('mine')
  @Roles([RoleEnum.TECHNICIAN])
  findMine(@CurrentUser() currentUser: RequestUser) {
    return this.maintenanceService.findMine(currentUser);
  }

  @Get('vehicle/:vehicleId')
  @Roles([RoleEnum.ADMIN])
  findByVehicle(@Param('vehicleId', ParseIntPipe) vehicleId: number) {
    return this.maintenanceService.findByVehicle(vehicleId);
  }

  @Get('mechanic/:mechanicId')
  @Roles([RoleEnum.ADMIN])
  findByMechanic(@Param('mechanicId', ParseIntPipe) mechanicId: number) {
    return this.maintenanceService.findByMechanic(mechanicId);
  }

  @Get(':id')
  @Roles([RoleEnum.ADMIN])
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.maintenanceService.findOne(id);
  }

  @Patch(':id')
  @Roles([RoleEnum.ADMIN])
  update(@Param('id', ParseIntPipe) id: number, @Body() updateMaintenanceDto: UpdateMaintenanceDto) {
    return this.maintenanceService.update(id, updateMaintenanceDto);
  }

  // No @Roles() here on purpose: both ADMIN and TECHNICIAN may call this, with per-resource
  // ownership enforced inside MaintenanceService (a TECHNICIAN may only update their own).
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMaintenanceStatusDto: UpdateMaintenanceStatusDto,
    @CurrentUser() currentUser: RequestUser,
  ) {
    return this.maintenanceService.updateStatus(id, updateMaintenanceStatusDto, currentUser);
  }
}
