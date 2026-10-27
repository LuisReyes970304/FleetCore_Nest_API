import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
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
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service.js';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto.js';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto.js';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto.js';
import { Maintenance } from './entities/maintenance.entity.js';
import { Roles, RoleEnum } from '../auth/enum/role.enum.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { RequestUser } from '../common/types/request-user.type.js';

@ApiTags('Maintenance')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @Roles([RoleEnum.ADMIN])
  @ApiOperation({
    summary: 'Schedule a maintenance',
    description:
      'ADMIN only. Initial status is always SCHEDULED; it cannot be set by the client. The ' +
      'vehicle, mechanic and workshop must exist and be active. Validates: mileage cannot be ' +
      'lower than the vehicle\'s current mileage; scheduledEndAt must be after scheduledAt (and ' +
      'defaults to 90 minutes after it if omitted); the vehicle must have no other ' +
      'SCHEDULED/IN_PROGRESS maintenance; and the mechanic\'s time window must not overlap any ' +
      'of their other active maintenances (back-to-back slots are allowed).',
  })
  @ApiCreatedResponse({ description: 'Maintenance scheduled.', type: Maintenance })
  @ApiBadRequestResponse({ description: 'Validation failed, or mileage/scheduledEndAt business-rule check failed.' })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN.' })
  @ApiNotFoundResponse({ description: 'The vehicle, mechanic or workshop id does not exist.' })
  @ApiConflictResponse({
    description:
      'The vehicle/mechanic/workshop is inactive, the vehicle already has an active ' +
      "maintenance, or the mechanic's schedule overlaps this time window.",
  })
  create(@Body() createMaintenanceDto: CreateMaintenanceDto) {
    return this.maintenanceService.create(createMaintenanceDto);
  }

  @Get()
  @Roles([RoleEnum.ADMIN])
  @ApiOperation({ summary: 'List all maintenances', description: 'ADMIN only. Every maintenance regardless of status, with vehicle/mechanic/workshop loaded.' })
  @ApiOkResponse({ type: [Maintenance] })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN.' })
  findAll() {
    return this.maintenanceService.findAll();
  }

  @Get('active')
  @Roles([RoleEnum.ADMIN])
  @ApiOperation({ summary: 'List active maintenances', description: 'ADMIN only. Only SCHEDULED or IN_PROGRESS maintenances.' })
  @ApiOkResponse({ type: [Maintenance] })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN.' })
  findActive() {
    return this.maintenanceService.findActive();
  }

  // Technician's own assigned maintenances, no id param (avoids a technician enumerating other
  // mechanics' ids). Declared before ':id' so the static 'mine' segment isn't swallowed by it.
  @Get('mine')
  @Roles([RoleEnum.TECHNICIAN])
  @ApiOperation({
    summary: "List the current technician's own maintenances",
    description: 'TECHNICIAN only. Resolved from the mechanic profile linked to the caller (Mechanic.userId) — there is no id param, so a technician can never enumerate another mechanic\'s work.',
  })
  @ApiOkResponse({ type: [Maintenance] })
  @ApiForbiddenResponse({ description: 'Caller is not a TECHNICIAN.' })
  @ApiNotFoundResponse({ description: 'No mechanic profile is linked to the current user.' })
  findMine(@CurrentUser() currentUser: RequestUser) {
    return this.maintenanceService.findMine(currentUser);
  }

  @Get('vehicle/:vehicleId')
  @Roles([RoleEnum.ADMIN])
  @ApiOperation({ summary: 'Get the maintenance history of a vehicle', description: 'ADMIN only. Most recent first.' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle id', example: 1 })
  @ApiOkResponse({ type: [Maintenance] })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN.' })
  @ApiNotFoundResponse({ description: 'No vehicle with this id exists.' })
  findByVehicle(@Param('vehicleId', ParseIntPipe) vehicleId: number) {
    return this.maintenanceService.findByVehicle(vehicleId);
  }

  @Get('mechanic/:mechanicId')
  @Roles([RoleEnum.ADMIN])
  @ApiOperation({ summary: 'Get the maintenances assigned to a mechanic', description: 'ADMIN only. Most recent first.' })
  @ApiParam({ name: 'mechanicId', description: 'Mechanic id', example: 2 })
  @ApiOkResponse({ type: [Maintenance] })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN.' })
  @ApiNotFoundResponse({ description: 'No mechanic with this id exists.' })
  findByMechanic(@Param('mechanicId', ParseIntPipe) mechanicId: number) {
    return this.maintenanceService.findByMechanic(mechanicId);
  }

  @Get(':id')
  @Roles([RoleEnum.ADMIN])
  @ApiOperation({ summary: 'Get a maintenance by id', description: 'ADMIN only.' })
  @ApiParam({ name: 'id', description: 'Maintenance id', example: 10 })
  @ApiOkResponse({ type: Maintenance })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN.' })
  @ApiNotFoundResponse({ description: 'No maintenance with this id exists.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.maintenanceService.findOne(id);
  }

  @Patch(':id')
  @Roles([RoleEnum.ADMIN])
  @ApiOperation({
    summary: 'Edit a maintenance',
    description:
      'ADMIN only. Field edits (reschedule, reassign, description, etc.) — not allowed once the ' +
      'maintenance is COMPLETED or CANCELLED. Re-validates only the fields that actually ' +
      'changed (vehicle/mechanic/workshop active + no conflicting booking, scheduledEndAt after ' +
      'scheduledAt, mileage not lower than the vehicle\'s). Status changes go through ' +
      'PATCH /maintenance/:id/status instead.',
  })
  @ApiParam({ name: 'id', description: 'Maintenance id', example: 10 })
  @ApiOkResponse({ type: Maintenance })
  @ApiBadRequestResponse({ description: 'Validation failed, or a business-rule check (schedule/mileage) failed.' })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN.' })
  @ApiNotFoundResponse({ description: 'The maintenance, or a newly-assigned vehicle/mechanic/workshop id, does not exist.' })
  @ApiConflictResponse({
    description:
      'The maintenance is already COMPLETED/CANCELLED, the newly-assigned vehicle/mechanic/' +
      'workshop is inactive, or the change creates a double-booking.',
  })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateMaintenanceDto: UpdateMaintenanceDto) {
    return this.maintenanceService.update(id, updateMaintenanceDto);
  }

  // No @Roles() here on purpose: both ADMIN and TECHNICIAN may call this, with per-resource
  // ownership enforced inside MaintenanceService (a TECHNICIAN may only update their own).
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Change a maintenance status',
    description:
      'ADMIN may update any maintenance; a TECHNICIAN may only update one assigned to their own ' +
      'linked mechanic. Valid transitions: SCHEDULED -> IN_PROGRESS -> COMPLETED, or -> CANCELLED ' +
      'from SCHEDULED or IN_PROGRESS (COMPLETED/CANCELLED are terminal). Moving to IN_PROGRESS ' +
      "also requires the mechanic have no other maintenance already IN_PROGRESS and flips the " +
      'vehicle to IN_MAINTENANCE. Completing requires workPerformed, finalCost and ' +
      'finalMileage (>= the maintenance\'s mileage), and flips the vehicle back to AVAILABLE ' +
      "while syncing its mileage. The maintenance row and the vehicle update commit together in " +
      'one transaction.',
  })
  @ApiParam({ name: 'id', description: 'Maintenance id', example: 10 })
  @ApiOkResponse({ type: Maintenance })
  @ApiBadRequestResponse({ description: 'Validation failed, missing completion fields, or finalMileage lower than the scheduled mileage.' })
  @ApiForbiddenResponse({ description: "A TECHNICIAN tried to update a maintenance not assigned to their own mechanic profile." })
  @ApiNotFoundResponse({ description: 'No maintenance with this id exists.' })
  @ApiConflictResponse({ description: 'The requested status transition is not valid from the current status, or the mechanic already has another maintenance IN_PROGRESS.' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMaintenanceStatusDto: UpdateMaintenanceStatusDto,
    @CurrentUser() currentUser: RequestUser,
  ) {
    return this.maintenanceService.updateStatus(id, updateMaintenanceStatusDto, currentUser);
  }
}
