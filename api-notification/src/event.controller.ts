import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationService } from './notification.service';
import {
  NewFollowerEvent,
  TweetLikedEvent,
  TweetCommentedEvent,
  UserMentionedEvent,
} from './events/notification.events';

/**
 * Event Controller für interne Service-zu-Service Kommunikation
 * Diese Endpoints werden von anderen Microservices aufgerufen
 */
@Controller('events')
export class EventController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * POST /events/follower
   * Wird vom User Profile Service aufgerufen wenn jemand einem User folgt
   */
  @Post('follower')
  @HttpCode(HttpStatus.ACCEPTED)
  async handleNewFollower(@Body() event: NewFollowerEvent) {
    await this.notificationService.handleNewFollower(
      event.userId,
      event.followerId,
      event.followerUsername,
    );
    return { success: true };
  }

  /**
   * POST /events/like
   * Wird vom Tweet Service aufgerufen wenn ein Tweet geliked wird
   */
  @Post('like')
  @HttpCode(HttpStatus.ACCEPTED)
  async handleLike(@Body() event: TweetLikedEvent) {
    await this.notificationService.handleLike(
      event.tweetAuthorId,
      event.likerId,
      event.likerUsername,
      event.tweetId,
    );
    return { success: true };
  }

  /**
   * POST /events/comment
   * Wird vom Tweet Service aufgerufen wenn ein Tweet kommentiert wird
   */
  @Post('comment')
  @HttpCode(HttpStatus.ACCEPTED)
  async handleComment(@Body() event: TweetCommentedEvent) {
    await this.notificationService.handleComment(
      event.tweetAuthorId,
      event.commenterId,
      event.commenterUsername,
      event.tweetId,
      event.commentId,
    );
    return { success: true };
  }

  /**
   * POST /events/mention
   * Wird vom Tweet Service aufgerufen wenn ein User in einem Tweet erwähnt wird
   */
  @Post('mention')
  @HttpCode(HttpStatus.ACCEPTED)
  async handleMention(@Body() event: UserMentionedEvent) {
    await this.notificationService.handleMention(
      event.mentionedUserId,
      event.mentionerId,
      event.mentionerUsername,
      event.tweetId,
    );
    return { success: true };
  }
}
