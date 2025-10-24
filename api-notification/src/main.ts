import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS aktivieren für Frontend-Zugriff
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });
  
  // Global Prefix für alle Routen (optional)
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT ?? 3003;
  await app.listen(port);
  
  console.log(`🚀 Notification Service läuft auf Port ${port}`);
  console.log(`📡 SSE Stream verfügbar unter: http://localhost:${port}/api/notifications/stream`);
}
bootstrap();
