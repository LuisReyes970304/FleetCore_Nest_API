import { RoleEnum } from '../../user/enum/roleEnum.js';

export interface RequestUser {
  id: number;
  email: string;
  role: RoleEnum;
}
