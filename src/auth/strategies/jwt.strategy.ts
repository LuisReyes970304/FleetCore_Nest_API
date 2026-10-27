import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../user.service.js';
import { RequestUser } from '../../common/types/request-user.type.js';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
    });
  }

  // Re-fetches the user on every request instead of trusting the JWT payload, so a deactivated
  // user's still-unexpired token is rejected immediately (findOne only returns active users).
  async validate(payload: JwtPayload): Promise<RequestUser> {
    try {
      const user = await this.userService.findOne(payload.sub);
      return { id: user.id, email: user.email, role: user.role };
    } catch {
      throw new UnauthorizedException('User no longer exists or is inactive');
    }
  }
}
