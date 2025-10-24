export enum NotificationType {
  NEW_FOLLOWER = 'NEW_FOLLOWER',
  LIKE = 'LIKE',
  COMMENT = 'COMMENT',
  MENTION = 'MENTION',
}

export class Notification {
  id: string;
  userId: string; // Der Empfänger der Benachrichtigung
  type: NotificationType;
  content: string;
  metadata?: {
    fromUserId?: string; // Wer hat die Aktion ausgeführt
    fromUsername?: string;
    tweetId?: string;
    commentId?: string;
  };
  isRead: boolean;
  createdAt: Date;

  constructor(partial: Partial<Notification>) {
    Object.assign(this, partial);
    this.id = partial.id || this.generateId();
    this.isRead = partial.isRead || false;
    this.createdAt = partial.createdAt || new Date();
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  markAsRead(): void {
    this.isRead = true;
  }
}
