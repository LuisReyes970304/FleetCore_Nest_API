import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';
import { AppModule } from '../../app.module.js';
import { UserService } from '../../auth/user.service.js';
import { User } from '../../auth/entities/user.entity.js';
import { RoleEnum } from '../../auth/enum/role.enum.js';
import { MechanicService } from '../../mechanic/mechanic.service.js';
import { Mechanic } from '../../mechanic/entities/mechanic.entity.js';
import { MechanicStatusEnum } from '../../mechanic/enum/mechanic-status.enum.js';
import { WorkshopService } from '../../workshop/workshop.service.js';
import { Workshop } from '../../workshop/entities/workshop.entity.js';
import { WorkshopStatusEnum } from '../../workshop/enum/workshop-status.enum.js';
import { VehicleService } from '../../vehicle/vehicle.service.js';
import { Vehicle } from '../../vehicle/entities/vehicle.entity.js';
import { VehicleStatusEnum } from '../../vehicle/enum/vehicle-status.enum.js';
import { MaintenanceService } from '../../maintenance/maintenance.service.js';
import { Maintenance } from '../../maintenance/entities/maintenance.entity.js';
import { MaintenanceTypeEnum } from '../../maintenance/enum/maintenance-type.enum.js';
import { MaintenanceStatusEnum } from '../../maintenance/enum/maintenance-status.enum.js';

