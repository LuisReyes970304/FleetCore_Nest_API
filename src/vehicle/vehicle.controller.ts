import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { VehicleService } from './vehicle.service.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { Roles, RoleEnum } from '../auth/enum/role.enum.js';
import { VehicleStatusEnum } from './enum/vehicle-status.enum.js';
import { Public } from '../common/decorators/public.decorator.js';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';

@ApiTags('Vehicle')
@ApiBearerAuth()
@Controller('vehicle')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post()
  @Roles([RoleEnum.ADMIN])
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehicleService.create(createVehicleDto);
  }

  @Get()
  findAll() {
    return this.vehicleService.findAll();
  }

  // External-integration endpoint: authenticates via x-api-key instead of JWT. Declared before
  // ':id' so this static path segment isn't swallowed by the ':id' route.
  @Public()
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('x-api-key')
  @Get('external/:plate')
  getExternalProfile(@Param('plate') plate: string) {
    return this.vehicleService.getExternalProfile(plate);
  }

  @Get('plate/:plate')
  findByPlate(@Param('plate') plate: string) {
    return this.vehicleService.findByPlate(plate);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehicleService.findOne(id);
  }

  @Patch(':id')
  @Roles([RoleEnum.ADMIN])
  update(@Param('id', ParseIntPipe) id: number, @Body() updateVehicleDto: UpdateVehicleDto) {
    return this.vehicleService.update(id, updateVehicleDto);
  }

  @Patch(':id/deactivate')
  @Roles([RoleEnum.ADMIN])
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.vehicleService.setStatus(id, VehicleStatusEnum.INACTIVE);
  }

  @Patch(':id/reactivate')
  @Roles([RoleEnum.ADMIN])
  reactivate(@Param('id', ParseIntPipe) id: number) {
    return this.vehicleService.setStatus(id, VehicleStatusEnum.AVAILABLE);
  }
}
