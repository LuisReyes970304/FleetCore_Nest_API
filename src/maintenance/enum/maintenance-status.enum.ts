export enum MaintenanceStatusEnum {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// Maintenance statuses that count as "the vehicle/mechanic is tied up with this job" for the
// one-active-maintenance-per-vehicle and mechanic-overlap business rules.
export const ACTIVE_MAINTENANCE_STATUSES = [
  MaintenanceStatusEnum.SCHEDULED,
  MaintenanceStatusEnum.IN_PROGRESS,
];
