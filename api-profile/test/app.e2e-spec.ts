// test/app.e2e-spec.ts
import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/auth/jwt.guard';
import { JwtStrategy as AppJwtStrategy } from '../src/auth/jwt.strategy';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

// supertest als CommonJS, damit keine ESM-Probleme
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

// ——— Test-Strategy: registriert "jwt" ohne JWKS ———
import { ExtractJwt, Strategy as JwtStrategyLib } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';

class TestJwtStrategy extends PassportStrategy(JwtStrategyLib, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
      secretOrKey: 'test-secret', // nur für Tests
    });
  }
  async validate(payload: any) {
    return payload ?? null;
  }
}

// ——— Guard-Bypass für den “happy path” ———
class TestGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    req.user = { sub: 'u-e2e' };
    return true;
  }
}

// 1×1 px JPEG
const tinyJpegBase64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxISEhUQEhIVFRUVFRUVFRUVFRUVFRUWFxUVFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGhAQGi0lHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAbAAABBQEBAAAAAAAAAAAAAAAFAQIDBAYHB//EADwQAAEDAgMFBQQIBwAAAAAAAAEAAgMEEQUSITFBBhMiUWFxgZGh8BMUQlKx0fAzYnKC4RUzQ2OT/8QAGQEBAAMBAQAAAAAAAAAAAAAAAAEDBAIF/8QAHBEBAQADAQEBAAAAAAAAAAAAAAECERIxQVFx/9oADAMBAAIRAxEAPwD9XQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADy5x3m8mQ3N0b7yZ7Vd4o8rQyL5W0m4k3eP2aY7u3J3u7wz8N0k0c3q8k9z6aV9n3Z1O3z+oAAMqk5b8i0p7l2tq3s9W/8A0Qq1euzk7m3c6yq5v9yZp7wQdAAAAAAAAAAAAAAAAAAAAAAAB//2Q==';

function writeTinyJpeg(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-'));
  const file = path.join(dir, 'pic.jpg');
  fs.writeFileSync(file, Buffer.from(tinyJpegBase64, 'base64'));
  return file;
}

