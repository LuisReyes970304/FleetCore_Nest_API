import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { UserService } from './user.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.secret'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- env-sourced duration
        // string (e.g. "1h") doesn't statically match @nestjs/jwt's branded StringValue type.
        signOptions: { expiresIn: config.getOrThrow<string>('jwt.expiresIn') as any },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserService, JwtStrategy],
  // UserService is exported for MechanicModule (validates a user before linking Mechanic.userId)
  // and for the seeder (app.get(UserService)).
  exports: [UserService],
})
export class AuthModule {}
