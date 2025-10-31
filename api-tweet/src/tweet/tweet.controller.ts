import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TweetService } from './tweet.service';
import { CreateTweetDto } from '../dto/create-tweet.dto';
import { UpdateTweetDto } from '../dto/update-tweet.dto';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { AuthGuard } from '../guards/auth.guard';

@Controller('tweets')
@UseGuards(AuthGuard)
export class TweetController {
  constructor(private readonly tweetService: TweetService) {}

  /**
   * POST /tweets
   * Neuen Tweet erstellen
   */
  @Post()
  createTweet(
    @Request() req: { user: { sub: string } },
    @Body() createTweetDto: CreateTweetDto,
  ) {
    const userId = req.user.sub;
    return this.tweetService.createTweet(userId, createTweetDto);
  }

  /**
   * GET /tweets
   * Feed abrufen (mit optionaler Pagination)
   */
  @Get()
  getFeed(@Query('skip') skip?: string, @Query('take') take?: string) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 20;
    return this.tweetService.getFeed(skipNum, takeNum);
  }

  /**
   * GET /tweets/:tweetId
   * Einzelnen Tweet abrufen
   */
  @Get(':tweetId')
  getTweetById(@Param('tweetId') tweetId: string) {
    return this.tweetService.getTweetById(tweetId);
  }

  /**
   * PUT /tweets/:tweetId
   * Tweet bearbeiten (nur vom Autor)
   */
  @Put(':tweetId')
  updateTweet(
    @Param('tweetId') tweetId: string,
    @Request() req: { user: { sub: string } },
    @Body() updateTweetDto: UpdateTweetDto,
  ) {
    const userId = req.user.sub;
    return this.tweetService.updateTweet(tweetId, userId, updateTweetDto);
  }

  /**
   * DELETE /tweets/:tweetId
   * Tweet löschen (nur vom Autor)
   */
  @Delete(':tweetId')
  deleteTweet(
    @Param('tweetId') tweetId: string,
    @Request() req: { user: { sub: string } },
  ) {
    const userId = req.user.sub;
    this.tweetService.deleteTweet(tweetId, userId);
    return { message: 'Tweet erfolgreich gelöscht' };
  }

  /**
   * POST /tweets/:tweetId/like
   * Tweet liken
   */
  @Post(':tweetId/like')
  likeTweet(
    @Param('tweetId') tweetId: string,
    @Request() req: { user: { sub: string } },
  ) {
    const userId = req.user.sub;
    return this.tweetService.likeTweet(tweetId, userId);
  }

  /**
   * DELETE /tweets/:tweetId/like
   * Like entfernen
   */
  @Delete(':tweetId/like')
  unlikeTweet(
    @Param('tweetId') tweetId: string,
    @Request() req: { user: { sub: string } },
  ) {
    const userId = req.user.sub;
    return this.tweetService.unlikeTweet(tweetId, userId);
  }

  /**
   * POST /tweets/:tweetId/comments
   * Kommentar erstellen
   */
  @Post(':tweetId/comments')
  createComment(
    @Param('tweetId') tweetId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Request() req: { user: { sub: string } },
  ) {
    const userId = req.user.sub;
    return this.tweetService.createComment(tweetId, userId, createCommentDto);
  }

  /**
   * GET /tweets/:tweetId/comments
   * Kommentare abrufen
   */
  @Get(':tweetId/comments')
  getComments(@Param('tweetId') tweetId: string) {
    return this.tweetService.getComments(tweetId);
  }

  /**
   * DELETE /tweets/:tweetId/comments/:commentId
   * Kommentar löschen
   */
  @Delete(':tweetId/comments/:commentId')
  deleteComment(
    @Param('tweetId') tweetId: string,
    @Param('commentId') commentId: string,
    @Request() req: { user: { sub: string } },
  ) {
    const userId: string = req.user.sub;
    this.tweetService.deleteComment(tweetId, commentId, userId);
    return { message: 'Kommentar erfolgreich gelöscht' };
  }
}
