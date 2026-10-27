import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service.js';
import { Maintenance } from './entities/maintenance.entity.js';
import { MaintenanceStatusEnum } from './enum/maintenance-status.enum.js';
import { MaintenanceTypeEnum } from './enum/maintenance-type.enum.js';
import { VehicleService } from '../vehicle/vehicle.service.js';
import { MechanicService } from '../mechanic/mechanic.service.js';
import { WorkshopService } from '../workshop/workshop.service.js';
import { VehicleStatusEnum } from '../vehicle/enum/vehicle-status.enum.js';
import { MechanicStatusEnum } from '../mechanic/enum/mechanic-status.enum.js';
import { RoleEnum } from '../user/enum/roleEnum.js';

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

  it('flips the vehicle to IN_MAINTENANCE when a maintenance starts', async () => {
    maintenanceRepository.findOne
      .mockResolvedValueOnce({
        id: 10,
        status: MaintenanceStatusEnum.SCHEDULED,
        mechanicId: 2,
        vehicleId: 1,
        mileage: 1000,
      })
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
});
