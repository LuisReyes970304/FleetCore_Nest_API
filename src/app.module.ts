import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UserModule } from './user/user.module.js';
import { AuthModule } from './auth/auth.module.js';
import { WorkshopModule } from './workshop/workshop.module.js';
import { MechanicModule } from './mechanic/mechanic.module.js';
import { VehicleModule } from './vehicle/vehicle.module.js';
import { MaintenanceModule } from './maintenance/maintenance.module.js';
import configuration from './config/database.config.js';
import jwtConfig from './config/jwt.config.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, jwtConfig],
    }),
  TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        autoLoadEntities: true,
        synchronize: true,
      }),
  }),
    UserModule,
    AuthModule,
    WorkshopModule,
    MechanicModule,
    VehicleModule,
    MaintenanceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // JwtAuthGuard must run before RolesGuard: it populates request.user, which RolesGuard reads.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
