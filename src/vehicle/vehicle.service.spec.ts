import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { VehicleService } from './vehicle.service.js';
import { Vehicle } from './entities/vehicle.entity.js';
import { Maintenance } from '../maintenance/entities/maintenance.entity.js';
import { VehicleStatusEnum } from './enum/vehicle-status.enum.js';
import { MaintenanceStatusEnum } from '../maintenance/enum/maintenance-status.enum.js';
import { MaintenanceTypeEnum } from '../maintenance/enum/maintenance-type.enum.js';

describe('VehicleService', () => {
  let service: VehicleService;
  let vehicleRepository: {
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let maintenanceRepository: { find: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vehicleRepository = {
      find: vi.fn(),
      findOneBy: vi.fn(),
      create: vi.fn((dto) => dto),
      save: vi.fn((entity) => Promise.resolve({ id: 1, ...entity })),
      update: vi.fn(),
    };
    maintenanceRepository = { find: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleService,
        { provide: getRepositoryToken(Vehicle), useValue: vehicleRepository },
        { provide: getRepositoryToken(Maintenance), useValue: maintenanceRepository },
      ],
    }).compile();

    service = module.get<VehicleService>(VehicleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a vehicle as AVAILABLE when the plate is free', async () => {
    vehicleRepository.findOneBy.mockResolvedValue(null);

    const vehicle = await service.create({
      plate: 'ABC123',
      brand: 'Chevrolet',
      model: 'NPR',
      year: 2020,
      mileage: 1000,
    });

    expect(vehicle.status).toBe(VehicleStatusEnum.AVAILABLE);
    expect(vehicleRepository.save).toHaveBeenCalled();
  });

  it('rejects creating a vehicle with a duplicate plate', async () => {
    vehicleRepository.findOneBy.mockResolvedValue({ id: 1, plate: 'ABC123' });

    await expect(
      service.create({ plate: 'ABC123', brand: 'Chevrolet', model: 'NPR', year: 2020, mileage: 1000 }),
    ).rejects.toThrow(ConflictException);
  });

  it('findAll returns every vehicle', async () => {
    vehicleRepository.find.mockResolvedValue([{ id: 1 }]);

    await expect(service.findAll()).resolves.toEqual([{ id: 1 }]);
  });

  it('throws NotFoundException when the vehicle does not exist', async () => {
    vehicleRepository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('findByPlate returns the matching vehicle', async () => {
    vehicleRepository.findOneBy.mockResolvedValue({ id: 1, plate: 'ABC123' });

    await expect(service.findByPlate('ABC123')).resolves.toEqual({ id: 1, plate: 'ABC123' });
  });

  it('findByPlate throws NotFoundException when no vehicle matches', async () => {
    vehicleRepository.findOneBy.mockResolvedValue(null);

    await expect(service.findByPlate('ZZZ999')).rejects.toThrow(NotFoundException);
  });

  it('updates a vehicle without touching the plate', async () => {
    vehicleRepository.findOneBy.mockResolvedValueOnce({ id: 1, plate: 'ABC123' });
    vehicleRepository.findOneBy.mockResolvedValueOnce({ id: 1, plate: 'ABC123', brand: 'Isuzu' });

    await expect(service.update(1, { brand: 'Isuzu' })).resolves.toEqual({
      id: 1,
      plate: 'ABC123',
      brand: 'Isuzu',
    });
    expect(vehicleRepository.update).toHaveBeenCalledWith(1, { brand: 'Isuzu' });
  });

  it('allows updating the plate to one no other vehicle has', async () => {
    vehicleRepository.findOneBy
      .mockResolvedValueOnce({ id: 1, plate: 'ABC123' }) // findOne(id) at the top
      .mockResolvedValueOnce(null) // plate uniqueness check
      .mockResolvedValueOnce({ id: 1, plate: 'XYZ999' }); // findOne(id) at the end

    await expect(service.update(1, { plate: 'XYZ999' })).resolves.toEqual({ id: 1, plate: 'XYZ999' });
  });

  it('allows "updating" the plate to the vehicle own current plate', async () => {
    vehicleRepository.findOneBy
      .mockResolvedValueOnce({ id: 1, plate: 'ABC123' })
      .mockResolvedValueOnce({ id: 1, plate: 'ABC123' }) // same vehicle owns that plate already
      .mockResolvedValueOnce({ id: 1, plate: 'ABC123' });

    await expect(service.update(1, { plate: 'ABC123' })).resolves.toEqual({ id: 1, plate: 'ABC123' });
  });

  it('rejects updating the plate to one already used by another vehicle', async () => {
    vehicleRepository.findOneBy
      .mockResolvedValueOnce({ id: 1, plate: 'ABC123' })
      .mockResolvedValueOnce({ id: 2, plate: 'XYZ999' });

    await expect(service.update(1, { plate: 'XYZ999' })).rejects.toThrow(ConflictException);
  });

  it('rejects assigning an INACTIVE vehicle to a new maintenance', async () => {
    vehicleRepository.findOneBy.mockResolvedValue({ id: 1, status: VehicleStatusEnum.INACTIVE });

    await expect(service.assertExistsAndActive(1)).rejects.toThrow(ConflictException);
  });

  it('assertExistsAndActive returns the vehicle when it is not inactive', async () => {
    const vehicle = { id: 1, status: VehicleStatusEnum.AVAILABLE };
    vehicleRepository.findOneBy.mockResolvedValue(vehicle);

    await expect(service.assertExistsAndActive(1)).resolves.toEqual(vehicle);
  });

  it('rejects deactivating a vehicle that is currently in maintenance', async () => {
    vehicleRepository.findOneBy.mockResolvedValue({ id: 1, status: VehicleStatusEnum.IN_MAINTENANCE });

    await expect(service.setStatus(1, VehicleStatusEnum.INACTIVE)).rejects.toThrow(ConflictException);
  });

  it('setStatus updates and returns the vehicle when it is not in maintenance', async () => {
    vehicleRepository.findOneBy
      .mockResolvedValueOnce({ id: 1, status: VehicleStatusEnum.AVAILABLE })
      .mockResolvedValueOnce({ id: 1, status: VehicleStatusEnum.INACTIVE });

    await expect(service.setStatus(1, VehicleStatusEnum.INACTIVE)).resolves.toEqual({
      id: 1,
      status: VehicleStatusEnum.INACTIVE,
    });
    expect(vehicleRepository.update).toHaveBeenCalledWith(1, { status: VehicleStatusEnum.INACTIVE });
  });

  it('updateMileageAndStatus uses the plain repository when no manager is given', async () => {
    await service.updateMileageAndStatus(1, { status: VehicleStatusEnum.AVAILABLE, mileage: 500 });

    expect(vehicleRepository.update).toHaveBeenCalledWith(1, {
      status: VehicleStatusEnum.AVAILABLE,
      mileage: 500,
    });
  });

  it('updateMileageAndStatus uses the transactional manager when given one', async () => {
    const transactionalUpdate = vi.fn();
    const manager = { getRepository: vi.fn(() => ({ update: transactionalUpdate })) } as unknown as EntityManager;

    await service.updateMileageAndStatus(1, { status: VehicleStatusEnum.AVAILABLE }, manager);

    expect(transactionalUpdate).toHaveBeenCalledWith(1, { status: VehicleStatusEnum.AVAILABLE });
    expect(vehicleRepository.update).not.toHaveBeenCalled();
  });

  it('getExternalProfile returns a nested view of the vehicle and its maintenance history', async () => {
    vehicleRepository.findOneBy.mockResolvedValue({
      id: 1,
      plate: 'ABC123',
      brand: 'Chevrolet',
      model: 'NPR',
      status: VehicleStatusEnum.AVAILABLE,
    });
    maintenanceRepository.find.mockResolvedValue([
      {
        id: 32,
        type: MaintenanceTypeEnum.PREVENTIVE,
        status: MaintenanceStatusEnum.COMPLETED,
        description: 'Cambio de aceite y filtros',
        mileage: 45000,
        finishedAt: new Date('2026-09-15T16:30:00.000Z'),
        mechanic: { id: 2, name: 'Carlos Pérez' },
        workshop: { id: 1, name: 'Taller Norte' },
      },
      {
        id: 33,
        type: MaintenanceTypeEnum.CORRECTIVE,
        status: MaintenanceStatusEnum.SCHEDULED,
        description: 'Revisión de frenos',
        mileage: 46000,
        finishedAt: null,
        mechanic: { id: 3, name: 'Laura Gómez' },
        workshop: { id: 2, name: 'Taller Sur' },
      },
    ]);

    const profile = await service.getExternalProfile('ABC123');

    expect(profile.vehicle).toEqual({
      id: 1,
      plate: 'ABC123',
      brand: 'Chevrolet',
      model: 'NPR',
      available: true,
    });
    expect(profile.maintenances).toHaveLength(2);
    expect(profile.maintenances[0]).toEqual({
      id: 32,
      type: MaintenanceTypeEnum.PREVENTIVE,
      status: MaintenanceStatusEnum.COMPLETED,
      description: 'Cambio de aceite y filtros',
      mileage: 45000,
      finishedAt: '2026-09-15T16:30:00.000Z',
      mechanic: { id: 2, name: 'Carlos Pérez' },
      workshop: { id: 1, name: 'Taller Norte' },
    });
    expect(profile.maintenances[1].finishedAt).toBeNull();
  });

  it('getExternalProfile throws NotFoundException when the plate does not exist', async () => {
    vehicleRepository.findOneBy.mockResolvedValue(null);

    await expect(service.getExternalProfile('ZZZ999')).rejects.toThrow(NotFoundException);
  });
});
