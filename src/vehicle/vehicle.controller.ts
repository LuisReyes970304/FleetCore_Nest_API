import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { VehicleService } from './vehicle.service.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { ExternalVehicleResponseDto } from './dto/external-vehicle-response.dto.js';
import { Vehicle } from './entities/vehicle.entity.js';
import { Roles, RoleEnum } from '../auth/enum/role.enum.js';
import { VehicleStatusEnum } from './enum/vehicle-status.enum.js';
import { Public } from '../common/decorators/public.decorator.js';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';

@ApiTags('Vehicle')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
@Controller('vehicle')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post()
  @Roles([RoleEnum.ADMIN])
  @ApiOperation({ summary: 'Create a vehicle', description: 'ADMIN only. The plate must be unique.' })
  @ApiCreatedResponse({ description: 'Vehicle created with status AVAILABLE.', type: Vehicle })
  @ApiBadRequestResponse({ description: 'Validation failed (missing/invalid field).' })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN.' })
  @ApiConflictResponse({ description: 'A vehicle with this plate already exists.' })
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehicleService.create(createVehicleDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all vehicles', description: 'Any authenticated user.' })
  @ApiOkResponse({ description: 'All vehicles, regardless of status.', type: [Vehicle] })
  findAll() {
    return this.vehicleService.findAll();
  }

  // External-integration endpoint: authenticates via x-api-key instead of JWT. Declared before
  // ':id' so this static path segment isn't swallowed by the ':id' route.
  @Public()
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('x-api-key')
  @Get('external/:plate')
  @ApiOperation({
    summary: 'External partner lookup by plate',
    description:
      'For third-party integrations. Authenticates via the x-api-key header instead of a JWT ' +
      '(ignores roles entirely). Returns a smaller, nested view of the vehicle plus its full ' +
      'maintenance history (most recent first), not the raw entity.',
  })
  @ApiParam({ name: 'plate', description: 'The vehicle license plate', example: 'ABC123' })
  @ApiOkResponse({ type: ExternalVehicleResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid x-api-key header.' })
  @ApiNotFoundResponse({ description: 'No vehicle with this plate exists.' })
  getExternalProfile(@Param('plate') plate: string) {
    return this.vehicleService.getExternalProfile(plate);
  }

  @Get('plate/:plate')
  @ApiOperation({ summary: 'Get a vehicle by plate', description: 'Any authenticated user.' })
  @ApiParam({ name: 'plate', description: 'The vehicle license plate', example: 'ABC123' })
  @ApiOkResponse({ type: Vehicle })
  @ApiNotFoundResponse({ description: 'No vehicle with this plate exists.' })
  findByPlate(@Param('plate') plate: string) {
    return this.vehicleService.findByPlate(plate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a vehicle by id', description: 'Any authenticated user.' })
  @ApiParam({ name: 'id', description: 'Vehicle id', example: 1 })
  @ApiOkResponse({ type: Vehicle })
  @ApiNotFoundResponse({ description: 'No vehicle with this id exists.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehicleService.findOne(id);
  }

  @Patch(':id')
  @Roles([RoleEnum.ADMIN])
  @ApiOperation({ summary: 'Update a vehicle', description: 'ADMIN only. Partial update; all fields optional.' })
  @ApiParam({ name: 'id', description: 'Vehicle id', example: 1 })
  @ApiOkResponse({ type: Vehicle })
  @ApiBadRequestResponse({ description: 'Validation failed (missing/invalid field).' })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN.' })
  @ApiNotFoundResponse({ description: 'No vehicle with this id exists.' })
  @ApiConflictResponse({ description: 'The new plate is already used by another vehicle.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateVehicleDto: UpdateVehicleDto) {
    return this.vehicleService.update(id, updateVehicleDto);
  }

  @Patch(':id/deactivate')
  @Roles([RoleEnum.ADMIN])
  @ApiOperation({
    summary: 'Deactivate a vehicle (soft delete)',
    description: 'ADMIN only. Flips status to INACTIVE; the vehicle and its history are kept, never hard-deleted.',
  })
  @ApiParam({ name: 'id', description: 'Vehicle id', example: 1 })
  @ApiOkResponse({ type: Vehicle })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN.' })
  @ApiNotFoundResponse({ description: 'No vehicle with this id exists.' })
  @ApiConflictResponse({ description: 'The vehicle is currently IN_MAINTENANCE and cannot change status.' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.vehicleService.setStatus(id, VehicleStatusEnum.INACTIVE);
  }

  @Patch(':id/reactivate')
  @Roles([RoleEnum.ADMIN])
  @ApiOperation({ summary: 'Reactivate a vehicle', description: 'ADMIN only. Flips status back to AVAILABLE.' })
  @ApiParam({ name: 'id', description: 'Vehicle id', example: 1 })
  @ApiOkResponse({ type: Vehicle })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN.' })
  @ApiNotFoundResponse({ description: 'No vehicle with this id exists.' })
  @ApiConflictResponse({ description: 'The vehicle is currently IN_MAINTENANCE and cannot change status.' })
  reactivate(@Param('id', ParseIntPipe) id: number) {
    return this.vehicleService.setStatus(id, VehicleStatusEnum.AVAILABLE);
  }
}
