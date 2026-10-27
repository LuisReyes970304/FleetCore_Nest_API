import { PartialType } from '@nestjs/swagger';
import { CreateMaintenanceDto } from './create-maintenance.dto.js';

// Field edits only (reschedule, description, etc.) — status changes go through the dedicated
// PATCH /maintenance/:id/status endpoint and UpdateMaintenanceStatusDto instead.
export class UpdateMaintenanceDto extends PartialType(CreateMaintenanceDto) {}
