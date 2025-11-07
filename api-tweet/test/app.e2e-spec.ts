import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AuthGuard } from '../src/guards/auth.guard';

describe('Tweet API (e2e)', () => {
  let app: INestApplication<App>;
  let createdTweetId: string;

  // Mock AuthGuard um JWT-Validierung zu umgehen
  const mockAuthGuard = {
    canActivate: jest.fn((context) => {
      const request = context.switchToHttp().getRequest();
      // Simuliere authentifizierten User
      request.user = { sub: 'test-user-123', iat: 1234567890, exp: 9999999999 };
      return true;
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();

    // Aktiviere Validation Pipe wie in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/tweets (POST)', () => {
    it('sollte einen neuen Tweet erstellen', () => {
      return request(app.getHttpServer())
        .post('/tweets')
        .send({ content: 'Mein erster E2E-Test Tweet!' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.content).toBe('Mein erster E2E-Test Tweet!');
          expect(res.body.authorId).toBe('test-user-123');
          expect(res.body.likes).toEqual([]);
          expect(res.body.comments).toEqual([]);
          createdTweetId = res.body.id; // Speichere ID für weitere Tests
        });
    });

    it('sollte 400 zurückgeben bei leerem Content', () => {
      return request(app.getHttpServer())
        .post('/tweets')
        .send({ content: '' })
        .expect(400);
    });

    it('sollte 400 zurückgeben bei zu langem Content (>280 Zeichen)', () => {
      const longContent = 'a'.repeat(281);
      return request(app.getHttpServer())
        .post('/tweets')
        .send({ content: longContent })
        .expect(400);
    });
  });

  describe('/tweets (GET)', () => {
    beforeAll(async () => {
      // Erstelle mehrere Tweets für Feed-Tests
      await request(app.getHttpServer())
        .post('/tweets')
        .send({ content: 'Tweet 1' });
      await request(app.getHttpServer())
        .post('/tweets')
        .send({ content: 'Tweet 2' });
      await request(app.getHttpServer())
        .post('/tweets')
        .send({ content: 'Tweet 3' });
    });

    it('sollte den Feed abrufen', () => {
      return request(app.getHttpServer())
        .get('/tweets')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('sollte Pagination unterstützen', () => {
      return request(app.getHttpServer())
        .get('/tweets?skip=1&take=2')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(2);
        });
    });
  });

  describe('/tweets/:tweetId (GET)', () => {
    it('sollte einen einzelnen Tweet abrufen', () => {
      return request(app.getHttpServer())
        .get(`/tweets/${createdTweetId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(createdTweetId);
          expect(res.body).toHaveProperty('content');
          expect(res.body).toHaveProperty('authorId');
        });
    });

    it('sollte 404 zurückgeben für nicht existierenden Tweet', () => {
      return request(app.getHttpServer())
        .get('/tweets/nicht-existent-id')
        .expect(404);
    });
  });

  describe('/tweets/:tweetId (PUT)', () => {
    it('sollte einen Tweet aktualisieren', () => {
      return request(app.getHttpServer())
        .put(`/tweets/${createdTweetId}`)
        .send({ content: 'Aktualisierter Inhalt' })
        .expect(200)
        .expect((res) => {
          expect(res.body.content).toBe('Aktualisierter Inhalt');
          expect(res.body.id).toBe(createdTweetId);
        });
    });

    it('sollte 400 zurückgeben bei ungültigem Content', () => {
      return request(app.getHttpServer())
        .put(`/tweets/${createdTweetId}`)
        .send({ content: '' })
        .expect(400);
    });

    it('sollte 403 zurückgeben bei fremdem Tweet', async () => {
      // Erstelle Tweet mit test-user-123
      const createRes = await request(app.getHttpServer())
        .post('/tweets')
        .send({ content: 'Tweet von user1' });

      const tweetId = createRes.body.id;

      // Überschreibe den Mock Guard temporär für einen anderen User
      const originalCanActivate = mockAuthGuard.canActivate;
      mockAuthGuard.canActivate = jest.fn((context) => {
        const request = context.switchToHttp().getRequest();
        request.user = {
          sub: 'other-user-456',
          iat: 1234567890,
          exp: 9999999999,
        };
        return true;
      });

      // Versuche mit anderem User zu bearbeiten
      await request(app.getHttpServer())
        .put(`/tweets/${tweetId}`)
        .send({ content: 'Hack-Versuch' })
        .expect(403);

      // Setze den Guard zurück
      mockAuthGuard.canActivate = originalCanActivate;
    });
  });

  describe('/tweets/:tweetId/like (POST)', () => {
    let likeTweetId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/tweets')
        .send({ content: 'Tweet zum Liken' });
      likeTweetId = res.body.id;
    });

    it('sollte einen Tweet liken', () => {
      return request(app.getHttpServer())
        .post(`/tweets/${likeTweetId}/like`)
        .expect(201)
        .expect((res) => {
          expect(res.body.likes).toContain('test-user-123');
        });
    });

    it('sollte nicht doppelt liken', async () => {
      await request(app.getHttpServer())
        .post(`/tweets/${likeTweetId}/like`)
        .expect(201);

      return request(app.getHttpServer())
        .post(`/tweets/${likeTweetId}/like`)
        .expect(201)
        .expect((res) => {
          // Filter nur für test-user-123
          const userLikes = res.body.likes.filter(
            (id: string) => id === 'test-user-123',
          );
          expect(userLikes).toHaveLength(1);
        });
    });
  });

  describe('/tweets/:tweetId/like (DELETE)', () => {
    let unlikeTweetId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/tweets')
        .send({ content: 'Tweet zum Unlike' });
      unlikeTweetId = res.body.id;

      await request(app.getHttpServer()).post(`/tweets/${unlikeTweetId}/like`);
    });

    it('sollte einen Like entfernen', () => {
      return request(app.getHttpServer())
        .delete(`/tweets/${unlikeTweetId}/like`)
        .expect(200)
        .expect((res) => {
          expect(res.body.likes).not.toContain('test-user-123');
        });
    });
  });

  describe('/tweets/:tweetId/comments (POST)', () => {
    let commentTweetId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/tweets')
        .send({ content: 'Tweet für Kommentare' });
      commentTweetId = res.body.id;
    });

    it('sollte einen Kommentar erstellen', () => {
      return request(app.getHttpServer())
        .post(`/tweets/${commentTweetId}/comments`)
        .send({ content: 'Toller Tweet!' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.content).toBe('Toller Tweet!');
          expect(res.body.authorId).toBe('test-user-123');
          expect(res.body.tweetId).toBe(commentTweetId);
        });
    });

    it('sollte 400 zurückgeben bei leerem Kommentar', () => {
      return request(app.getHttpServer())
        .post(`/tweets/${commentTweetId}/comments`)
        .send({ content: '' })
        .expect(400);
    });

    it('sollte 400 zurückgeben bei zu langem Kommentar (>500 Zeichen)', () => {
      const longComment = 'a'.repeat(501);
      return request(app.getHttpServer())
        .post(`/tweets/${commentTweetId}/comments`)
        .send({ content: longComment })
        .expect(400);
    });
  });

  describe('/tweets/:tweetId/comments (GET)', () => {
    let getTweetId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/tweets')
        .send({ content: 'Tweet mit Kommentaren' });
      getTweetId = res.body.id;

      await request(app.getHttpServer())
        .post(`/tweets/${getTweetId}/comments`)
        .send({ content: 'Kommentar 1' });
      await request(app.getHttpServer())
        .post(`/tweets/${getTweetId}/comments`)
        .send({ content: 'Kommentar 2' });
    });

    it('sollte alle Kommentare eines Tweets abrufen', () => {
      return request(app.getHttpServer())
        .get(`/tweets/${getTweetId}/comments`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(2);
        });
    });
  });

  describe('/tweets/:tweetId/comments/:commentId (DELETE)', () => {
    let deleteTweetId: string;
    let deleteCommentId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/tweets')
        .send({ content: 'Tweet für Kommentar-Löschung' });
      deleteTweetId = res.body.id;

      const commentRes = await request(app.getHttpServer())
        .post(`/tweets/${deleteTweetId}/comments`)
        .send({ content: 'Zu löschender Kommentar' });
      deleteCommentId = commentRes.body.id;
    });

    it('sollte einen Kommentar löschen', () => {
      return request(app.getHttpServer())
        .delete(`/tweets/${deleteTweetId}/comments/${deleteCommentId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Kommentar erfolgreich gelöscht');
        });
    });

    it('sollte 404 zurückgeben für nicht existierenden Kommentar', () => {
      return request(app.getHttpServer())
        .delete(`/tweets/${deleteTweetId}/comments/nicht-existent`)
        .expect(404);
    });
  });

  describe('/tweets/:tweetId (DELETE)', () => {
    it('sollte einen Tweet löschen', async () => {
      const res = await request(app.getHttpServer())
        .post('/tweets')
        .send({ content: 'Zu löschender Tweet' });
      const tweetId = res.body.id;

      await request(app.getHttpServer())
        .delete(`/tweets/${tweetId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Tweet erfolgreich gelöscht');
        });

      // Verifiziere, dass Tweet gelöscht wurde
      return request(app.getHttpServer()).get(`/tweets/${tweetId}`).expect(404);
    });

    it('sollte 403 zurückgeben bei fremdem Tweet', async () => {
      // Erstelle Tweet mit test-user-123
      const createRes = await request(app.getHttpServer())
        .post('/tweets')
        .send({ content: 'Tweet von user1 zum Löschen' });

      const tweetId = createRes.body.id;

      // Überschreibe den Mock Guard temporär für einen anderen User
      const originalCanActivate = mockAuthGuard.canActivate;
      mockAuthGuard.canActivate = jest.fn((context) => {
        const request = context.switchToHttp().getRequest();
        request.user = {
          sub: 'other-user-789',
          iat: 1234567890,
          exp: 9999999999,
        };
        return true;
      });

      // Versuche mit anderem User zu löschen
      await request(app.getHttpServer())
        .delete(`/tweets/${tweetId}`)
        .expect(403);

      // Setze den Guard zurück
      mockAuthGuard.canActivate = originalCanActivate;
    });
  });
});
