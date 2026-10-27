import { ConflictException } from '@nestjs/common';
import { assertValidTransition } from './maintenance-state-machine.js';
import { MaintenanceStatusEnum } from './enum/maintenance-status.enum.js';

describe('assertValidTransition', () => {
  it('allows SCHEDULED -> IN_PROGRESS', () => {
    expect(() =>
      assertValidTransition(MaintenanceStatusEnum.SCHEDULED, MaintenanceStatusEnum.IN_PROGRESS),
    ).not.toThrow();
  });

  it('allows IN_PROGRESS -> COMPLETED', () => {
    expect(() =>
      assertValidTransition(MaintenanceStatusEnum.IN_PROGRESS, MaintenanceStatusEnum.COMPLETED),
    ).not.toThrow();
  });

  it('rejects COMPLETED -> IN_PROGRESS (terminal state)', () => {
    expect(() =>
      assertValidTransition(MaintenanceStatusEnum.COMPLETED, MaintenanceStatusEnum.IN_PROGRESS),
    ).toThrow(ConflictException);
  });

  it('rejects CANCELLED -> COMPLETED (terminal state)', () => {
    expect(() =>
      assertValidTransition(MaintenanceStatusEnum.CANCELLED, MaintenanceStatusEnum.COMPLETED),
    ).toThrow(ConflictException);
  });

  it('rejects a no-op transition to the same status', () => {
    expect(() =>
      assertValidTransition(MaintenanceStatusEnum.SCHEDULED, MaintenanceStatusEnum.SCHEDULED),
    ).toThrow(ConflictException);
  });
});
