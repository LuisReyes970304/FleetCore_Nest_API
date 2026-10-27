import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { MechanicService } from './mechanic.service.js';
import { Mechanic } from './entities/mechanic.entity.js';
import { MechanicStatusEnum } from './enum/mechanic-status.enum.js';
import { UserService } from '../auth/user.service.js';

describe('MechanicService', () => {
  let service: MechanicService;
  let mechanicRepository: {
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mechanicRepository = {
      findOneBy: vi.fn(),
      create: vi.fn((dto) => dto),
      save: vi.fn((entity) => Promise.resolve({ id: 1, ...entity })),
      update: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MechanicService,
        { provide: getRepositoryToken(Mechanic), useValue: mechanicRepository },
        { provide: UserService, useValue: { findOne: vi.fn() } },
      ],
    }).compile();

    service = module.get<MechanicService>(MechanicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects creating a mechanic with a duplicate email', async () => {
    mechanicRepository.findOneBy.mockResolvedValue({ id: 1 });

    await expect(
      service.create({ name: 'Carlos', email: 'carlos@fleetcore.com', specialty: 'Motor' }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects an inactive mechanic via assertActiveAndExists', async () => {
    mechanicRepository.findOneBy.mockResolvedValue({ id: 1, status: MechanicStatusEnum.INACTIVE });

    await expect(service.assertActiveAndExists(1)).rejects.toThrow(ConflictException);
  });

  it('rejects linking a mechanic to a user already linked to another mechanic', async () => {
    mechanicRepository.findOneBy
      .mockResolvedValueOnce(null) // email uniqueness check
      .mockResolvedValueOnce({ id: 2, userId: 5 }); // userId already linked elsewhere

    await expect(
      service.create({ name: 'Carlos', email: 'new@fleetcore.com', specialty: 'Motor', userId: 5 }),
    ).rejects.toThrow(ConflictException);
  });
});
