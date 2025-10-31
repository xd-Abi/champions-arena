import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Body, 
  HttpCode,
  HttpStatus,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { NotificationService } from './notification.service';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { Notification } from './entities/notification.entity';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CurrentUser } from './auth/current-user.decorator';

// Interface für SSE-Nachrichten
interface MessageEvent {
  data: string;
  id?: string;
  type?: string;
  retry?: number;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * GET /notifications
   * Liste aller Benachrichtigungen (optional: nur ungelesene)
   */
  @Get()
  async getNotifications(
    @CurrentUser() userId: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    if (unreadOnly === 'true') {
      return await this.notificationService.getUnreadNotifications(userId);
    }

    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return await this.notificationService.getAllNotifications(userId, limitNum);
  }

  /**
   * GET /notifications/count
   * Anzahl der ungelesenen Benachrichtigungen
   */
  @Get('count')
  async getUnreadCount(@CurrentUser() userId: string) {
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  /**
   * POST /notifications/mark-as-read
   * Markiert bestimmte Benachrichtigungen als gelesen
   */
  @Post('mark-as-read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@CurrentUser() userId: string, @Body() dto: MarkAsReadDto) {
    await this.notificationService.markAsRead(userId, dto.notificationIds);
    return { success: true };
  }

  /**
   * POST /notifications/mark-all-read
   * Markiert alle Benachrichtigungen als gelesen
   */
  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() userId: string) {
    await this.notificationService.markAllAsRead(userId);
    return { success: true };
  }

  /**
   * POST /notifications/subscribe
   * Gerät oder WebSocket registrieren (Push)
   */
  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  async subscribe(@CurrentUser() userId: string, @Body() dto: SubscribeDto) {
    await this.notificationService.subscribe(
      userId, 
      dto.deviceToken, 
      dto.platform
    );
    return { success: true, message: 'Successfully subscribed to notifications' };
  }

  /**
   * DELETE /notifications/unsubscribe
   * Registrierung wieder entfernen
   */
  @Delete('unsubscribe')
  @HttpCode(HttpStatus.OK)
  async unsubscribe(@CurrentUser() userId: string) {
    await this.notificationService.unsubscribe(userId);
    return { success: true, message: 'Successfully unsubscribed from notifications' };
  }

  /**
   * GET /notifications/stream
   * Echtzeit-Stream für Benachrichtigungen (Server-Sent Events)
   */
  @Sse('stream')
  streamNotifications(@Query('userId') userId: string): Observable<MessageEvent> {
    // SSE kann nicht mit Authorization Header arbeiten, daher userId als Query Parameter
    // Observable vom Service holen und in SSE-Format umwandeln
    return this.notificationService.getNotificationStream(userId).pipe(
      map((notification: Notification) => ({
        data: JSON.stringify(notification),
        id: notification.id,
        type: 'notification',
      }))
    );
  }
}
