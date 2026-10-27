import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hash } from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { User } from './entities/user.entity.js';

const PASSWORD_SALT_ROUNDS = 10;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const user = this.userRepository.create(createUserDto);
    user.isActive = true;
    user.password = await hash(createUserDto.password, PASSWORD_SALT_ROUNDS);
    return this.userRepository.save(user);
  }

  findAll() {
    return this.userRepository.find({ where: { isActive: true } });
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOneBy({ id, isActive: true });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.findOne(id);
    const { password, ...rest } = updateUserDto;
    const changes = password
      ? { ...rest, password: await hash(password, PASSWORD_SALT_ROUNDS) }
      : rest;
    await this.userRepository.update(id, changes);
    return this.findOne(id);
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    await this.userRepository.update(id, { isActive: false });
    return user;
  }
}