import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { WorkshopService } from './workshop.service.js';
import { Workshop } from './entities/workshop.entity.js';
import { WorkshopStatusEnum } from './enum/workshop-status.enum.js';

describe('WorkshopService', () => {
  let service: WorkshopService;
  let workshopRepository: {
    findOneBy: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    workshopRepository = {
      findOneBy: vi.fn(),
      find: vi.fn(),
      create: vi.fn((dto) => dto),
      save: vi.fn((entity) => Promise.resolve({ id: 1, ...entity })),
      update: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkshopService,
        { provide: getRepositoryToken(Workshop), useValue: workshopRepository },
      ],
    }).compile();

    service = module.get<WorkshopService>(WorkshopService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws NotFoundException for a missing workshop', async () => {
    workshopRepository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('rejects assigning an inactive workshop to a new maintenance', async () => {
    workshopRepository.findOneBy.mockResolvedValue({ id: 1, status: WorkshopStatusEnum.INACTIVE });

    await expect(service.assertActiveAndExists(1)).rejects.toThrow(ConflictException);
  });
});
