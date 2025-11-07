import { Test, TestingModule } from '@nestjs/testing';
import { TweetService } from './tweet.service';

describe('TweetService - Erweiterte Tests', () => {
  let service: TweetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TweetService],
    }).compile();

    service = module.get<TweetService>(TweetService);
  });

  describe('getTweetsByUser', () => {
    it('sollte alle Tweets eines Users zurückgeben', () => {
      service.createTweet('user1', { content: 'Tweet 1 von User 1' });
      service.createTweet('user2', { content: 'Tweet von User 2' });
      service.createTweet('user1', { content: 'Tweet 2 von User 1' });

      const userTweets = service.getTweetsByUser('user1');

      expect(userTweets).toHaveLength(2);
      expect(userTweets.every((t) => t.authorId === 'user1')).toBe(true);
    });

    it('sollte leere Liste zurückgeben für User ohne Tweets', () => {
      service.createTweet('user1', { content: 'Tweet' });

      const userTweets = service.getTweetsByUser('user2');

      expect(userTweets).toEqual([]);
    });

    it('sollte Tweets nach Datum sortieren (neueste zuerst)', () => {
      const tweet1 = service.createTweet('user1', { content: 'Erster Tweet' });
      jest.advanceTimersByTime(10);
      const tweet2 = service.createTweet('user1', {
        content: 'Zweiter Tweet',
      });

      const userTweets = service.getTweetsByUser('user1');

      expect(userTweets[0].id).toBe(tweet2.id);
      expect(userTweets[1].id).toBe(tweet1.id);
    });
  });

  describe('Komplexe Szenarien', () => {
    it('sollte mehrere Likes von verschiedenen Usern handhaben', () => {
      const tweet = service.createTweet('user1', {
        content: 'Populärer Tweet',
      });

      service.likeTweet(tweet.id, 'user2');
      service.likeTweet(tweet.id, 'user3');
      service.likeTweet(tweet.id, 'user4');

      const updated = service.getTweetById(tweet.id);
      expect(updated.likes).toHaveLength(3);
      expect(updated.likes).toContain('user2');
      expect(updated.likes).toContain('user3');
      expect(updated.likes).toContain('user4');
    });

    it('sollte mehrere Kommentare verarbeiten', () => {
      const tweet = service.createTweet('user1', {
        content: 'Diskussions-Tweet',
      });

      service.createComment(tweet.id, 'user2', { content: 'Kommentar 1' });
      service.createComment(tweet.id, 'user3', { content: 'Kommentar 2' });
      service.createComment(tweet.id, 'user4', { content: 'Kommentar 3' });

      const comments = service.getComments(tweet.id);
      expect(comments).toHaveLength(3);
    });

    it('sollte Tweet mit Likes und Kommentaren korrekt löschen', () => {
      const tweet = service.createTweet('user1', { content: 'Zu löschen' });

      service.likeTweet(tweet.id, 'user2');
      service.likeTweet(tweet.id, 'user3');
      service.createComment(tweet.id, 'user2', { content: 'Kommentar' });

      service.deleteTweet(tweet.id, 'user1');

      expect(() => service.getTweetById(tweet.id)).toThrow();
    });

    it('sollte updatedAt aktualisieren beim Bearbeiten', () => {
      const tweet = service.createTweet('user1', { content: 'Original' });
      const originalUpdatedAt = tweet.updatedAt;

      // Warte kurz
      jest.advanceTimersByTime(100);

      const updated = service.updateTweet(tweet.id, 'user1', {
        content: 'Aktualisiert',
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );
    });
  });

  describe('Edge Cases', () => {
    it('sollte Like von nicht-existierendem User entfernen ohne Fehler', () => {
      const tweet = service.createTweet('user1', { content: 'Test' });

      // Unlike ohne vorheriges Like
      const result = service.unlikeTweet(tweet.id, 'user2');

      expect(result.likes).not.toContain('user2');
    });

    it('sollte Feed mit maximal take-Anzahl zurückgeben', () => {
      for (let i = 0; i < 100; i++) {
        service.createTweet('user1', { content: `Tweet ${i}` });
      }

      const feed = service.getFeed(0, 50);
      expect(feed).toHaveLength(50);
    });

    it('sollte Feed korrekt paginieren über mehrere Seiten', () => {
      const tweetIds: string[] = [];
      for (let i = 0; i < 30; i++) {
        const tweet = service.createTweet('user1', { content: `Tweet ${i}` });
        tweetIds.push(tweet.id);
      }

      const page1 = service.getFeed(0, 10);
      const page2 = service.getFeed(10, 10);
      const page3 = service.getFeed(20, 10);

      // Keine Überschneidungen
      const allIds = [
        ...page1.map((t) => t.id),
        ...page2.map((t) => t.id),
        ...page3.map((t) => t.id),
      ];
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(30);
    });

    it('sollte leeren Feed zurückgeben bei skip größer als Anzahl Tweets', () => {
      service.createTweet('user1', { content: 'Tweet 1' });
      service.createTweet('user1', { content: 'Tweet 2' });

      const feed = service.getFeed(100, 10);
      expect(feed).toEqual([]);
    });
  });

  describe('Validierung durch Entities', () => {
    it('sollte Tweet mit allen Pflichtfeldern erstellen', () => {
      const tweet = service.createTweet('user123', { content: 'Test Tweet' });

      expect(tweet.id).toBeDefined();
      expect(tweet.authorId).toBe('user123');
      expect(tweet.content).toBe('Test Tweet');
      expect(tweet.createdAt).toBeInstanceOf(Date);
      expect(tweet.updatedAt).toBeInstanceOf(Date);
      expect(Array.isArray(tweet.likes)).toBe(true);
      expect(Array.isArray(tweet.comments)).toBe(true);
    });

    it('sollte Kommentar mit allen Pflichtfeldern erstellen', () => {
      const tweet = service.createTweet('user1', { content: 'Tweet' });
      const comment = service.createComment(tweet.id, 'user2', {
        content: 'Kommentar',
      });

      expect(comment.id).toBeDefined();
      expect(comment.tweetId).toBe(tweet.id);
      expect(comment.authorId).toBe('user2');
      expect(comment.content).toBe('Kommentar');
      expect(comment.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Performance-orientierte Tests', () => {
    it('sollte große Anzahl Tweets effizient verarbeiten', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        service.createTweet(`user${i % 10}`, { content: `Tweet ${i}` });
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Sollte unter 1 Sekunde sein
    });

    it('sollte Feed-Abruf bei vielen Tweets performant sein', () => {
      for (let i = 0; i < 1000; i++) {
        service.createTweet('user1', { content: `Tweet ${i}` });
      }

      const startTime = Date.now();
      service.getFeed(0, 20);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Sollte unter 100ms sein
    });
  });
});