describe('E2E: /users', () => {
  let app: INestApplication;

  describe('mit Auth-Override (happy path)', () => {
    beforeAll(async () => {
      const builder = Test.createTestingModule({ imports: [AppModule] })
        // Guard übersteuern
        .overrideGuard(JwtAuthGuard)
        .useClass(TestGuard)
        // Strategy übersteuern, damit nie JWKS benötigt wird
        .overrideProvider(AppJwtStrategy)
        .useClass(TestJwtStrategy);

      const mod = await builder.compile();

      app = mod.createNestApplication();
      app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
      await app.init();
    });

    afterAll(async () => {
      if (app) await app.close();
    });

    it('GET /users/me -> 200 und Profil', async () => {
      const res = await request(app.getHttpServer()).get('/users/me').expect(200);
      expect(res.body.id).toBe('u-e2e');
      expect(res.body).toHaveProperty('stats');
      expect(res.body.stats).toEqual({ followers: 0, following: 0, posts: 0 });
      expect(res.body.name).toBeNull();
      expect(res.body.bio).toBeNull();
    });

    it('PUT /users/me validiert Body', async () => {
      const res1 = await request(app.getHttpServer())
        .put('/users/me')
        .send({ name: 'Alice', bio: 'Hi' })
        .set('Content-Type', 'application/json')
        .expect(200);
      expect(res1.body.name).toBe('Alice');
      expect(res1.body.bio).toBe('Hi');

      await request(app.getHttpServer())
        .put('/users/me')
        .send({ name: 'A'.repeat(1000) })
        .set('Content-Type', 'application/json')
        .expect(400);
    });

    it('PUT /users/me erlaubt partielle Updates', async () => {
      await request(app.getHttpServer())
        .put('/users/me')
        .send({ name: 'Bob' })
        .set('Content-Type', 'application/json')
        .expect(200);

      const res = await request(app.getHttpServer())
        .put('/users/me')
        .send({ bio: 'Developer' })
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(res.body.name).toBe('Bob');
      expect(res.body.bio).toBe('Developer');
    });

    it('PUT /users/me lehnt ungültige Felder ab', async () => {
      await request(app.getHttpServer())
        .put('/users/me')
        .send({ name: 'Alice', invalidField: 'x' })
        .set('Content-Type', 'application/json')
        .expect(400);
    });

    it('POST /users/me/picture lädt Bild hoch und gibt Pfad zurück', async () => {
      const filePath = writeTinyJpeg();

      const res = await request(app.getHttpServer())
        .post('/users/me/picture')
        .attach('file', filePath)
        .expect(201);

      expect(typeof res.body.picturePath).toBe('string');

      if (res.body.picturePath && fs.existsSync(res.body.picturePath)) {
        try { fs.unlinkSync(res.body.picturePath); } catch {}
      }
      try { fs.unlinkSync(filePath); } catch {}
    });

    it('POST /users/me/picture ersetzt altes Bild', async () => {
      const filePath1 = writeTinyJpeg();
      const res1 = await request(app.getHttpServer())
        .post('/users/me/picture')
        .attach('file', filePath1)
        .expect(201);
      const oldPath = res1.body.picturePath;

      const filePath2 = writeTinyJpeg();
      const res2 = await request(app.getHttpServer())
        .post('/users/me/picture')
        .attach('file', filePath2)
        .expect(201);

      expect(res2.body.picturePath).not.toBe(oldPath);

      if (res2.body.picturePath && fs.existsSync(res2.body.picturePath)) {
        try { fs.unlinkSync(res2.body.picturePath); } catch {}
      }
      try { fs.unlinkSync(filePath1); } catch {}
      try { fs.unlinkSync(filePath2); } catch {}
    });

    it('POST /users/me/picture lehnt zu große Dateien ab', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-'));
      const file = path.join(dir, 'big.jpg');
      fs.writeFileSync(file, Buffer.alloc(6 * 1024 * 1024)); // >5MB

      // Multer/Nest gibt 413 zurück. Erwartung anpassen.
      await request(app.getHttpServer())
        .post('/users/me/picture')
        .attach('file', file)
        .expect(413);

      try { fs.unlinkSync(file); } catch {}
    });

    it('DELETE /users/me/picture entfernt Bild', async () => {
      const filePath = writeTinyJpeg();
      await request(app.getHttpServer())
        .post('/users/me/picture')
        .attach('file', filePath)
        .expect(201);

      await request(app.getHttpServer())
        .delete('/users/me/picture')
        .expect(204);

      const getRes = await request(app.getHttpServer())
        .get('/users/me')
        .expect(200);
      expect(getRes.body.picturePath).toBeNull();

      try { fs.unlinkSync(filePath); } catch {}
    });

    it('DELETE /users/me/picture ohne Bild ist erfolgreich', async () => {
      await request(app.getHttpServer())
        .delete('/users/me/picture')
        .expect(204);
    });
  });

  describe('ohne Auth-Override (unauthorized)', () => {
    let appNoAuth: INestApplication;

    beforeAll(async () => {
      const builder = Test.createTestingModule({ imports: [AppModule] })
        // Echte Guard-Chain aktiv, aber Strategy lokal registrieren
        .overrideProvider(AppJwtStrategy)
        .useClass(TestJwtStrategy);

      const mod = await builder.compile();

      appNoAuth = mod.createNestApplication();
      appNoAuth.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
      await appNoAuth.init();
    });

    afterAll(async () => {
      if (appNoAuth) await appNoAuth.close();
    });

    it('GET /users/me -> 401 ohne Token', async () => {
      await request(appNoAuth.getHttpServer()).get('/users/me').expect(401);
    });

    it('PUT /users/me -> 401 ohne Token', async () => {
      await request(appNoAuth.getHttpServer())
        .put('/users/me')
        .send({ name: 'Alice' })
        .expect(401);
    });

    it('POST /users/me/picture -> 401 ohne Token', async () => {
      // Kein Upload anhängen, damit die Guard 401 liefert und kein Stream abreißt.
      await request(appNoAuth.getHttpServer())
        .post('/users/me/picture')
        .expect(401);
    });

    it('DELETE /users/me/picture -> 401 ohne Token', async () => {
      await request(appNoAuth.getHttpServer())
        .delete('/users/me/picture')
        .expect(401);
    });
  });
});
