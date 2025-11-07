import { Test, TestingModule } from '@nestjs/testing';
import { TweetController } from './tweet.controller';
import { TweetService } from './tweet.service';
import { AuthGuard } from '../guards/auth.guard';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('TweetController', () => {
  let controller: TweetController;
  let service: TweetService;

  const mockAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TweetController],
      providers: [TweetService],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<TweetController>(TweetController);
    service = module.get<TweetService>(TweetService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sollte definiert sein', () => {
    expect(controller).toBeDefined();
  });

  describe('createTweet', () => {
    it('sollte einen Tweet erstellen', () => {
      const createTweetDto = { content: 'Test Tweet' };
      const mockRequest = { user: { sub: 'user123' } };

      const result = controller.createTweet(mockRequest, createTweetDto);

      expect(result).toBeDefined();
      expect(result.content).toBe('Test Tweet');
      expect(result.authorId).toBe('user123');
    });
  });

  describe('getFeed', () => {
    it('sollte den Feed abrufen', () => {
      const mockRequest = { user: { sub: 'user123' } };
      service.createTweet('user1', { content: 'Tweet 1' });
      service.createTweet('user2', { content: 'Tweet 2' });

      const result = controller.getFeed();

      expect(result).toHaveLength(2);
    });

    it('sollte Pagination-Parameter akzeptieren', () => {
      for (let i = 0; i < 25; i++) {
        service.createTweet('user1', { content: `Tweet ${i}` });
      }

      const result = controller.getFeed('10', '5');

      expect(result).toHaveLength(5);
    });
  });

  describe('getTweetById', () => {
    it('sollte einen Tweet anhand der ID zurückgeben', () => {
      const tweet = service.createTweet('user1', { content: 'Test' });

      const result = controller.getTweetById(tweet.id);

      expect(result).toEqual(tweet);
    });

    it('sollte NotFoundException werfen bei nicht existierendem Tweet', () => {
      expect(() => controller.getTweetById('nicht-existent')).toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateTweet', () => {
    it('sollte einen Tweet aktualisieren', () => {
      const tweet = service.createTweet('user123', { content: 'Original' });
      const mockRequest = { user: { sub: 'user123' } };
      const updateDto = { content: 'Aktualisiert' };

      const result = controller.updateTweet(tweet.id, mockRequest, updateDto);

      expect(result.content).toBe('Aktualisiert');
    });

    it('sollte ForbiddenException werfen bei fremdem Tweet', () => {
      const tweet = service.createTweet('user1', { content: 'Original' });
      const mockRequest = { user: { sub: 'user2' } };
      const updateDto = { content: 'Hack' };

      expect(() =>
        controller.updateTweet(tweet.id, mockRequest, updateDto),
      ).toThrow(ForbiddenException);
    });
  });

  describe('deleteTweet', () => {
    it('sollte einen Tweet löschen', () => {
      const tweet = service.createTweet('user123', { content: 'Zu löschen' });
      const mockRequest = { user: { sub: 'user123' } };

      const result = controller.deleteTweet(tweet.id, mockRequest);

      expect(result.message).toBe('Tweet erfolgreich gelöscht');
      expect(() => service.getTweetById(tweet.id)).toThrow(NotFoundException);
    });

    it('sollte ForbiddenException werfen bei fremdem Tweet', () => {
      const tweet = service.createTweet('user1', { content: 'Original' });
      const mockRequest = { user: { sub: 'user2' } };

      expect(() => controller.deleteTweet(tweet.id, mockRequest)).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('likeTweet', () => {
    it('sollte einen Tweet liken', () => {
      const tweet = service.createTweet('user1', { content: 'Test' });
      const mockRequest = { user: { sub: 'user2' } };

      const result = controller.likeTweet(tweet.id, mockRequest);

      expect(result.likes).toContain('user2');
    });
  });

  describe('unlikeTweet', () => {
    it('sollte einen Like entfernen', () => {
      const tweet = service.createTweet('user1', { content: 'Test' });
      service.likeTweet(tweet.id, 'user2');
      const mockRequest = { user: { sub: 'user2' } };

      const result = controller.unlikeTweet(tweet.id, mockRequest);

      expect(result.likes).not.toContain('user2');
    });
  });

  describe('createComment', () => {
    it('sollte einen Kommentar erstellen', () => {
      const tweet = service.createTweet('user1', { content: 'Test' });
      const mockRequest = { user: { sub: 'user2' } };
      const commentDto = { content: 'Toller Tweet!' };

      const result = controller.createComment(
        tweet.id,
        commentDto,
        mockRequest,
      );

      expect(result).toBeDefined();
      expect(result.content).toBe('Toller Tweet!');
      expect(result.authorId).toBe('user2');
    });
  });

  describe('getComments', () => {
    it('sollte alle Kommentare eines Tweets zurückgeben', () => {
      const tweet = service.createTweet('user1', { content: 'Test' });
      service.createComment(tweet.id, 'user2', { content: 'Kommentar 1' });
      service.createComment(tweet.id, 'user3', { content: 'Kommentar 2' });

      const result = controller.getComments(tweet.id);

      expect(result).toHaveLength(2);
    });
  });

  describe('deleteComment', () => {
    it('sollte einen Kommentar löschen', () => {
      const tweet = service.createTweet('user1', { content: 'Test' });
      const comment = service.createComment(tweet.id, 'user2', {
        content: 'Kommentar',
      });
      const mockRequest = { user: { sub: 'user2' } };

      const result = controller.deleteComment(
        tweet.id,
        comment.id,
        mockRequest,
      );

      expect(result.message).toBe('Kommentar erfolgreich gelöscht');
      expect(service.getComments(tweet.id)).toHaveLength(0);
    });

    it('sollte ForbiddenException werfen bei fremdem Kommentar', () => {
      const tweet = service.createTweet('user1', { content: 'Test' });
      const comment = service.createComment(tweet.id, 'user2', {
        content: 'Kommentar',
      });
      const mockRequest = { user: { sub: 'user3' } };

      expect(() =>
        controller.deleteComment(tweet.id, comment.id, mockRequest),
      ).toThrow(ForbiddenException);
    });
  });
});
