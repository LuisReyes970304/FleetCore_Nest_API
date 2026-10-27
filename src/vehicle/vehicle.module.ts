import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from './entities/vehicle.entity.js';
import { Maintenance } from '../maintenance/entities/maintenance.entity.js';
import { VehicleService } from './vehicle.service.js';
import { VehicleController } from './vehicle.controller.js';

@Module({
  // Maintenance is registered here too (entity only, not MaintenanceModule) purely so
  // VehicleService can read maintenance history for the external-integration endpoint, without
  // creating a circular module dependency (MaintenanceModule already depends on VehicleModule).
  imports: [TypeOrmModule.forFeature([Vehicle, Maintenance])],
  controllers: [VehicleController],
  providers: [VehicleService],
  exports: [VehicleService],
})
export class VehicleModule {}
