import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service.js';
import { Maintenance } from './entities/maintenance.entity.js';
import { MaintenanceStatusEnum } from './enum/maintenance-status.enum.js';
import { MaintenanceTypeEnum } from './enum/maintenance-type.enum.js';
import { VehicleService } from '../vehicle/vehicle.service.js';
import { MechanicService } from '../mechanic/mechanic.service.js';
import { WorkshopService } from '../workshop/workshop.service.js';
import { VehicleStatusEnum } from '../vehicle/enum/vehicle-status.enum.js';
import { MechanicStatusEnum } from '../mechanic/enum/mechanic-status.enum.js';
import { RoleEnum } from '../auth/enum/role.enum.js';

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let maintenanceRepository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let vehicleService: {
    assertExistsAndActive: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    updateMileageAndStatus: ReturnType<typeof vi.fn>;
  };
  let mechanicService: {
    assertActiveAndExists: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    findByUserId: ReturnType<typeof vi.fn>;
  };
  let workshopService: { assertActiveAndExists: ReturnType<typeof vi.fn> };

  const vehicle = { id: 1, mileage: 1000, status: VehicleStatusEnum.AVAILABLE };
  const mechanic = { id: 2, status: MechanicStatusEnum.ACTIVE };
  const workshop = { id: 3, status: 'ACTIVE' };

  beforeEach(async () => {
    maintenanceRepository = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn(),
      create: vi.fn((dto) => dto),
      save: vi.fn((entity) => Promise.resolve({ id: 10, ...entity })),
      update: vi.fn(),
    };
    vehicleService = {
      assertExistsAndActive: vi.fn().mockResolvedValue(vehicle),
      findOne: vi.fn().mockResolvedValue(vehicle),
      updateMileageAndStatus: vi.fn(),
    };
    mechanicService = {
      assertActiveAndExists: vi.fn().mockResolvedValue(mechanic),
      findOne: vi.fn().mockResolvedValue(mechanic),
      findByUserId: vi.fn(),
    };
    workshopService = { assertActiveAndExists: vi.fn().mockResolvedValue(workshop) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        { provide: getRepositoryToken(Maintenance), useValue: maintenanceRepository },
        {
          provide: getDataSourceToken(),
          // Transactions just invoke the callback with a manager whose getRepository() returns
          // the same mocked repository — good enough to exercise the status-transition logic.
          useValue: { transaction: vi.fn((cb) => cb({ getRepository: () => maintenanceRepository })) },
        },
        { provide: VehicleService, useValue: vehicleService },
        { provide: MechanicService, useValue: mechanicService },
        { provide: WorkshopService, useValue: workshopService },
      ],
    }).compile();

    service = module.get<MaintenanceService>(MaintenanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects a maintenance with mileage lower than the vehicle current mileage', async () => {
    await expect(
      service.create({
        vehicleId: 1,
        mechanicId: 2,
        workshopId: 3,
        type: MaintenanceTypeEnum.PREVENTIVE,
        description: 'Test',
        mileage: 500,
        scheduledAt: new Date().toISOString(),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects creating a maintenance when the vehicle already has an active one', async () => {
    maintenanceRepository.findOne.mockResolvedValueOnce({ id: 99 });

    await expect(
      service.create({
        vehicleId: 1,
        mechanicId: 2,
        workshopId: 3,
        type: MaintenanceTypeEnum.PREVENTIVE,
        description: 'Test',
        mileage: 1500,
        scheduledAt: new Date().toISOString(),
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects creating a maintenance that overlaps an existing one for the same mechanic', async () => {
    maintenanceRepository.findOne.mockResolvedValueOnce(null);
    maintenanceRepository.find.mockResolvedValueOnce([
      {
        id: 50,
        scheduledAt: new Date('2026-10-28T07:30:00.000Z'),
        scheduledEndAt: new Date('2026-10-28T09:00:00.000Z'),
      },
    ]);

    await expect(
      service.create({
        vehicleId: 1,
        mechanicId: 2,
        workshopId: 3,
        type: MaintenanceTypeEnum.PREVENTIVE,
        description: 'Test',
        mileage: 1500,
        scheduledAt: '2026-10-28T08:00:00.000Z',
        scheduledEndAt: '2026-10-28T09:30:00.000Z',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('allows back-to-back (non-overlapping) bookings for the same mechanic', async () => {
    maintenanceRepository.findOne.mockResolvedValueOnce(null);
    maintenanceRepository.find.mockResolvedValueOnce([
      {
        id: 50,
        scheduledAt: new Date('2026-10-28T07:30:00.000Z'),
        scheduledEndAt: new Date('2026-10-28T09:00:00.000Z'),
      },
    ]);

    await expect(
      service.create({
        vehicleId: 1,
        mechanicId: 2,
        workshopId: 3,
        type: MaintenanceTypeEnum.PREVENTIVE,
        description: 'Test',
        mileage: 1500,
        scheduledAt: '2026-10-28T09:00:00.000Z',
        scheduledEndAt: '2026-10-28T10:30:00.000Z',
      }),
    ).resolves.toBeDefined();
  });

  it('defaults scheduledEndAt to 90 minutes after scheduledAt when omitted', async () => {
    maintenanceRepository.findOne.mockResolvedValueOnce(null);
    maintenanceRepository.find.mockResolvedValueOnce([]);

    const created = await service.create({
      vehicleId: 1,
      mechanicId: 2,
      workshopId: 3,
      type: MaintenanceTypeEnum.PREVENTIVE,
      description: 'Test',
      mileage: 1500,
      scheduledAt: '2026-10-28T09:00:00.000Z',
    });

    expect((created as unknown as { scheduledEndAt: Date }).scheduledEndAt.toISOString()).toBe(
      '2026-10-28T10:30:00.000Z',
    );
  });

  it('rejects a maintenance whose scheduledEndAt is before scheduledAt', async () => {
    await expect(
      service.create({
        vehicleId: 1,
        mechanicId: 2,
        workshopId: 3,
        type: MaintenanceTypeEnum.PREVENTIVE,
        description: 'Test',
        mileage: 1500,
        scheduledAt: '2026-10-28T09:00:00.000Z',
        scheduledEndAt: '2026-10-28T08:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('findAll loads every maintenance with its relations', async () => {
    maintenanceRepository.find.mockResolvedValueOnce([{ id: 1 }]);

    await expect(service.findAll()).resolves.toEqual([{ id: 1 }]);
    expect(maintenanceRepository.find).toHaveBeenCalledWith({
      relations: { vehicle: true, mechanic: true, workshop: true },
    });
  });

  it('findActive only loads SCHEDULED/IN_PROGRESS maintenances', async () => {
    maintenanceRepository.find.mockResolvedValueOnce([{ id: 1 }]);

    await expect(service.findActive()).resolves.toEqual([{ id: 1 }]);
  });

  it('findByVehicle checks the vehicle exists and loads its history', async () => {
    maintenanceRepository.find.mockResolvedValueOnce([{ id: 1 }]);

    await expect(service.findByVehicle(1)).resolves.toEqual([{ id: 1 }]);
    expect(vehicleService.findOne).toHaveBeenCalledWith(1);
  });

  it('findByMechanic checks the mechanic exists and loads their maintenances', async () => {
    maintenanceRepository.find.mockResolvedValueOnce([{ id: 1 }]);

    await expect(service.findByMechanic(2)).resolves.toEqual([{ id: 1 }]);
    expect(mechanicService.findOne).toHaveBeenCalledWith(2);
  });

  it("findMine resolves the caller's mechanic profile and returns their maintenances", async () => {
    mechanicService.findByUserId.mockResolvedValue(mechanic);
    maintenanceRepository.find.mockResolvedValueOnce([{ id: 1 }]);

    await expect(
      service.findMine({ id: 7, email: 'tech@fleetcore.com', role: RoleEnum.TECHNICIAN }),
    ).resolves.toEqual([{ id: 1 }]);
    expect(mechanicService.findByUserId).toHaveBeenCalledWith(7);
  });

  it('findOne returns the matching maintenance with relations', async () => {
    maintenanceRepository.findOne.mockResolvedValueOnce({ id: 10 });

    await expect(service.findOne(10)).resolves.toEqual({ id: 10 });
  });

  it('findOne throws NotFoundException when no maintenance matches', async () => {
    maintenanceRepository.findOne.mockResolvedValueOnce(null);

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('rejects an invalid status transition', async () => {
    maintenanceRepository.findOne.mockResolvedValueOnce({
      id: 10,
      status: MaintenanceStatusEnum.COMPLETED,
      mechanicId: 2,
      vehicleId: 1,
      mileage: 1000,
    });

    await expect(
      service.updateStatus(
        10,
        { status: MaintenanceStatusEnum.IN_PROGRESS },
        { id: 1, email: 'admin@fleetcore.com', role: RoleEnum.ADMIN },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects completing a maintenance without the required completion fields', async () => {
    maintenanceRepository.findOne.mockResolvedValueOnce({
      id: 10,
      status: MaintenanceStatusEnum.IN_PROGRESS,
      mechanicId: 2,
      vehicleId: 1,
      mileage: 1000,
    });

    await expect(
      service.updateStatus(
        10,
        { status: MaintenanceStatusEnum.COMPLETED },
        { id: 1, email: 'admin@fleetcore.com', role: RoleEnum.ADMIN },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects completing a maintenance with a final mileage lower than scheduled', async () => {
    maintenanceRepository.findOne.mockResolvedValueOnce({
      id: 10,
      status: MaintenanceStatusEnum.IN_PROGRESS,
      mechanicId: 2,
      vehicleId: 1,
      mileage: 1000,
    });

    await expect(
      service.updateStatus(
        10,
        {
          status: MaintenanceStatusEnum.COMPLETED,
          workPerformed: 'Oil change',
          finalCost: 100,
          finalMileage: 500,
        },
        { id: 1, email: 'admin@fleetcore.com', role: RoleEnum.ADMIN },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a TECHNICIAN updating a maintenance assigned to a different mechanic', async () => {
    maintenanceRepository.findOne.mockResolvedValueOnce({
      id: 10,
      status: MaintenanceStatusEnum.SCHEDULED,
      mechanicId: 2,
      vehicleId: 1,
      mileage: 1000,
    });
    mechanicService.findByUserId.mockResolvedValue({ id: 999 });

    await expect(
      service.updateStatus(
        10,
        { status: MaintenanceStatusEnum.IN_PROGRESS },
        { id: 7, email: 'tech@fleetcore.com', role: RoleEnum.TECHNICIAN },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects a TECHNICIAN with no linked mechanic profile at all', async () => {
    maintenanceRepository.findOne.mockResolvedValueOnce({
      id: 10,
      status: MaintenanceStatusEnum.SCHEDULED,
      mechanicId: 2,
      vehicleId: 1,
      mileage: 1000,
    });
    mechanicService.findByUserId.mockRejectedValue(new NotFoundException('No mechanic profile'));

    await expect(
      service.updateStatus(
        10,
        { status: MaintenanceStatusEnum.IN_PROGRESS },
        { id: 7, email: 'tech@fleetcore.com', role: RoleEnum.TECHNICIAN },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows a TECHNICIAN to update their own assigned maintenance', async () => {
    maintenanceRepository.findOne
      .mockResolvedValueOnce({
        id: 10,
        status: MaintenanceStatusEnum.SCHEDULED,
        mechanicId: 2,
        vehicleId: 1,
        mileage: 1000,
      })
      .mockResolvedValueOnce(null) // no other IN_PROGRESS maintenance for this mechanic
      .mockResolvedValueOnce({ id: 10, status: MaintenanceStatusEnum.IN_PROGRESS });
    mechanicService.findByUserId.mockResolvedValue({ id: 2 });

    await expect(
      service.updateStatus(
        10,
        { status: MaintenanceStatusEnum.IN_PROGRESS },
        { id: 7, email: 'tech@fleetcore.com', role: RoleEnum.TECHNICIAN },
      ),
    ).resolves.toEqual({ id: 10, status: MaintenanceStatusEnum.IN_PROGRESS });
  });

  it('flips the vehicle to IN_MAINTENANCE when a maintenance starts', async () => {
    maintenanceRepository.findOne
      .mockResolvedValueOnce({
        id: 10,
        status: MaintenanceStatusEnum.SCHEDULED,
        mechanicId: 2,
        vehicleId: 1,
        mileage: 1000,
      })
      .mockResolvedValueOnce(null) // no other IN_PROGRESS maintenance for this mechanic
      .mockResolvedValueOnce({ id: 10, status: MaintenanceStatusEnum.IN_PROGRESS });

    await service.updateStatus(
      10,
      { status: MaintenanceStatusEnum.IN_PROGRESS },
      { id: 1, email: 'admin@fleetcore.com', role: RoleEnum.ADMIN },
    );

    expect(vehicleService.updateMileageAndStatus).toHaveBeenCalledWith(
      1,
      { status: VehicleStatusEnum.IN_MAINTENANCE },
      expect.anything(),
    );
  });

  it('frees the vehicle and syncs its mileage when a maintenance completes', async () => {
    maintenanceRepository.findOne
      .mockResolvedValueOnce({
        id: 10,
        status: MaintenanceStatusEnum.IN_PROGRESS,
        mechanicId: 2,
        vehicleId: 1,
        mileage: 1000,
      })
      .mockResolvedValueOnce({ id: 10, status: MaintenanceStatusEnum.COMPLETED });

    await service.updateStatus(
      10,
      {
        status: MaintenanceStatusEnum.COMPLETED,
        workPerformed: 'Oil change',
        finalCost: 100,
        finalMileage: 1200,
      },
      { id: 1, email: 'admin@fleetcore.com', role: RoleEnum.ADMIN },
    );

    expect(vehicleService.updateMileageAndStatus).toHaveBeenCalledWith(
      1,
      { status: VehicleStatusEnum.AVAILABLE, mileage: 1200 },
      expect.anything(),
    );
  });

  it('frees the vehicle (no mileage sync) when an IN_PROGRESS maintenance is cancelled', async () => {
    maintenanceRepository.findOne
      .mockResolvedValueOnce({
        id: 10,
        status: MaintenanceStatusEnum.IN_PROGRESS,
        mechanicId: 2,
        vehicleId: 1,
        mileage: 1000,
      })
      .mockResolvedValueOnce({ id: 10, status: MaintenanceStatusEnum.CANCELLED });

    await service.updateStatus(
      10,
      { status: MaintenanceStatusEnum.CANCELLED },
      { id: 1, email: 'admin@fleetcore.com', role: RoleEnum.ADMIN },
    );

    expect(vehicleService.updateMileageAndStatus).toHaveBeenCalledWith(
      1,
      { status: VehicleStatusEnum.AVAILABLE },
      expect.anything(),
    );
  });

  it('does not touch the vehicle when a SCHEDULED maintenance is cancelled', async () => {
    maintenanceRepository.findOne
      .mockResolvedValueOnce({
        id: 10,
        status: MaintenanceStatusEnum.SCHEDULED,
        mechanicId: 2,
        vehicleId: 1,
        mileage: 1000,
      })
      .mockResolvedValueOnce({ id: 10, status: MaintenanceStatusEnum.CANCELLED });

    await service.updateStatus(
      10,
      { status: MaintenanceStatusEnum.CANCELLED },
      { id: 1, email: 'admin@fleetcore.com', role: RoleEnum.ADMIN },
    );

    expect(vehicleService.updateMileageAndStatus).not.toHaveBeenCalled();
  });

  it('rejects editing a maintenance that is already COMPLETED', async () => {
    maintenanceRepository.findOne.mockResolvedValueOnce({
      id: 10,
      status: MaintenanceStatusEnum.COMPLETED,
      mechanicId: 2,
      vehicleId: 1,
      workshopId: 3,
      mileage: 1000,
      vehicle,
      scheduledAt: new Date('2026-10-28T07:30:00.000Z'),
      scheduledEndAt: new Date('2026-10-28T09:00:00.000Z'),
    });

    await expect(service.update(10, { description: 'Updated description' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects reassigning a maintenance to an inactive mechanic', async () => {
    maintenanceRepository.findOne.mockResolvedValueOnce({
      id: 10,
      status: MaintenanceStatusEnum.SCHEDULED,
      mechanicId: 2,
      vehicleId: 1,
      workshopId: 3,
      mileage: 1000,
      vehicle,
      scheduledAt: new Date('2026-10-28T07:30:00.000Z'),
      scheduledEndAt: new Date('2026-10-28T09:00:00.000Z'),
    });
    mechanicService.assertActiveAndExists.mockRejectedValueOnce(
      new ConflictException('Mechanic #5 is inactive'),
    );

    await expect(service.update(10, { mechanicId: 5 })).rejects.toThrow(ConflictException);
  });

  it('rejects an update whose new scheduledAt lands after the existing scheduledEndAt', async () => {
    maintenanceRepository.findOne.mockResolvedValueOnce({
      id: 10,
      status: MaintenanceStatusEnum.SCHEDULED,
      mechanicId: 2,
      vehicleId: 1,
      workshopId: 3,
      mileage: 1000,
      vehicle,
      scheduledAt: new Date('2026-10-28T07:30:00.000Z'),
      scheduledEndAt: new Date('2026-10-28T09:00:00.000Z'),
    });

    await expect(
      service.update(10, { scheduledAt: '2026-10-28T10:00:00.000Z' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an update whose mileage is lower than the assigned vehicle mileage', async () => {
    maintenanceRepository.findOne.mockResolvedValueOnce({
      id: 10,
      status: MaintenanceStatusEnum.SCHEDULED,
      mechanicId: 2,
      vehicleId: 1,
      workshopId: 3,
      mileage: 1000,
      vehicle,
      scheduledAt: new Date('2026-10-28T07:30:00.000Z'),
      scheduledEndAt: new Date('2026-10-28T09:00:00.000Z'),
    });

    await expect(service.update(10, { mileage: 100 })).rejects.toThrow(BadRequestException);
  });

  it('rejects starting a maintenance when the mechanic already has another one in progress', async () => {
    maintenanceRepository.findOne
      .mockResolvedValueOnce({
        id: 10,
        status: MaintenanceStatusEnum.SCHEDULED,
        mechanicId: 2,
        vehicleId: 1,
        mileage: 1000,
      })
      .mockResolvedValueOnce({ id: 77, status: MaintenanceStatusEnum.IN_PROGRESS });

    await expect(
      service.updateStatus(
        10,
        { status: MaintenanceStatusEnum.IN_PROGRESS },
        { id: 1, email: 'admin@fleetcore.com', role: RoleEnum.ADMIN },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('applies a full reassignment (vehicle, mechanic, workshop and schedule) on update', async () => {
    const original = {
      id: 10,
      status: MaintenanceStatusEnum.SCHEDULED,
      mechanicId: 2,
      vehicleId: 1,
      workshopId: 3,
      mileage: 1000,
      vehicle,
      scheduledAt: new Date('2026-10-28T07:30:00.000Z'),
      scheduledEndAt: new Date('2026-10-28T09:00:00.000Z'),
    };
    const newVehicle = { id: 9, mileage: 2000, status: VehicleStatusEnum.AVAILABLE };
    const updated = { id: 10, status: MaintenanceStatusEnum.SCHEDULED, vehicleId: 9 };

    maintenanceRepository.findOne
      .mockResolvedValueOnce(original) // findOne(id) at the top
      .mockResolvedValueOnce(null) // assertVehicleHasNoActiveMaintenance for the new vehicle
      .mockResolvedValueOnce(updated); // findOne(id) at the end
    maintenanceRepository.find.mockResolvedValueOnce([]); // assertMechanicHasNoOverlap
    vehicleService.assertExistsAndActive.mockResolvedValueOnce(newVehicle);

    await expect(
      service.update(10, {
        vehicleId: 9,
        mechanicId: 4,
        workshopId: 6,
        mileage: 2500,
        scheduledAt: '2026-10-29T07:30:00.000Z',
        scheduledEndAt: '2026-10-29T09:00:00.000Z',
      }),
    ).resolves.toEqual(updated);

    expect(vehicleService.assertExistsAndActive).toHaveBeenCalledWith(9);
    expect(mechanicService.assertActiveAndExists).toHaveBeenCalledWith(4);
    expect(workshopService.assertActiveAndExists).toHaveBeenCalledWith(6);
    expect(maintenanceRepository.update).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ vehicleId: 9, mechanicId: 4, workshopId: 6, mileage: 2500 }),
    );
  });

  it('reschedules a maintenance without reassigning its mechanic', async () => {
    const original = {
      id: 10,
      status: MaintenanceStatusEnum.SCHEDULED,
      mechanicId: 2,
      vehicleId: 1,
      workshopId: 3,
      mileage: 1000,
      vehicle,
      scheduledAt: new Date('2026-10-28T07:30:00.000Z'),
      scheduledEndAt: new Date('2026-10-28T09:00:00.000Z'),
    };
    maintenanceRepository.findOne
      .mockResolvedValueOnce(original)
      .mockResolvedValueOnce({ id: 10, scheduledAt: new Date('2026-10-28T07:45:00.000Z') });
    maintenanceRepository.find.mockResolvedValueOnce([]); // assertMechanicHasNoOverlap, falls back to maintenance.mechanicId

    await expect(
      service.update(10, { scheduledAt: '2026-10-28T07:45:00.000Z' }),
    ).resolves.toEqual({ id: 10, scheduledAt: new Date('2026-10-28T07:45:00.000Z') });

    expect(maintenanceRepository.update).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        scheduledAt: new Date('2026-10-28T07:45:00.000Z'),
        scheduledEndAt: undefined,
      }),
    );
  });

  it('updates only the mileage, leaving the schedule and assignments untouched', async () => {
    const original = {
      id: 10,
      status: MaintenanceStatusEnum.SCHEDULED,
      mechanicId: 2,
      vehicleId: 1,
      workshopId: 3,
      mileage: 1000,
      vehicle,
      scheduledAt: new Date('2026-10-28T07:30:00.000Z'),
      scheduledEndAt: new Date('2026-10-28T09:00:00.000Z'),
    };
    maintenanceRepository.findOne
      .mockResolvedValueOnce(original)
      .mockResolvedValueOnce({ id: 10, mileage: 1200 });

    await expect(service.update(10, { mileage: 1200 })).resolves.toEqual({ id: 10, mileage: 1200 });

    expect(maintenanceRepository.update).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ mileage: 1200, scheduledAt: undefined, scheduledEndAt: undefined }),
    );
  });

  it('completes a maintenance with an explicit finishedAt', async () => {
    maintenanceRepository.findOne
      .mockResolvedValueOnce({
        id: 10,
        status: MaintenanceStatusEnum.IN_PROGRESS,
        mechanicId: 2,
        vehicleId: 1,
        mileage: 1000,
      })
      .mockResolvedValueOnce({ id: 10, status: MaintenanceStatusEnum.COMPLETED });

    await service.updateStatus(
      10,
      {
        status: MaintenanceStatusEnum.COMPLETED,
        workPerformed: 'Oil change',
        finalCost: 100,
        finalMileage: 1200,
        finishedAt: '2026-10-28T14:00:00.000Z',
      },
      { id: 1, email: 'admin@fleetcore.com', role: RoleEnum.ADMIN },
    );

    expect(maintenanceRepository.update).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ finishedAt: new Date('2026-10-28T14:00:00.000Z') }),
    );
  });
});
