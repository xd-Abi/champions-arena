import { Module } from '@nestjs/common';
import { TweetController } from './tweet.controller';
import { TweetService } from './tweet.service';
import { HttpModule } from '@nestjs/axios';
import { AuthGuard } from '../guards/auth.guard';

@Module({
  imports: [HttpModule],
  controllers: [TweetController],
  providers: [TweetService, AuthGuard],
  exports: [TweetService],
})
export class TweetModule {}
