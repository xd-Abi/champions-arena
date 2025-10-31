import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Body, 
  Req, 
  Res, 
  HttpCode,
  HttpStatus,
  Query,
  Sse,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, interval, map } from 'rxjs';
import { NotificationService } from './notification.service';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { Notification } from './entities/notification.entity';

// Interface für SSE-Nachrichten
interface MessageEvent {
  data: string;
  id?: string;
  type?: string;
  retry?: number;
}

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * GET /notifications
   * Liste aller Benachrichtigungen (optional: nur ungelesene)
   */
  @Get()
  async getNotifications(
    @Req() req: Request,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    // In Produktion: userId aus JWT Token extrahieren
    const userId = this.getUserIdFromRequest(req);

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
  async getUnreadCount(@Req() req: Request) {
    const userId = this.getUserIdFromRequest(req);
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  /**
   * POST /notifications/mark-as-read
   * Markiert bestimmte Benachrichtigungen als gelesen
   */
  @Post('mark-as-read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Req() req: Request, @Body() dto: MarkAsReadDto) {
    const userId = this.getUserIdFromRequest(req);
    await this.notificationService.markAsRead(userId, dto.notificationIds);
    return { success: true };
  }

  /**
   * POST /notifications/mark-all-read
   * Markiert alle Benachrichtigungen als gelesen
   */
  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@Req() req: Request) {
    const userId = this.getUserIdFromRequest(req);
    await this.notificationService.markAllAsRead(userId);
    return { success: true };
  }

  /**
   * POST /notifications/subscribe
   * Gerät oder WebSocket registrieren (Push)
   */
  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  async subscribe(@Req() req: Request, @Body() dto: SubscribeDto) {
    const userId = this.getUserIdFromRequest(req);
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
  async unsubscribe(@Req() req: Request) {
    const userId = this.getUserIdFromRequest(req);
    await this.notificationService.unsubscribe(userId);
    return { success: true, message: 'Successfully unsubscribed from notifications' };
  }

  /**
   * GET /notifications/stream
   * Echtzeit-Stream für Benachrichtigungen (Server-Sent Events)
   */
  @Sse('stream')
  streamNotifications(@Req() req: Request): Observable<MessageEvent> {
    const userId = this.getUserIdFromRequest(req);

    // Observable vom Service holen und in SSE-Format umwandeln
    return this.notificationService.getNotificationStream(userId).pipe(
      map((notification: Notification) => ({
        data: JSON.stringify(notification),
        id: notification.id,
        type: 'notification',
      }))
    );
  }

  /**
   * Hilfsmethode: Extrahiert die User-ID aus dem Request
   * In Produktion: JWT Token validieren und User-ID extrahieren
   */
  private getUserIdFromRequest(req: Request): string {
    // Für Entwicklung: User-ID aus Header oder Query-Parameter
    const userId = req.headers['x-user-id'] as string || req.query.userId as string;
    
    if (!userId) {
      // In Produktion würde hier ein UnauthorizedException geworfen
      // throw new UnauthorizedException('User not authenticated');
      return 'demo-user-id'; // Fallback für Entwicklung
    }

    return userId;
  }
}
