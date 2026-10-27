import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

// Alternate auth scheme for external-integration endpoints: validates a pre-shared key from the
// x-api-key header against the comma-separated API_KEYS env var, instead of a JWT.
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.header('x-api-key');
    const validKeys = this.configService.get<string[]>('apiKeys') ?? [];

    if (!apiKey || !validKeys.includes(apiKey)) {
      throw new UnauthorizedException('Missing or invalid API key');
    }
    return true;
  }
}