// Looks up an existing row by a unique business key before creating one through the real
// service — this is what makes running `npm run seed` twice a no-op instead of a duplicate.
async function ensure<T extends ObjectLiteral>(
  repository: Repository<T>,
  where: FindOptionsWhere<T>,
  create: () => Promise<T>,
): Promise<T> {
  const existing = await repository.findOneBy(where);
  if (existing) {
    console.log(`  already exists, skipping: ${JSON.stringify(where)}`);
    return existing;
  }
  return create();
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userService = app.get(UserService);
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
  const mechanicService = app.get(MechanicService);
  const mechanicRepository = app.get<Repository<Mechanic>>(getRepositoryToken(Mechanic));
  const workshopService = app.get(WorkshopService);
  const workshopRepository = app.get<Repository<Workshop>>(getRepositoryToken(Workshop));
  const vehicleService = app.get(VehicleService);
  const vehicleRepository = app.get<Repository<Vehicle>>(getRepositoryToken(Vehicle));
  const maintenanceService = app.get(MaintenanceService);
  const maintenanceRepository = app.get<Repository<Maintenance>>(getRepositoryToken(Maintenance));

  console.log('Seeding users...');
  const admin = await ensure(userRepository, { email: 'admin@fleetcore.com' }, () =>
    userService.create({
      email: 'admin@fleetcore.com',
      firstname: 'Ana',
      lastname: 'Administradora',
      password: 'Admin123!',
      role: RoleEnum.ADMIN,
      isActive: true,
    }),
  );
  const technician1 = await ensure(userRepository, { email: 'carlos.perez@fleetcore.com' }, () =>
    userService.create({
      email: 'carlos.perez@fleetcore.com',
      firstname: 'Carlos',
      lastname: 'Pérez',
      password: 'Tecnico123!',
      role: RoleEnum.TECHNICIAN,
      isActive: true,
    }),
  );
  const technician2 = await ensure(userRepository, { email: 'laura.gomez@fleetcore.com' }, () =>
    userService.create({
      email: 'laura.gomez@fleetcore.com',
      firstname: 'Laura',
      lastname: 'Gómez',
      password: 'Tecnico123!',
      role: RoleEnum.TECHNICIAN,
      isActive: true,
    }),
  );

  console.log('Seeding workshops...');
  const workshopNorte = await ensure(workshopRepository, { name: 'Taller Norte' }, () =>
    workshopService.create({ name: 'Taller Norte', address: 'Cra 45 # 10-20' }),
  );
  const workshopSur = await ensure(workshopRepository, { name: 'Taller Sur' }, () =>
    workshopService.create({ name: 'Taller Sur', address: 'Cra 12 # 30-40' }),
  );
  if (workshopSur.status !== WorkshopStatusEnum.INACTIVE) {
    await workshopService.setStatus(workshopSur.id, WorkshopStatusEnum.INACTIVE);
  }

  console.log('Seeding mechanics...');
  const mechanicCarlos = await ensure(
    mechanicRepository,
    { email: 'carlos.perez@fleetcore.com' },
    () =>
      mechanicService.create({
        name: 'Carlos Pérez',
        email: 'carlos.perez@fleetcore.com',
        specialty: 'Motor',
        userId: technician1.id,
      }),
  );
  const mechanicLaura = await ensure(
    mechanicRepository,
    { email: 'laura.gomez@fleetcore.com' },
    () =>
      mechanicService.create({
        name: 'Laura Gómez',
        email: 'laura.gomez@fleetcore.com',
        specialty: 'Frenos',
        userId: technician2.id,
      }),
  );
  const mechanicInactive = await ensure(
    mechanicRepository,
    { email: 'jorge.ramirez@fleetcore.com' },
    () =>
      mechanicService.create({
        name: 'Jorge Ramírez',
        email: 'jorge.ramirez@fleetcore.com',
        specialty: 'Eléctrico',
      }),
  );
  if (mechanicInactive.status !== MechanicStatusEnum.INACTIVE) {
    await mechanicService.setStatus(mechanicInactive.id, MechanicStatusEnum.INACTIVE);
  }

  console.log('Seeding vehicles...');
  const vehicleAvailable1 = await ensure(vehicleRepository, { plate: 'ABC123' }, () =>
    vehicleService.create({
      plate: 'ABC123',
      brand: 'Chevrolet',
      model: 'NPR',
      year: 2020,
      mileage: 45000,
    }),
  );
  await ensure(vehicleRepository, { plate: 'DEF456' }, () =>
    vehicleService.create({
      plate: 'DEF456',
      brand: 'Hino',
      model: '300',
      year: 2021,
      mileage: 30000,
    }),
  );
  const vehicleInMaintenance = await ensure(vehicleRepository, { plate: 'GHI789' }, () =>
    vehicleService.create({
      plate: 'GHI789',
      brand: 'Isuzu',
      model: 'FTR',
      year: 2019,
      mileage: 62000,
    }),
  );
  const vehicleInactive = await ensure(vehicleRepository, { plate: 'JKL012' }, () =>
    vehicleService.create({
      plate: 'JKL012',
      brand: 'Ford',
      model: 'F350',
      year: 2015,
      mileage: 120000,
    }),
  );
  if (vehicleInactive.status !== VehicleStatusEnum.INACTIVE) {
    await vehicleService.setStatus(vehicleInactive.id, VehicleStatusEnum.INACTIVE);
  }

  console.log('Seeding maintenances...');
  const adminIdentity = { id: admin.id, email: admin.email, role: admin.role };

  // Drives a maintenance to IN_PROGRESS through the real status-transition flow, so the
  // vehicle genuinely ends up IN_MAINTENANCE (not just set directly on the row).
  const existingInProgress = await maintenanceRepository.findOneBy({
    vehicleId: vehicleInMaintenance.id,
    status: MaintenanceStatusEnum.IN_PROGRESS,
  });
  if (!existingInProgress) {
    const scheduledAt = new Date();
    scheduledAt.setHours(scheduledAt.getHours() + 1);
    const created = await maintenanceService.create({
      vehicleId: vehicleInMaintenance.id,
      mechanicId: mechanicCarlos.id,
      workshopId: workshopNorte.id,
      type: MaintenanceTypeEnum.CORRECTIVE,
      description: 'Revisión de frenos y suspensión',
      mileage: vehicleInMaintenance.mileage,
      scheduledAt: scheduledAt.toISOString(),
    });
    await maintenanceService.updateStatus(
      created.id,
      { status: MaintenanceStatusEnum.IN_PROGRESS },
      adminIdentity,
    );
  }

  // One full SCHEDULED -> IN_PROGRESS -> COMPLETED cycle, so a vehicle has real history to query.
  const existingCompleted = await maintenanceRepository.findOneBy({
    vehicleId: vehicleAvailable1.id,
    status: MaintenanceStatusEnum.COMPLETED,
  });
  if (!existingCompleted) {
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() - 7);
    const created = await maintenanceService.create({
      vehicleId: vehicleAvailable1.id,
      mechanicId: mechanicLaura.id,
      workshopId: workshopNorte.id,
      type: MaintenanceTypeEnum.PREVENTIVE,
      description: 'Cambio de aceite y filtros',
      mileage: vehicleAvailable1.mileage,
      scheduledAt: scheduledAt.toISOString(),
    });
    await maintenanceService.updateStatus(
      created.id,
      { status: MaintenanceStatusEnum.IN_PROGRESS },
      adminIdentity,
    );
    await maintenanceService.updateStatus(
      created.id,
      {
        status: MaintenanceStatusEnum.COMPLETED,
        workPerformed: 'Cambio de aceite y filtros realizado sin novedad',
        finalCost: 350000,
        finalMileage: vehicleAvailable1.mileage + 500,
      },
      adminIdentity,
    );
  }

  console.log('Seed completed.');
  await app.close();
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
