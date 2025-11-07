import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { EventController } from './event.controller';
import { NotificationService } from './notification.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [NotificationController, EventController],
  providers: [NotificationService],
})
export class AppModule {}
