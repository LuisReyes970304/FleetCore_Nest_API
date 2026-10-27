import { Reflector } from '@nestjs/core';

export const Public = Reflector.createDecorator<boolean, boolean>({
  transform: () => true,
});
