import { Test, TestingModule } from '@nestjs/testing';
import { TweetService } from './tweet.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('TweetService', () => {
  let service: TweetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TweetService],
    }).compile();

    service = module.get<TweetService>(TweetService);
  });

  it('sollte definiert sein', () => {
    expect(service).toBeDefined();
  });

  describe('createTweet', () => {
    it('sollte einen Tweet erstellen', () => {
      const tweet = service.createTweet('user123', {
        content: 'Mein erster Tweet!',
      });

      expect(tweet).toBeDefined();
      expect(tweet.content).toBe('Mein erster Tweet!');
      expect(tweet.authorId).toBe('user123');
      expect(tweet.likes).toEqual([]);
      expect(tweet.comments).toEqual([]);
    });
  });

  describe('getFeed', () => {
    it('sollte eine leere Liste zurückgeben, wenn keine Tweets vorhanden sind', () => {
      const feed = service.getFeed();
      expect(feed).toEqual([]);
    });

    it('sollte Tweets sortiert nach Datum zurückgeben', () => {
      const tweet1 = service.createTweet('user1', { content: 'Tweet 1' });
      // Kurze Verzögerung um unterschiedliche Timestamps zu garantieren
      jest.advanceTimersByTime(10);
      const tweet2 = service.createTweet('user2', { content: 'Tweet 2' });

      const feed = service.getFeed();
      expect(feed).toHaveLength(2);
      expect(feed[0].id).toBe(tweet2.id); // Neuester zuerst
      expect(feed[1].id).toBe(tweet1.id);
    });

    it('sollte Pagination unterstützen', () => {
      for (let i = 0; i < 25; i++) {
        service.createTweet('user1', { content: `Tweet ${i}` });
      }

      const page1 = service.getFeed(0, 10);
      const page2 = service.getFeed(10, 10);

      expect(page1).toHaveLength(10);
      expect(page2).toHaveLength(10);
      expect(page1[0].content).not.toBe(page2[0].content);
    });
  });

  describe('getTweetById', () => {
    it('sollte einen Tweet anhand der ID zurückgeben', () => {
      const created = service.createTweet('user1', { content: 'Test Tweet' });
      const found = service.getTweetById(created.id);

      expect(found).toEqual(created);
    });

    it('sollte NotFoundException werfen, wenn Tweet nicht existiert', () => {
      expect(() => service.getTweetById('nicht-existent')).toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateTweet', () => {
    it('sollte einen Tweet aktualisieren', () => {
      const tweet = service.createTweet('user1', { content: 'Original' });
      const updated = service.updateTweet(tweet.id, 'user1', {
        content: 'Aktualisiert',
      });

      expect(updated.content).toBe('Aktualisiert');
    });

    it('sollte ForbiddenException werfen, wenn anderer User versucht zu bearbeiten', () => {
      const tweet = service.createTweet('user1', { content: 'Original' });

      expect(() =>
        service.updateTweet(tweet.id, 'user2', { content: 'Hack' }),
      ).toThrow(ForbiddenException);
    });
  });

  describe('deleteTweet', () => {
    it('sollte einen Tweet löschen', () => {
      const tweet = service.createTweet('user1', { content: 'Zu löschen' });
      service.deleteTweet(tweet.id, 'user1');

      expect(() => service.getTweetById(tweet.id)).toThrow(NotFoundException);
    });

    it('sollte ForbiddenException werfen, wenn anderer User versucht zu löschen', () => {
      const tweet = service.createTweet('user1', { content: 'Original' });

      expect(() => service.deleteTweet(tweet.id, 'user2')).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('likeTweet', () => {
    it('sollte einen Tweet liken', () => {
      const tweet = service.createTweet('user1', { content: 'Test' });
      const liked = service.likeTweet(tweet.id, 'user2');

      expect(liked.likes).toContain('user2');
    });

    it('sollte nicht doppelt liken', () => {
      const tweet = service.createTweet('user1', { content: 'Test' });
      service.likeTweet(tweet.id, 'user2');
      service.likeTweet(tweet.id, 'user2');

      const found = service.getTweetById(tweet.id);
      expect(found.likes).toHaveLength(1);
    });
  });

  describe('unlikeTweet', () => {
    it('sollte einen Like entfernen', () => {
      const tweet = service.createTweet('user1', { content: 'Test' });
      service.likeTweet(tweet.id, 'user2');
      const unliked = service.unlikeTweet(tweet.id, 'user2');

      expect(unliked.likes).not.toContain('user2');
    });
  });

  describe('createComment', () => {
    it('sollte einen Kommentar erstellen', () => {
      const tweet = service.createTweet('user1', { content: 'Test' });
      const comment = service.createComment(tweet.id, 'user2', {
        content: 'Toller Tweet!',
      });

      expect(comment).toBeDefined();
      expect(comment.content).toBe('Toller Tweet!');
      expect(comment.authorId).toBe('user2');
    });
  });

  describe('getComments', () => {
    it('sollte alle Kommentare eines Tweets zurückgeben', () => {
      const tweet = service.createTweet('user1', { content: 'Test' });
      service.createComment(tweet.id, 'user2', { content: 'Kommentar 1' });
      service.createComment(tweet.id, 'user3', { content: 'Kommentar 2' });

      const comments = service.getComments(tweet.id);
      expect(comments).toHaveLength(2);
    });
  });

  describe('deleteComment', () => {
    it('sollte einen Kommentar löschen', () => {
      const tweet = service.createTweet('user1', { content: 'Test' });
      const comment = service.createComment(tweet.id, 'user2', {
        content: 'Kommentar',
      });

      service.deleteComment(tweet.id, comment.id, 'user2');
      const comments = service.getComments(tweet.id);
      expect(comments).toHaveLength(0);
    });

    it('sollte ForbiddenException werfen, wenn anderer User versucht zu löschen', () => {
      const tweet = service.createTweet('user1', { content: 'Test' });
      const comment = service.createComment(tweet.id, 'user2', {
        content: 'Kommentar',
      });

      expect(() =>
        service.deleteComment(tweet.id, comment.id, 'user3'),
      ).toThrow(ForbiddenException);
    });
  });
});
