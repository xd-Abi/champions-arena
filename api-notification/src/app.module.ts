import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { EventController } from './event.controller';
import { NotificationService } from './notification.service';

@Module({
  imports: [],
  controllers: [NotificationController, EventController],
  providers: [NotificationService],
})
export class AppModule {}
