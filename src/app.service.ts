import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getGreet(): string {
    return 'Welcome to FleetCore API!';
  }
}
