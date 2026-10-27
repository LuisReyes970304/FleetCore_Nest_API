import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import { AuthService } from './auth.service.js';
import { UserService } from '../user/user.service.js';
import { RoleEnum } from '../user/enum/roleEnum.js';

describe('AuthService', () => {
  let service: AuthService;
  let userService: { findByEmail: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  let jwtService: { sign: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    userService = { findByEmail: vi.fn(), create: vi.fn() };
    jwtService = { sign: vi.fn(() => 'signed-jwt') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects registering an email that is already taken, even by an inactive user', async () => {
    userService.findByEmail.mockResolvedValue({ id: 1, email: 'taken@fleetcore.com' });

    await expect(
      service.register({
        email: 'taken@fleetcore.com',
        firstname: 'A',
        lastname: 'B',
        password: 'pw',
        role: RoleEnum.TECHNICIAN,
        isActive: true,
      }),
    ).rejects.toThrow(ConflictException);

    expect(userService.findByEmail).toHaveBeenCalledWith('taken@fleetcore.com', {
      includeInactive: true,
    });
  });

  it('rejects login with an unknown email', async () => {
    userService.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: 'nope@fleetcore.com', password: 'whatever' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects login with a wrong password', async () => {
    const passwordHash = await hash('correct-password', 10);
    userService.findByEmail.mockResolvedValue({
      id: 1,
      email: 'user@fleetcore.com',
      password: passwordHash,
      role: RoleEnum.ADMIN,
      firstname: 'A',
      lastname: 'B',
    });

    await expect(
      service.login({ email: 'user@fleetcore.com', password: 'wrong-password' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('returns a signed JWT on successful login', async () => {
    const passwordHash = await hash('correct-password', 10);
    userService.findByEmail.mockResolvedValue({
      id: 1,
      email: 'user@fleetcore.com',
      password: passwordHash,
      role: RoleEnum.ADMIN,
      firstname: 'A',
      lastname: 'B',
    });

    const result = await service.login({
      email: 'user@fleetcore.com',
      password: 'correct-password',
    });

    expect(result.accessToken).toBe('signed-jwt');
  });
});
