import { ConflictException } from '@nestjs/common';
import { MaintenanceStatusEnum } from './enum/maintenance-status.enum.js';

// Explicit allow-list of status transitions — the single source of truth for maintenance
// lifecycle rules. Anything not listed here is rejected with a 409, never silently applied and
// never a 500. Kept out of the service so it's independently unit-testable.
const TRANSITIONS: Record<MaintenanceStatusEnum, MaintenanceStatusEnum[]> = {
  [MaintenanceStatusEnum.SCHEDULED]: [
    MaintenanceStatusEnum.IN_PROGRESS,
    MaintenanceStatusEnum.CANCELLED,
  ],
  [MaintenanceStatusEnum.IN_PROGRESS]: [
    MaintenanceStatusEnum.COMPLETED,
    MaintenanceStatusEnum.CANCELLED,
  ],
  [MaintenanceStatusEnum.COMPLETED]: [],
  [MaintenanceStatusEnum.CANCELLED]: [],
};

export function assertValidTransition(
  current: MaintenanceStatusEnum,
  next: MaintenanceStatusEnum,
): void {
  if (current === next) {
    throw new ConflictException(`Maintenance is already in status ${current}`);
  }
  if (!TRANSITIONS[current].includes(next)) {
    throw new ConflictException(`Cannot transition maintenance from ${current} to ${next}`);
  }
}
