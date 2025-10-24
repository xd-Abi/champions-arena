import { NotificationType } from '../entities/notification.entity';

/**
 * Event: Neuer Follower
 */
export class NewFollowerEvent {
  userId: string; // Der User der gefolgt wird
  followerId: string;
  followerUsername: string;
}

/**
 * Event: Tweet wurde geliked
 */
export class TweetLikedEvent {
  tweetAuthorId: string; // Der Autor des Tweets
  likerId: string;
  likerUsername: string;
  tweetId: string;
}

/**
 * Event: Tweet wurde kommentiert
 */
export class TweetCommentedEvent {
  tweetAuthorId: string; // Der Autor des Tweets
  commenterId: string;
  commenterUsername: string;
  tweetId: string;
  commentId: string;
}

/**
 * Event: User wurde in Tweet erwähnt
 */
export class UserMentionedEvent {
  mentionedUserId: string; // Der erwähnte User
  mentionerId: string;
  mentionerUsername: string;
  tweetId: string;
}
