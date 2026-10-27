import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MechanicService } from './mechanic.service.js';
import { Mechanic } from './entities/mechanic.entity.js';
import { MechanicStatusEnum } from './enum/mechanic-status.enum.js';
import { UserService } from '../auth/user.service.js';

describe('MechanicService', () => {
  let service: MechanicService;
  let mechanicRepository: {
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let userService: { findOne: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mechanicRepository = {
      find: vi.fn(),
      findOneBy: vi.fn(),
      create: vi.fn((dto) => dto),
      save: vi.fn((entity) => Promise.resolve({ id: 1, ...entity })),
      update: vi.fn(),
    };
    userService = { findOne: vi.fn().mockResolvedValue({ id: 5 }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MechanicService,
        { provide: getRepositoryToken(Mechanic), useValue: mechanicRepository },
        { provide: UserService, useValue: userService },
      ],
    }).compile();

    service = module.get<MechanicService>(MechanicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a mechanic as ACTIVE without a linked user', async () => {
    mechanicRepository.findOneBy.mockResolvedValue(null);

    const mechanic = await service.create({
      name: 'Carlos',
      email: 'carlos@fleetcore.com',
      specialty: 'Motor',
    });

    expect(mechanic.status).toBe(MechanicStatusEnum.ACTIVE);
    expect(mechanic.userId).toBeNull();
    expect(userService.findOne).not.toHaveBeenCalled();
  });

  it('creates a mechanic linked to a free user', async () => {
    mechanicRepository.findOneBy
      .mockResolvedValueOnce(null) // email uniqueness check
      .mockResolvedValueOnce(null); // userId not linked to anyone yet

    const mechanic = await service.create({
      name: 'Carlos',
      email: 'carlos@fleetcore.com',
      specialty: 'Motor',
      userId: 5,
    });

    expect(userService.findOne).toHaveBeenCalledWith(5);
    expect(mechanic.userId).toBe(5);
  });

  it('rejects creating a mechanic with a duplicate email', async () => {
    mechanicRepository.findOneBy.mockResolvedValue({ id: 1 });

    await expect(
      service.create({ name: 'Carlos', email: 'carlos@fleetcore.com', specialty: 'Motor' }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects linking a mechanic to a user already linked to another mechanic', async () => {
    mechanicRepository.findOneBy
      .mockResolvedValueOnce(null) // email uniqueness check
      .mockResolvedValueOnce({ id: 2, userId: 5 }); // userId already linked elsewhere

    await expect(
      service.create({ name: 'Carlos', email: 'new@fleetcore.com', specialty: 'Motor', userId: 5 }),
    ).rejects.toThrow(ConflictException);
  });

  it('findAll returns every mechanic', async () => {
    mechanicRepository.find.mockResolvedValue([{ id: 1 }]);

    await expect(service.findAll()).resolves.toEqual([{ id: 1 }]);
  });

  it('findOne returns the matching mechanic', async () => {
    mechanicRepository.findOneBy.mockResolvedValue({ id: 1 });

    await expect(service.findOne(1)).resolves.toEqual({ id: 1 });
  });

  it('findOne throws NotFoundException when no mechanic matches', async () => {
    mechanicRepository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('findByUserId resolves the mechanic linked to a user', async () => {
    mechanicRepository.findOneBy.mockResolvedValue({ id: 1, userId: 7 });

    await expect(service.findByUserId(7)).resolves.toEqual({ id: 1, userId: 7 });
  });

  it('findByUserId throws NotFoundException when no mechanic is linked', async () => {
    mechanicRepository.findOneBy.mockResolvedValue(null);

    await expect(service.findByUserId(7)).rejects.toThrow(NotFoundException);
  });

  it('updates a mechanic without touching userId', async () => {
    mechanicRepository.findOneBy.mockResolvedValueOnce({ id: 1, name: 'Carlos' });
    mechanicRepository.findOneBy.mockResolvedValueOnce({ id: 1, name: 'Carlos Pérez' });

    await expect(service.update(1, { name: 'Carlos Pérez' })).resolves.toEqual({
      id: 1,
      name: 'Carlos Pérez',
    });
    expect(userService.findOne).not.toHaveBeenCalled();
  });

  it('allows relinking a mechanic to the same user it already owns', async () => {
    mechanicRepository.findOneBy
      .mockResolvedValueOnce({ id: 1, userId: 5 }) // findOne(id) at the top
      .mockResolvedValueOnce({ id: 1, userId: 5 }) // linked lookup resolves to itself
      .mockResolvedValueOnce({ id: 1, userId: 5 }); // findOne(id) at the end

    await expect(service.update(1, { userId: 5 })).resolves.toEqual({ id: 1, userId: 5 });
  });

  it('rejects relinking a mechanic to a user already linked to a different mechanic', async () => {
    mechanicRepository.findOneBy
      .mockResolvedValueOnce({ id: 1, userId: null })
      .mockResolvedValueOnce({ id: 2, userId: 5 });

    await expect(service.update(1, { userId: 5 })).rejects.toThrow(ConflictException);
  });

  it('setStatus updates and returns the mechanic', async () => {
    mechanicRepository.findOneBy
      .mockResolvedValueOnce({ id: 1, status: MechanicStatusEnum.ACTIVE })
      .mockResolvedValueOnce({ id: 1, status: MechanicStatusEnum.INACTIVE });

    await expect(service.setStatus(1, MechanicStatusEnum.INACTIVE)).resolves.toEqual({
      id: 1,
      status: MechanicStatusEnum.INACTIVE,
    });
    expect(mechanicRepository.update).toHaveBeenCalledWith(1, { status: MechanicStatusEnum.INACTIVE });
  });

  it('assertActiveAndExists returns the mechanic when it is active', async () => {
    const mechanic = { id: 1, status: MechanicStatusEnum.ACTIVE };
    mechanicRepository.findOneBy.mockResolvedValue(mechanic);

    await expect(service.assertActiveAndExists(1)).resolves.toEqual(mechanic);
  });

  it('rejects an inactive mechanic via assertActiveAndExists', async () => {
    mechanicRepository.findOneBy.mockResolvedValue({ id: 1, status: MechanicStatusEnum.INACTIVE });

    await expect(service.assertActiveAndExists(1)).rejects.toThrow(ConflictException);
  });
});
