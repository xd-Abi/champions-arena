import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { EventController } from './event.controller';
import { NotificationService } from './notification.service';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Module({
  imports: [],
  controllers: [NotificationController, EventController],
  providers: [NotificationService, AuthService, JwtAuthGuard],
})
export class AppModule {}
