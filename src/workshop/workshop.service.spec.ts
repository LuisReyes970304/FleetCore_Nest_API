import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
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

  it('creates a workshop as ACTIVE', async () => {
    const workshop = await service.create({ name: 'Taller Norte', address: 'Calle 10 # 20-30' });

    expect(workshop.status).toBe(WorkshopStatusEnum.ACTIVE);
    expect(workshopRepository.save).toHaveBeenCalled();
  });

  it('findActive only returns ACTIVE workshops', async () => {
    workshopRepository.find.mockResolvedValue([{ id: 1, status: WorkshopStatusEnum.ACTIVE }]);

    await expect(service.findActive()).resolves.toEqual([{ id: 1, status: WorkshopStatusEnum.ACTIVE }]);
    expect(workshopRepository.find).toHaveBeenCalledWith({
      where: { status: WorkshopStatusEnum.ACTIVE },
    });
  });

  it('findOne returns the matching workshop', async () => {
    workshopRepository.findOneBy.mockResolvedValue({ id: 1 });

    await expect(service.findOne(1)).resolves.toEqual({ id: 1 });
  });

  it('throws NotFoundException for a missing workshop', async () => {
    workshopRepository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('updates a workshop', async () => {
    workshopRepository.findOneBy
      .mockResolvedValueOnce({ id: 1, name: 'Taller Norte' })
      .mockResolvedValueOnce({ id: 1, name: 'Taller Norte 2' });

    await expect(service.update(1, { name: 'Taller Norte 2' })).resolves.toEqual({
      id: 1,
      name: 'Taller Norte 2',
    });
    expect(workshopRepository.update).toHaveBeenCalledWith(1, { name: 'Taller Norte 2' });
  });

  it('setStatus updates and returns the workshop', async () => {
    workshopRepository.findOneBy
      .mockResolvedValueOnce({ id: 1, status: WorkshopStatusEnum.ACTIVE })
      .mockResolvedValueOnce({ id: 1, status: WorkshopStatusEnum.INACTIVE });

    await expect(service.setStatus(1, WorkshopStatusEnum.INACTIVE)).resolves.toEqual({
      id: 1,
      status: WorkshopStatusEnum.INACTIVE,
    });
    expect(workshopRepository.update).toHaveBeenCalledWith(1, { status: WorkshopStatusEnum.INACTIVE });
  });

  it('assertActiveAndExists returns the workshop when it is active', async () => {
    const workshop = { id: 1, status: WorkshopStatusEnum.ACTIVE };
    workshopRepository.findOneBy.mockResolvedValue(workshop);

    await expect(service.assertActiveAndExists(1)).resolves.toEqual(workshop);
  });

  it('rejects assigning an inactive workshop to a new maintenance', async () => {
    workshopRepository.findOneBy.mockResolvedValue({ id: 1, status: WorkshopStatusEnum.INACTIVE });

    await expect(service.assertActiveAndExists(1)).rejects.toThrow(ConflictException);
  });
});
