import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Maintenance } from './entities/maintenance.entity.js';
import { MaintenanceService } from './maintenance.service.js';
import { MaintenanceController } from './maintenance.controller.js';
import { VehicleModule } from '../vehicle/vehicle.module.js';
import { MechanicModule } from '../mechanic/mechanic.module.js';
import { WorkshopModule } from '../workshop/workshop.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Maintenance]),
    VehicleModule,
    MechanicModule,
    WorkshopModule,
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
