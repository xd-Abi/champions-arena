import { Injectable } from '@nestjs/common';
import { Notification, NotificationType } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Injectable()
export class NotificationService {
  // In-Memory Storage (In Produktion: Datenbank verwenden)
  private notifications: Map<string, Notification[]> = new Map();
  
  // Subscriptions für Push-Benachrichtigungen
  private subscriptions: Map<string, { deviceToken?: string; platform?: string }> = new Map();
  
  // Event Stream für SSE
  private notificationStream$ = new Subject<Notification>();

  /**
   * Erstellt eine neue Benachrichtigung
   */
  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const notification = new Notification(dto);

    // Benachrichtigung speichern
    const userNotifications = this.notifications.get(dto.userId) || [];
    userNotifications.push(notification);
    this.notifications.set(dto.userId, userNotifications);

    // Event für SSE-Stream triggern
    this.notificationStream$.next(notification);

    return notification;
  }

  /**
   * Gibt alle ungelesenen Benachrichtigungen für einen User zurück
   */
  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter(n => !n.isRead);
  }

  /**
   * Gibt alle Benachrichtigungen für einen User zurück
   */
  async getAllNotifications(userId: string, limit?: number): Promise<Notification[]> {
    const userNotifications = this.notifications.get(userId) || [];
    const sorted = userNotifications.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
    
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Markiert Benachrichtigungen als gelesen
   */
  async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    const userNotifications = this.notifications.get(userId) || [];
    
    userNotifications.forEach(notification => {
      if (notificationIds.includes(notification.id)) {
        notification.markAsRead();
      }
    });
  }

  /**
   * Markiert alle Benachrichtigungen eines Users als gelesen
   */
  async markAllAsRead(userId: string): Promise<void> {
    const userNotifications = this.notifications.get(userId) || [];
    userNotifications.forEach(notification => notification.markAsRead());
  }

  /**
   * Registriert ein Gerät für Push-Benachrichtigungen
   */
  async subscribe(userId: string, deviceToken?: string, platform?: string): Promise<void> {
    this.subscriptions.set(userId, { deviceToken, platform });
  }

  /**
   * Entfernt die Registrierung eines Geräts
   */
  async unsubscribe(userId: string): Promise<void> {
    this.subscriptions.delete(userId);
  }

  /**
   * Prüft ob ein User subscribed ist
   */
  isSubscribed(userId: string): boolean {
    return this.subscriptions.has(userId);
  }

  /**
   * Gibt einen Observable-Stream für SSE zurück
   */
  getNotificationStream(userId: string): Observable<Notification> {
    return this.notificationStream$.pipe(
      filter(notification => notification.userId === userId)
    );
  }

  /**
   * Gibt die Anzahl der ungelesenen Benachrichtigungen zurück
   */
  async getUnreadCount(userId: string): Promise<number> {
    const unread = await this.getUnreadNotifications(userId);
    return unread.length;
  }

  // ===== Event Handler für andere Services =====

  /**
   * Wird aufgerufen wenn jemand einem User folgt
   */
  async handleNewFollower(userId: string, followerId: string, followerUsername: string): Promise<void> {
    await this.createNotification({
      userId,
      type: NotificationType.NEW_FOLLOWER,
      content: `${followerUsername} folgt dir jetzt`,
      metadata: {
        fromUserId: followerId,
        fromUsername: followerUsername,
      },
    });
  }

  /**
   * Wird aufgerufen wenn jemand einen Tweet liked
   */
  async handleLike(userId: string, likerId: string, likerUsername: string, tweetId: string): Promise<void> {
    await this.createNotification({
      userId,
      type: NotificationType.LIKE,
      content: `${likerUsername} hat deinen Beitrag geliked`,
      metadata: {
        fromUserId: likerId,
        fromUsername: likerUsername,
        tweetId,
      },
    });
  }

  /**
   * Wird aufgerufen wenn jemand einen Tweet kommentiert
   */
  async handleComment(
    userId: string, 
    commenterId: string, 
    commenterUsername: string, 
    tweetId: string,
    commentId: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: NotificationType.COMMENT,
      content: `${commenterUsername} hat deinen Beitrag kommentiert`,
      metadata: {
        fromUserId: commenterId,
        fromUsername: commenterUsername,
        tweetId,
        commentId,
      },
    });
  }

  /**
   * Wird aufgerufen wenn jemand in einem Tweet erwähnt wird
   */
  async handleMention(
    userId: string, 
    mentionerId: string, 
    mentionerUsername: string, 
    tweetId: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: NotificationType.MENTION,
      content: `${mentionerUsername} hat dich in einem Beitrag erwähnt`,
      metadata: {
        fromUserId: mentionerId,
        fromUsername: mentionerUsername,
        tweetId,
      },
    });
  }
}
