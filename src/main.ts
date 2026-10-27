import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('FleetCore')
    .setDescription('FleetCore api doc')
    .setVersion('1.0')
    .addTag('App')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API is running in http://localhost:${port}`);
  console.log(`Doc in swagger is available in http://localhost:${port}/docs`)
}
await bootstrap();
