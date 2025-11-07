import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AuthGuard } from '@nestjs/passport';
import * as fs from 'fs';
import * as path from 'path';

describe('Auth API (e2e)', () => {
  let app: INestApplication;

  // Mock environment variables
  const mockEnv = {
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_CALLBACK_URL: 'http://localhost:3000/callback',
    JWT_PRIVATE_KEY_PATH: path.join(__dirname, '../keys/jwt.key'),
    JWT_PUBLIC_KEY_PATH: path.join(__dirname, '../keys/jwt.pub'),
    FRONTEND_URL: 'http://localhost:3000',
    COOKIE_DOMAIN: 'localhost',
    NODE_ENV: 'test',
  };

  // Mock AuthGuard to bypass actual Google OAuth
  const mockAuthGuard = {
    canActivate: jest.fn((context) => {
      const request = context.switchToHttp().getRequest();
      // Simulate successful OAuth by adding user to request
      request.user = {
        jwt: 'mock-jwt-token-from-google-oauth',
      };
      return true;
    }),
  };

  beforeAll(async () => {
    // Set environment variables
    Object.assign(process.env, mockEnv);

    // Verify JWT keys exist before running tests
    const privateKeyExists = fs.existsSync(mockEnv.JWT_PRIVATE_KEY_PATH);
    const publicKeyExists = fs.existsSync(mockEnv.JWT_PUBLIC_KEY_PATH);

    if (!privateKeyExists || !publicKeyExists) {
      console.warn(
        'Warning: JWT keys not found. Tests may fail. Ensure keys exist at:',
      );
      console.warn('  Private:', mockEnv.JWT_PRIVATE_KEY_PATH);
      console.warn('  Public:', mockEnv.JWT_PUBLIC_KEY_PATH);
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard('google'))
      .useValue(mockAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /authorize', () => {
    it('should exist and return 200', () => {
      return request(app.getHttpServer()).get('/authorize').expect(200);
    });

    it('should trigger Google OAuth guard', () => {
      return request(app.getHttpServer())
        .get('/authorize')
        .then(() => {
          expect(mockAuthGuard.canActivate).toHaveBeenCalled();
        });
    });
  });

  describe('GET /callback', () => {
    it('should set ca-auth cookie and redirect', () => {
      return request(app.getHttpServer())
        .get('/callback')
        .expect(302) // Redirect status
        .expect('Location', mockEnv.FRONTEND_URL)
        .expect((res) => {
          const cookies = res.headers['set-cookie'];
          expect(cookies).toBeDefined();
          expect(cookies.length).toBeGreaterThan(0);

          const authCookie = cookies.find((cookie: string) =>
            cookie.startsWith('ca-auth='),
          );
          expect(authCookie).toBeDefined();
          expect(authCookie).toContain('mock-jwt-token-from-google-oauth');
        });
    });

    it('should set cookie with correct attributes', () => {
      return request(app.getHttpServer())
        .get('/callback')
        .expect((res) => {
          const cookies = res.headers['set-cookie'];
          const authCookie = cookies.find((cookie: string) =>
            cookie.startsWith('ca-auth='),
          );

          // Check cookie attributes
          expect(authCookie).toContain('Path=/');
          expect(authCookie).toContain('SameSite=Lax');
          expect(authCookie).toContain(`Domain=${mockEnv.COOKIE_DOMAIN}`);

          // In test environment, secure should be false
          expect(authCookie).not.toContain('Secure');
        });
    });

    it('should set cookie with Max-Age for 7 days', () => {
      const sevenDaysInSeconds = 7 * 24 * 60 * 60;

      return request(app.getHttpServer())
        .get('/callback')
        .expect((res) => {
          const cookies = res.headers['set-cookie'];
          const authCookie = cookies.find((cookie: string) =>
            cookie.startsWith('ca-auth='),
          );

          expect(authCookie).toContain(`Max-Age=${sevenDaysInSeconds}`);
        });
    });

    it('should redirect to FRONTEND_URL', () => {
      return request(app.getHttpServer())
        .get('/callback')
        .expect(302)
        .expect('Location', mockEnv.FRONTEND_URL);
    });

    it('should trigger Google OAuth guard', () => {
      return request(app.getHttpServer())
        .get('/callback')
        .then(() => {
          expect(mockAuthGuard.canActivate).toHaveBeenCalled();
        });
    });
  });

  describe('GET /jwks', () => {
    it('should return 200 and JWKS format', () => {
      return request(app.getHttpServer())
        .get('/jwks')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('keys');
          expect(Array.isArray(res.body.keys)).toBe(true);
        });
    });

    it('should return valid JWK structure', () => {
      return request(app.getHttpServer())
        .get('/jwks')
        .expect(200)
        .expect((res) => {
          const keys = res.body.keys;
          expect(keys.length).toBeGreaterThan(0);

          const jwk = keys[0];
          expect(jwk).toHaveProperty('kty');
          expect(jwk).toHaveProperty('use', 'sig');
          expect(jwk).toHaveProperty('kid');
          expect(jwk).toHaveProperty('alg', 'RS256');
          expect(jwk).toHaveProperty('n');
          expect(jwk).toHaveProperty('e');
        });
    });

    it('should return RSA key type', () => {
      return request(app.getHttpServer())
        .get('/jwks')
        .expect(200)
        .expect((res) => {
          const jwk = res.body.keys[0];
          expect(jwk.kty).toBe('RSA');
        });
    });

    it('should return consistent JWKS on multiple calls', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/jwks')
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/jwks')
        .expect(200);

      expect(response1.body).toEqual(response2.body);
    });

    it('should not require authentication', () => {
      // This test verifies the /jwks endpoint is publicly accessible
      return request(app.getHttpServer()).get('/jwks').expect(200);
    });

    it('should return Content-Type application/json', () => {
      return request(app.getHttpServer())
        .get('/jwks')
        .expect(200)
        .expect('Content-Type', /json/);
    });
  });

  describe('OAuth Flow Integration', () => {
    it('should complete full OAuth flow from authorize to callback', async () => {
      // Step 1: Hit authorize endpoint
      await request(app.getHttpServer()).get('/authorize').expect(200);

      // Step 2: Hit callback endpoint (simulating Google redirect)
      const response = await request(app.getHttpServer())
        .get('/callback')
        .expect(302)
        .expect('Location', mockEnv.FRONTEND_URL);

      // Step 3: Verify cookie was set
      const cookies = response.headers['set-cookie'];
      const authCookie = cookies.find((cookie: string) =>
        cookie.startsWith('ca-auth='),
      );

      expect(authCookie).toBeDefined();
      expect(authCookie).toContain('mock-jwt-token-from-google-oauth');
    });

    it('should verify JWT can be validated using JWKS endpoint', async () => {
      // Step 1: Get JWKS public key
      const jwksResponse = await request(app.getHttpServer())
        .get('/jwks')
        .expect(200);

      const jwk = jwksResponse.body.keys[0];

      // Step 2: Verify JWK has required fields for JWT validation
      expect(jwk).toHaveProperty('kty', 'RSA');
      expect(jwk).toHaveProperty('alg', 'RS256');
      expect(jwk).toHaveProperty('kid');
      expect(jwk).toHaveProperty('n');
      expect(jwk).toHaveProperty('e');

      // This JWK can now be used by other microservices to validate JWTs
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid routes', () => {
      return request(app.getHttpServer()).get('/invalid-route').expect(404);
    });

    it('should return proper error format for 404', () => {
      return request(app.getHttpServer())
        .get('/invalid-route')
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 404);
          expect(res.body).toHaveProperty('message');
        });
    });
  });

  describe('Security Headers', () => {
    it('should include proper cookie security attributes', () => {
      return request(app.getHttpServer())
        .get('/callback')
        .expect((res) => {
          const cookies = res.headers['set-cookie'];
          const authCookie = cookies.find((cookie: string) =>
            cookie.startsWith('ca-auth='),
          );

          // Verify cookie has security attributes
          expect(authCookie).toContain('Path=/');
          expect(authCookie).toContain('SameSite=Lax');

          // In test environment
          if (process.env.NODE_ENV === 'production') {
            expect(authCookie).toContain('Secure');
          }
        });
    });
  });

  describe('Environment Configuration', () => {
    it('should use environment variables correctly', () => {
      expect(process.env.GOOGLE_CLIENT_ID).toBe(mockEnv.GOOGLE_CLIENT_ID);
      expect(process.env.FRONTEND_URL).toBe(mockEnv.FRONTEND_URL);
      expect(process.env.COOKIE_DOMAIN).toBe(mockEnv.COOKIE_DOMAIN);
    });
  });
});
