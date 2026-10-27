import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hash } from 'bcryptjs';
import { RegisterDto } from './dto/register.dto.js';
import { User } from './entities/user.entity.js';

const PASSWORD_SALT_ROUNDS = 10;

// Internal-only persistence for the User entity — no controller/CRUD of its own, since
// POST /auth/register is the single place a user gets created. Used by AuthService
// (register/login) and MechanicService (validating a user before linking it via
// Mechanic.userId).
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(registerDto: RegisterDto) {
    const user = this.userRepository.create(registerDto);
    user.isActive = true;
    user.password = await hash(registerDto.password, PASSWORD_SALT_ROUNDS);
    return this.userRepository.save(user);
  }

  // includeInactive is needed by AuthService: registration must reject an email that belongs to
  // a soft-deleted user too, while login must only ever succeed for an active one.
  findByEmail(email: string, options: { includeInactive?: boolean } = {}) {
    return this.userRepository.findOneBy(
      options.includeInactive ? { email } : { email, isActive: true },
    );
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOneBy({ id, isActive: true });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }
}
