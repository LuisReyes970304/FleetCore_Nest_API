import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('FleetCore API')
    .setDescription(
      [
        'REST API for managing a vehicle fleet maintenance lifecycle: vehicles, mechanics, ',
        'workshops and the maintenances that tie them together.',
        '',
        '## Response envelope',
        'Every successful response is wrapped as `{ success: true, statusCode, data, timestamp }`. ',
        'Every error (validation, auth, not-found, business conflict) is normalized to ',
        '`{ success: false, statusCode, message, path, timestamp }` and never leaks a raw 500 for ',
        'an expected failure.',
        '',
        '## Status code convention',
        '- `400` Bad Request — invalid input (fails validation, or a business-rule precondition ',
        'such as mileage going backwards).',
        '- `401` Unauthorized — missing/invalid JWT or `x-api-key`.',
        '- `403` Forbidden — authenticated, but not allowed to perform this action (wrong role, ',
        "or a TECHNICIAN touching another mechanic's maintenance).",
        '- `404` Not Found — the resource does not exist.',
        '- `409` Conflict — valid input that conflicts with the current state (duplicate plate/ ',
        'email, inactive entity, invalid status transition, double-booking).',
        '',
        '## Authentication',
        "Call `POST /auth/login` to get a JWT, then click **Authorize** below and paste it into ",
        'the **bearer** field. Every route requires a valid JWT by default; `/auth/register`, ',
        '`/auth/login` and the external-integration vehicle endpoint are the only exceptions. The ',
        'external-integration endpoint (`GET /vehicle/external/:plate`) instead authenticates via ',
        'the **x-api-key** header, meant for third-party partner systems rather than the web/admin ',
        'client.',
        '',
        '## Roles',
        '- **ADMIN**: manages vehicles, mechanics, workshops and maintenances, and can query full ',
        'histories.',
        '- **TECHNICIAN**: sees only the maintenances assigned to them and can update the status ',
        'of their own maintenances.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addTag('Auth', 'Registration and login. Issues the JWT used by every other endpoint.')
    .addTag('Vehicle', 'Fleet vehicles: CRUD, soft-delete (deactivate/reactivate), and the external partner-integration lookup.')
    .addTag('Mechanic', 'Mechanics who perform maintenances, optionally linked to a login account.')
    .addTag('Workshop', 'Physical locations where maintenances take place.')
    .addTag('Maintenance', 'The maintenance lifecycle: scheduling, status transitions, and the vehicle/mechanic business rules around it.')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'JWT returned by POST /auth/login' })
    .addApiKey(
      { type: 'apiKey', name: 'x-api-key', in: 'header', description: 'Partner key for GET /vehicle/external/:plate, checked against the comma-separated API_KEYS env var' },
      'x-api-key',
    )
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API is running in http://localhost:${port}`);
  console.log(`Doc in swagger is available in http://localhost:${port}/docs`)
}
await bootstrap();
