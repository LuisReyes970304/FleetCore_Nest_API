import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { VehicleService } from './vehicle.service.js';
import { Vehicle } from './entities/vehicle.entity.js';
import { Maintenance } from '../maintenance/entities/maintenance.entity.js';
import { VehicleStatusEnum } from './enum/vehicle-status.enum.js';

describe('VehicleService', () => {
  let service: VehicleService;
  let vehicleRepository: {
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vehicleRepository = {
      findOneBy: vi.fn(),
      create: vi.fn((dto) => dto),
      save: vi.fn((entity) => Promise.resolve({ id: 1, ...entity })),
      update: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleService,
        { provide: getRepositoryToken(Vehicle), useValue: vehicleRepository },
        { provide: getRepositoryToken(Maintenance), useValue: { find: vi.fn() } },
      ],
    }).compile();

    service = module.get<VehicleService>(VehicleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects creating a vehicle with a duplicate plate', async () => {
    vehicleRepository.findOneBy.mockResolvedValue({ id: 1, plate: 'ABC123' });

    await expect(
      service.create({ plate: 'ABC123', brand: 'Chevrolet', model: 'NPR', year: 2020, mileage: 1000 }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws NotFoundException when the vehicle does not exist', async () => {
    vehicleRepository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('rejects assigning an INACTIVE vehicle to a new maintenance', async () => {
    vehicleRepository.findOneBy.mockResolvedValue({ id: 1, status: VehicleStatusEnum.INACTIVE });

    await expect(service.assertExistsAndActive(1)).rejects.toThrow(ConflictException);
  });

  it('rejects deactivating a vehicle that is currently in maintenance', async () => {
    vehicleRepository.findOneBy.mockResolvedValue({ id: 1, status: VehicleStatusEnum.IN_MAINTENANCE });

    await expect(service.setStatus(1, VehicleStatusEnum.INACTIVE)).rejects.toThrow(ConflictException);
  });
});
