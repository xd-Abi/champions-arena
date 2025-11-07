import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { NotificationType } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    // Clean up between tests
    service['notifications'].clear();
    service['subscriptions'].clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create a notification with all fields', async () => {
      const dto: CreateNotificationDto = {
        userId: 'user-123',
        type: NotificationType.NEW_FOLLOWER,
        content: 'Max Mustermann folgt dir jetzt',
        metadata: {
          fromUserId: 'user-456',
          fromUsername: 'max_mustermann',
        },
      };

      const notification = await service.createNotification(dto);

      expect(notification).toBeDefined();
      expect(notification.id).toBeDefined();
      expect(notification.userId).toBe('user-123');
      expect(notification.type).toBe(NotificationType.NEW_FOLLOWER);
      expect(notification.content).toBe('Max Mustermann folgt dir jetzt');
      expect(notification.metadata?.fromUserId).toBe('user-456');
      expect(notification.isRead).toBe(false);
      expect(notification.createdAt).toBeInstanceOf(Date);
    });

    it('should create notification without metadata', async () => {
      const dto: CreateNotificationDto = {
        userId: 'user-123',
        type: NotificationType.LIKE,
        content: 'Jemand hat deinen Tweet geliked',
      };

      const notification = await service.createNotification(dto);

      expect(notification.metadata).toBeUndefined();
    });

    it('should store notification in memory', async () => {
      const dto: CreateNotificationDto = {
        userId: 'user-123',
        type: NotificationType.COMMENT,
        content: 'Neuer Kommentar',
      };

      await service.createNotification(dto);

      const notifications = await service.getAllNotifications('user-123');
      expect(notifications).toHaveLength(1);
    });

    it('should trigger notification stream for user', (done) => {
      const stream = service.getNotificationStream('user-123');
      
      stream.subscribe((notification) => {
        expect(notification.type).toBe(NotificationType.MENTION);
        expect(notification.userId).toBe('user-123');
        done();
      });

      // Create notification after subscription
      setTimeout(() => {
        service.createNotification({
          userId: 'user-123',
          type: NotificationType.MENTION,
          content: 'Du wurdest erwähnt',
        });
      }, 10);
    });
  });

  describe('getAllNotifications', () => {
    it('should return empty array for user without notifications', async () => {
      const notifications = await service.getAllNotifications('user-123');
      expect(notifications).toEqual([]);
    });

    it('should return all notifications for user', async () => {
      await service.createNotification({
        userId: 'user-123',
        type: NotificationType.LIKE,
        content: 'Like 1',
      });
      await service.createNotification({
        userId: 'user-123',
        type: NotificationType.LIKE,
        content: 'Like 2',
      });
      await service.createNotification({
        userId: 'user-456',
        type: NotificationType.LIKE,
        content: 'Like 3',
      });

      const notifications = await service.getAllNotifications('user-123');
      expect(notifications).toHaveLength(2);
    });

    it('should return notifications sorted by createdAt descending', async () => {
      const notif1 = await service.createNotification({
        userId: 'user-123',
        type: NotificationType.LIKE,
        content: 'First',
      });

      // Wait to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const notif2 = await service.createNotification({
        userId: 'user-123',
        type: NotificationType.COMMENT,
        content: 'Second',
      });

      const notifications = await service.getAllNotifications('user-123');
      expect(notifications[0].id).toBe(notif2.id); // Newest first
      expect(notifications[1].id).toBe(notif1.id);
    });

    it('should not return notifications of other users', async () => {
      await service.createNotification({
        userId: 'user-123',
        type: NotificationType.LIKE,
        content: 'User 123',
      });
      await service.createNotification({
        userId: 'user-456',
        type: NotificationType.LIKE,
        content: 'User 456',
      });

      const notifications = await service.getAllNotifications('user-123');
      expect(notifications).toHaveLength(1);
      expect(notifications[0].userId).toBe('user-123');
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 10; i++) {
        await service.createNotification({
          userId: 'user-123',
          type: NotificationType.LIKE,
          content: `Notification ${i}`,
        });
      }

      const notifications = await service.getAllNotifications('user-123', 5);
      expect(notifications).toHaveLength(5);
    });
  });

  describe('getUnreadNotifications', () => {
    it('should return only unread notifications', async () => {
      const notif1 = await service.createNotification({
        userId: 'user-123',
        type: NotificationType.LIKE,
        content: 'Like 1',
      });
      await service.createNotification({
        userId: 'user-123',
        type: NotificationType.LIKE,
        content: 'Like 2',
      });

      await service.markAsRead('user-123', [notif1.id]);

      const unread = await service.getUnreadNotifications('user-123');
      expect(unread).toHaveLength(1);
      expect(unread[0].content).toBe('Like 2');
    });
  });

  describe('getUnreadCount', () => {
    it('should return 0 for user without notifications', async () => {
      const count = await service.getUnreadCount('user-123');
      expect(count).toBe(0);
    });

    it('should count only unread notifications', async () => {
      const notif1 = await service.createNotification({
        userId: 'user-123',
        type: NotificationType.LIKE,
        content: 'Like 1',
      });
      await service.createNotification({
        userId: 'user-123',
        type: NotificationType.LIKE,
        content: 'Like 2',
      });
      await service.createNotification({
        userId: 'user-123',
        type: NotificationType.LIKE,
        content: 'Like 3',
      });

      // Mark one as read
      await service.markAsRead('user-123', [notif1.id]);

      const count = await service.getUnreadCount('user-123');
      expect(count).toBe(2);
    });

    it('should return 0 after all notifications are read', async () => {
      await service.createNotification({
        userId: 'user-123',
        type: NotificationType.LIKE,
        content: 'Like 1',
      });
      await service.createNotification({
        userId: 'user-123',
        type: NotificationType.LIKE,
        content: 'Like 2',
      });

      await service.markAllAsRead('user-123');

      const count = await service.getUnreadCount('user-123');
      expect(count).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notification = await service.createNotification({
        userId: 'user-123',
        type: NotificationType.LIKE,
        content: 'Like',
      });

      expect(notification.isRead).toBe(false);

      await service.markAsRead('user-123', [notification.id]);

      const notifications = await service.getAllNotifications('user-123');
      expect(notifications[0].isRead).toBe(true);
    });

    it('should mark multiple notifications as read', async () => {
      const notif1 = await service.createNotification({
        userId: 'user-123',
        type: NotificationType.LIKE,
        content: 'Like 1',
      });
      const notif2 = await service.createNotification({
        userId: 'user-123',
        type: NotificationType.LIKE,
        content: 'Like 2',
      });

      await service.markAsRead('user-123', [notif1.id, notif2.id]);

      const count = await service.getUnreadCount('user-123');
      expect(count).toBe(0);
    });

    it('should not affect other notifications', async () => {
      const notif1 = await service.createNotification({
        userId: 'user-123',
        type: NotificationType.LIKE,
        content: 'Like 1',
      });
      const notif2 = await service.createNotification({
        userId: 'user-123',
        type: NotificationType.LIKE,
        content: 'Like 2',
      });

      await service.markAsRead('user-123', [notif1.id]);

      const notifications = await service.getAllNotifications('user-123');
      const readNotif = notifications.find((n) => n.id === notif1.id);
      const unreadNotif = notifications.find((n) => n.id === notif2.id);

      expect(readNotif?.isRead).toBe(true);
      expect(unreadNotif?.isRead).toBe(false);
    });

    it('should handle non-existent notification gracefully', async () => {
      await expect(
        service.markAsRead('user-123', ['non-existent-id']),
      ).resolves.not.toThrow();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      await service.createNotification({
        userId: 'user-123',
        type: NotificationType.LIKE,
        content: 'Like 1',
      });
      await service.createNotification({
        userId: 'user-123',
        type: NotificationType.LIKE,
        content: 'Like 2',
      });
      await service.createNotification({
        userId: 'user-123',
        type: NotificationType.LIKE,
        content: 'Like 3',
      });

      await service.markAllAsRead('user-123');

      const count = await service.getUnreadCount('user-123');
      expect(count).toBe(0);
    });

    it('should not affect notifications of other users', async () => {
      await service.createNotification({
        userId: 'user-123',
        type: NotificationType.LIKE,
        content: 'Like 1',
      });
      await service.createNotification({
        userId: 'user-456',
        type: NotificationType.LIKE,
        content: 'Like 2',
      });

      await service.markAllAsRead('user-123');

      const countUser123 = await service.getUnreadCount('user-123');
      const countUser456 = await service.getUnreadCount('user-456');

      expect(countUser123).toBe(0);
      expect(countUser456).toBe(1);
    });

    it('should work with empty notification list', async () => {
      await expect(service.markAllAsRead('user-123')).resolves.not.toThrow();
    });
  });

  describe('subscribe/unsubscribe', () => {
    it('should store subscription', async () => {
      await service.subscribe('user-123', 'device-token-123', 'ios');

      expect(service.isSubscribed('user-123')).toBe(true);
    });

    it('should remove subscription', async () => {
      await service.subscribe('user-123', 'device-token-123', 'ios');
      await service.unsubscribe('user-123');

      expect(service.isSubscribed('user-123')).toBe(false);
    });

    it('should handle unsubscribe for non-existent subscription', async () => {
      await expect(service.unsubscribe('user-123')).resolves.not.toThrow();
    });
  });

  describe('getNotificationStream', () => {
    it('should create SSE stream observable', () => {
      const stream = service.getNotificationStream('user-123');
      expect(stream).toBeDefined();
    });

    it('should emit events to subscribed users', (done) => {
      const stream = service.getNotificationStream('user-123');
      
      stream.subscribe((notification) => {
        expect(notification).toBeDefined();
        expect(notification.content).toBe('Test notification');
        done();
      });

      setTimeout(() => {
        service.createNotification({
          userId: 'user-123',
          type: NotificationType.LIKE,
          content: 'Test notification',
        });
      }, 10);
    });

    it('should not emit events to other users', (done) => {
      let user123Received = false;
      let user456Received = false;

      const stream123 = service.getNotificationStream('user-123');
      const stream456 = service.getNotificationStream('user-456');

      stream123.subscribe(() => {
        user123Received = true;
      });

      stream456.subscribe(() => {
        user456Received = true;
      });

      setTimeout(() => {
        service.createNotification({
          userId: 'user-123',
          type: NotificationType.LIKE,
          content: 'For user 123',
        });

        setTimeout(() => {
          expect(user123Received).toBe(true);
          expect(user456Received).toBe(false);
          done();
        }, 20);
      }, 10);
    });
  });

  describe('Event Handlers', () => {
    describe('handleNewFollower', () => {
      it('should create follower notification', async () => {
        await service.handleNewFollower('user-123', 'user-456', 'max_mustermann');

        const notifications = await service.getAllNotifications('user-123');
        expect(notifications).toHaveLength(1);
        expect(notifications[0].type).toBe(NotificationType.NEW_FOLLOWER);
        expect(notifications[0].content).toContain('max_mustermann');
        expect(notifications[0].metadata?.fromUserId).toBe('user-456');
      });
    });

    describe('handleLike', () => {
      it('should create like notification', async () => {
        await service.handleLike('user-123', 'user-456', 'liker_user', 'tweet-123');

        const notifications = await service.getAllNotifications('user-123');
        expect(notifications).toHaveLength(1);
        expect(notifications[0].type).toBe(NotificationType.LIKE);
        expect(notifications[0].metadata?.tweetId).toBe('tweet-123');
      });
    });

    describe('handleComment', () => {
      it('should create comment notification', async () => {
        await service.handleComment(
          'user-123',
          'user-456',
          'commenter_user',
          'tweet-123',
          'comment-123',
        );

        const notifications = await service.getAllNotifications('user-123');
        expect(notifications).toHaveLength(1);
        expect(notifications[0].type).toBe(NotificationType.COMMENT);
        expect(notifications[0].metadata?.commentId).toBe('comment-123');
      });
    });

    describe('handleMention', () => {
      it('should create mention notification', async () => {
        await service.handleMention('user-123', 'user-456', 'mentioner_user', 'tweet-123');

        const notifications = await service.getAllNotifications('user-123');
        expect(notifications).toHaveLength(1);
        expect(notifications[0].type).toBe(NotificationType.MENTION);
        expect(notifications[0].metadata?.tweetId).toBe('tweet-123');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long content', async () => {
      const longContent = 'A'.repeat(10000);
      const notification = await service.createNotification({
        userId: 'user-123',
        type: NotificationType.COMMENT,
        content: longContent,
      });

      expect(notification.content).toBe(longContent);
    });

    it('should handle special characters in content', async () => {
      const specialContent = '<script>alert("XSS")</script> & " \' \\';
      const notification = await service.createNotification({
        userId: 'user-123',
        type: NotificationType.MENTION,
        content: specialContent,
      });

      expect(notification.content).toBe(specialContent);
    });

    it('should handle creating many notifications', async () => {
      for (let i = 0; i < 100; i++) {
        await service.createNotification({
          userId: 'user-123',
          type: NotificationType.LIKE,
          content: `Notification ${i}`,
        });
      }

      const notifications = await service.getAllNotifications('user-123');
      expect(notifications).toHaveLength(100);
    });

    it('should handle multiple users with many notifications', async () => {
      const promises: Promise<any>[] = [];
      for (let userId = 0; userId < 10; userId++) {
        for (let i = 0; i < 5; i++) {
          promises.push(
            service.createNotification({
              userId: `user-${userId}`,
              type: NotificationType.LIKE,
              content: `Notification ${i}`,
            }),
          );
        }
      }

      await Promise.all(promises);

      // Each user should have exactly 5 notifications
      for (let userId = 0; userId < 10; userId++) {
        const notifications = await service.getAllNotifications(`user-${userId}`);
        expect(notifications).toHaveLength(5);
      }
    });
  });
});
