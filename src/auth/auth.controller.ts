import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { Public } from '../common/decorators/public.decorator.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Public endpoint — no JWT required. Creates an ADMIN or TECHNICIAN account, hashes the ' +
      'password with bcrypt, and returns a JWT plus the created user, just like login.',
  })
  @ApiCreatedResponse({ description: 'User created; access token and user profile returned.' })
  @ApiBadRequestResponse({ description: 'Validation failed (missing/invalid field).' })
  @ApiConflictResponse({ description: 'Email is already registered (including a soft-deleted account).' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({
    summary: 'Log in',
    description:
      'Public endpoint — no JWT required. Verifies email/password and returns a JWT to use as a ' +
      'bearer token on every other request.',
  })
  @ApiOkResponse({ description: 'Credentials valid; access token and user profile returned.' })
  @ApiBadRequestResponse({ description: 'Validation failed (missing/invalid field).' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials, or the account was deactivated.' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
