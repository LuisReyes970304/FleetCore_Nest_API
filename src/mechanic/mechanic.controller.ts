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
import { MechanicService } from './mechanic.service.js';
import { CreateMechanicDto } from './dto/create-mechanic.dto.js';
import { UpdateMechanicDto } from './dto/update-mechanic.dto.js';
import { Mechanic } from './entities/mechanic.entity.js';
import { Roles, RoleEnum } from '../auth/enum/role.enum.js';
import { MechanicStatusEnum } from './enum/mechanic-status.enum.js';

@ApiTags('Mechanic')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
@Controller('mechanic')
export class MechanicController {
  constructor(private readonly mechanicService: MechanicService) {}

  @Post()
  @Roles([RoleEnum.ADMIN])
  @ApiOperation({
    summary: 'Create a mechanic',
    description: 'ADMIN only. The email must be unique. Optionally links to an existing User via userId, so that user can later see "their" maintenances.',
  })
  @ApiCreatedResponse({ description: 'Mechanic created with status ACTIVE.', type: Mechanic })
  @ApiBadRequestResponse({ description: 'Validation failed (missing/invalid field).' })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN.' })
  @ApiConflictResponse({ description: 'The email is already used by another mechanic, or userId is already linked to another mechanic.' })
  @ApiNotFoundResponse({ description: 'userId was given but no such user exists.' })
  create(@Body() createMechanicDto: CreateMechanicDto) {
    return this.mechanicService.create(createMechanicDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all mechanics', description: 'Any authenticated user.' })
  @ApiOkResponse({ description: 'All mechanics, regardless of status.', type: [Mechanic] })
  findAll() {
    return this.mechanicService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a mechanic by id', description: 'Any authenticated user.' })
  @ApiParam({ name: 'id', description: 'Mechanic id', example: 1 })
  @ApiOkResponse({ type: Mechanic })
  @ApiNotFoundResponse({ description: 'No mechanic with this id exists.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.mechanicService.findOne(id);
  }

  @Patch(':id')
  @Roles([RoleEnum.ADMIN])
  @ApiOperation({ summary: 'Update a mechanic', description: 'ADMIN only. Partial update; all fields optional.' })
  @ApiParam({ name: 'id', description: 'Mechanic id', example: 1 })
  @ApiOkResponse({ type: Mechanic })
  @ApiBadRequestResponse({ description: 'Validation failed (missing/invalid field).' })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN.' })
  @ApiNotFoundResponse({ description: 'No mechanic with this id exists (or, if userId changed, no such user exists).' })
  @ApiConflictResponse({ description: 'The new userId is already linked to another mechanic.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateMechanicDto: UpdateMechanicDto) {
    return this.mechanicService.update(id, updateMechanicDto);
  }

  @Patch(':id/activate')
  @Roles([RoleEnum.ADMIN])
  @ApiOperation({ summary: 'Activate a mechanic', description: 'ADMIN only. Flips status back to ACTIVE.' })
  @ApiParam({ name: 'id', description: 'Mechanic id', example: 1 })
  @ApiOkResponse({ type: Mechanic })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN.' })
  @ApiNotFoundResponse({ description: 'No mechanic with this id exists.' })
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.mechanicService.setStatus(id, MechanicStatusEnum.ACTIVE);
  }

  @Patch(':id/deactivate')
  @Roles([RoleEnum.ADMIN])
  @ApiOperation({
    summary: 'Deactivate a mechanic (soft delete)',
    description: 'ADMIN only. Flips status to INACTIVE; the mechanic and its maintenance history are kept, never hard-deleted.',
  })
  @ApiParam({ name: 'id', description: 'Mechanic id', example: 1 })
  @ApiOkResponse({ type: Mechanic })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN.' })
  @ApiNotFoundResponse({ description: 'No mechanic with this id exists.' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.mechanicService.setStatus(id, MechanicStatusEnum.INACTIVE);
  }
}
