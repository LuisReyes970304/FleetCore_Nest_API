import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { WorkshopService } from './workshop.service.js';
import { CreateWorkshopDto } from './dto/create-workshop.dto.js';
import { UpdateWorkshopDto } from './dto/update-workshop.dto.js';
import { Workshop } from './entities/workshop.entity.js';
import { Roles, RoleEnum } from '../auth/enum/role.enum.js';
import { WorkshopStatusEnum } from './enum/workshop-status.enum.js';

@ApiTags('Workshop')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
@Controller('workshop')
export class WorkshopController {
  constructor(private readonly workshopService: WorkshopService) {}

  @Post()
  @Roles([RoleEnum.ADMIN])
  @ApiOperation({ summary: 'Create a workshop', description: 'ADMIN only.' })
  @ApiCreatedResponse({ description: 'Workshop created with status ACTIVE.', type: Workshop })
  @ApiBadRequestResponse({ description: 'Validation failed (missing/invalid field).' })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN.' })
  create(@Body() createWorkshopDto: CreateWorkshopDto) {
    return this.workshopService.create(createWorkshopDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List active workshops',
    description: 'Any authenticated user. Only ACTIVE workshops — an ADMIN can see an inactive one via GET /workshop/:id instead.',
  })
  @ApiOkResponse({ type: [Workshop] })
  findActive() {
    return this.workshopService.findActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a workshop by id', description: 'Any authenticated user. Works regardless of status.' })
  @ApiParam({ name: 'id', description: 'Workshop id', example: 1 })
  @ApiOkResponse({ type: Workshop })
  @ApiNotFoundResponse({ description: 'No workshop with this id exists.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.workshopService.findOne(id);
  }

  @Patch(':id')
  @Roles([RoleEnum.ADMIN])
  @ApiOperation({ summary: 'Update a workshop', description: 'ADMIN only. Partial update; all fields optional.' })
  @ApiParam({ name: 'id', description: 'Workshop id', example: 1 })
  @ApiOkResponse({ type: Workshop })
  @ApiBadRequestResponse({ description: 'Validation failed (missing/invalid field).' })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN.' })
  @ApiNotFoundResponse({ description: 'No workshop with this id exists.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateWorkshopDto: UpdateWorkshopDto) {
    return this.workshopService.update(id, updateWorkshopDto);
  }

  @Patch(':id/activate')
  @Roles([RoleEnum.ADMIN])
  @ApiOperation({ summary: 'Activate a workshop', description: 'ADMIN only. Flips status back to ACTIVE.' })
  @ApiParam({ name: 'id', description: 'Workshop id', example: 1 })
  @ApiOkResponse({ type: Workshop })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN.' })
  @ApiNotFoundResponse({ description: 'No workshop with this id exists.' })
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.workshopService.setStatus(id, WorkshopStatusEnum.ACTIVE);
  }

  @Patch(':id/deactivate')
  @Roles([RoleEnum.ADMIN])
  @ApiOperation({
    summary: 'Deactivate a workshop (soft delete)',
    description: 'ADMIN only. Flips status to INACTIVE; the workshop and its maintenance history are kept, never hard-deleted.',
  })
  @ApiParam({ name: 'id', description: 'Workshop id', example: 1 })
  @ApiOkResponse({ type: Workshop })
  @ApiForbiddenResponse({ description: 'Caller is not an ADMIN.' })
  @ApiNotFoundResponse({ description: 'No workshop with this id exists.' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.workshopService.setStatus(id, WorkshopStatusEnum.INACTIVE);
  }
}
