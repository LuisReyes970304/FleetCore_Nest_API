import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { UserService } from './user.service.js';
import { User } from './entities/user.entity.js';
import { RoleEnum } from './enum/role.enum.js';

describe('UserService', () => {
  let service: UserService;
  let userRepository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    userRepository = {
      create: vi.fn((dto) => ({ ...dto })),
      save: vi.fn((entity) => Promise.resolve({ id: 1, ...entity })),
      findOneBy: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: getRepositoryToken(User), useValue: userRepository }],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('hashes the password and activates the user on create', async () => {
    const user = await service.create({
      email: 'luis@fleetcore.com',
      firstname: 'Luis',
      lastname: 'Reyes',
      password: 'password123',
      role: RoleEnum.ADMIN,
      isActive: true,
    });

    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'luis@fleetcore.com' }),
    );
    expect(user.isActive).toBe(true);
    expect(user.password).not.toBe('password123');
    await expect(compare('password123', user.password)).resolves.toBe(true);
    expect(userRepository.save).toHaveBeenCalled();
  });

  it('findByEmail only matches active users by default', async () => {
    userRepository.findOneBy.mockResolvedValue({ id: 1 });

    await service.findByEmail('luis@fleetcore.com');

    expect(userRepository.findOneBy).toHaveBeenCalledWith({
      email: 'luis@fleetcore.com',
      isActive: true,
    });
  });

  it('findByEmail includes inactive users when asked', async () => {
    userRepository.findOneBy.mockResolvedValue({ id: 1 });

    await service.findByEmail('luis@fleetcore.com', { includeInactive: true });

    expect(userRepository.findOneBy).toHaveBeenCalledWith({ email: 'luis@fleetcore.com' });
  });

  it('findOne returns the active user', async () => {
    userRepository.findOneBy.mockResolvedValue({ id: 1, isActive: true });

    await expect(service.findOne(1)).resolves.toEqual({ id: 1, isActive: true });
  });

  it('findOne throws NotFoundException when no active user matches', async () => {
    userRepository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });
});
