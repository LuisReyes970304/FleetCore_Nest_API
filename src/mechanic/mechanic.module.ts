import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mechanic } from './entities/mechanic.entity.js';
import { MechanicService } from './mechanic.service.js';
import { MechanicController } from './mechanic.controller.js';
import { UserModule } from '../user/user.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Mechanic]), UserModule],
  controllers: [MechanicController],
  providers: [MechanicService],
  exports: [MechanicService],
})
export class MechanicModule {}
