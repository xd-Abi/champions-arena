import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS aktivieren für Frontend-Zugriff
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Validierung für DTOs aktivieren
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Globales Präfix für alle Routen
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3002;
  await app.listen(port);

  console.log(`🚀 Tweet Service läuft auf Port ${port}`);
  console.log(`📡 API verfügbar unter: http://localhost:${port}/api/tweets`);
}
bootstrap();
