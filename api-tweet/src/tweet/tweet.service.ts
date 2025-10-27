import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Tweet, Comment } from '../entities/tweet.entity';
import { CreateTweetDto } from '../dto/create-tweet.dto';
import { UpdateTweetDto } from '../dto/update-tweet.dto';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TweetService {
  private tweets: Map<string, Tweet> = new Map();

  createTweet(authorId: string, createTweetDto: CreateTweetDto): Tweet {
    const tweet = new Tweet({
      id: uuidv4(),
      authorId,
      content: createTweetDto.content,
      createdAt: new Date(),
      updatedAt: new Date(),
      likes: [],
      comments: [],
    });

    this.tweets.set(tweet.id, tweet);
    return tweet;
  }

  getFeed(skip: number = 0, take: number = 20): Tweet[] {
    const allTweets = Array.from(this.tweets.values());
    // Sortiere nach Erstellungsdatum (neueste zuerst)
    const sortedTweets = allTweets.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    return sortedTweets.slice(skip, skip + take);
  }

  getTweetById(tweetId: string): Tweet {
    const tweet = this.tweets.get(tweetId);
    if (!tweet) {
      throw new NotFoundException(`Tweet mit ID ${tweetId} nicht gefunden`);
    }
    return tweet;
  }

  /**
   * Aktualisiert einen Tweet (nur vom Autor)
   */
  updateTweet(
    tweetId: string,
    userId: string,
    updateTweetDto: UpdateTweetDto,
  ): Tweet {
    const tweet = this.getTweetById(tweetId);

    if (tweet.authorId !== userId) {
      throw new ForbiddenException(
        'Du kannst nur deine eigenen Tweets bearbeiten',
      );
    }

    tweet.content = updateTweetDto.content;
    tweet.updatedAt = new Date();

    this.tweets.set(tweetId, tweet);
    return tweet;
  }

  deleteTweet(tweetId: string, userId: string): void {
    const tweet = this.getTweetById(tweetId);

    if (tweet.authorId !== userId) {
      throw new ForbiddenException(
        'Du kannst nur deine eigenen Tweets löschen',
      );
    }

    this.tweets.delete(tweetId);
  }

  likeTweet(tweetId: string, userId: string): Tweet {
    const tweet = this.getTweetById(tweetId);

    if (!tweet.likes.includes(userId)) {
      tweet.likes.push(userId);
      this.tweets.set(tweetId, tweet);
    }

    return tweet;
  }

  unlikeTweet(tweetId: string, userId: string): Tweet {
    const tweet = this.getTweetById(tweetId);

    tweet.likes = tweet.likes.filter((id) => id !== userId);
    this.tweets.set(tweetId, tweet);

    return tweet;
  }

  createComment(
    tweetId: string,
    userId: string,
    createCommentDto: CreateCommentDto,
  ): Comment {
    const tweet = this.getTweetById(tweetId);

    const comment = new Comment({
      id: uuidv4(),
      tweetId,
      authorId: userId,
      content: createCommentDto.content,
      createdAt: new Date(),
    });

    tweet.comments.push(comment);
    this.tweets.set(tweetId, tweet);

    return comment;
  }

  getComments(tweetId: string): Comment[] {
    const tweet = this.getTweetById(tweetId);
    return tweet.comments;
  }

  deleteComment(tweetId: string, commentId: string, userId: string): void {
    const tweet = this.getTweetById(tweetId);

    const comment = tweet.comments.find((c) => c.id === commentId);
    if (!comment) {
      throw new NotFoundException(
        `Kommentar mit ID ${commentId} nicht gefunden`,
      );
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException(
        'Du kannst nur deine eigenen Kommentare löschen',
      );
    }

    tweet.comments = tweet.comments.filter((c) => c.id !== commentId);
    this.tweets.set(tweetId, tweet);
  }

  getTweetsByUser(userId: string): Tweet[] {
    return Array.from(this.tweets.values())
      .filter((tweet) => tweet.authorId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
