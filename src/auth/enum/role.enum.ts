import { Reflector } from '@nestjs/core';

export enum RoleEnum {
  ADMIN = 'ADMIN',
  TECHNICIAN = 'TECHNICIAN',
}

export const Roles = Reflector.createDecorator<RoleEnum[]>();
