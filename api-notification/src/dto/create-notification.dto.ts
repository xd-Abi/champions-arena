import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  userId: string;
  type: NotificationType;
  content: string;
  metadata?: {
    fromUserId?: string;
    fromUsername?: string;
    tweetId?: string;
    commentId?: string;
  };
}
