import { RoleEnum } from '../../auth/enum/role.enum.js';

export interface RequestUser {
  id: number;
  email: string;
  role: RoleEnum;
}
