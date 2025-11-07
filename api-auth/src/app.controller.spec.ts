import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { GoogleStrategy } from './google.strategy';
import { Response } from 'express';
import { RequestWithUser } from './app.interfaces';

describe('AppController', () => {
  let controller: AppController;
  let googleStrategy: GoogleStrategy;

  const mockGoogleStrategy = {
    getPublicJwks: jest.fn(),
  };

  const mockResponse = () => {
    const res: Partial<Response> = {
      cookie: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
    };
    return res as Response;
  };

  const mockRequest = (jwt?: string): RequestWithUser => {
    return {
      user: jwt ? { jwt } : undefined,
    } as RequestWithUser;
  };

  beforeEach(async () => {
    // Set up environment variables
    process.env.NODE_ENV = 'development';
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.COOKIE_DOMAIN = 'localhost';

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: GoogleStrategy,
          useValue: mockGoogleStrategy,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    googleStrategy = module.get<GoogleStrategy>(GoogleStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should inject GoogleStrategy', () => {
      expect(googleStrategy).toBeDefined();
    });
  });

  describe('authorize', () => {
    it('should be defined', () => {
      expect(controller.authorize).toBeDefined();
    });

    it('should not throw error when called', () => {
      expect(() => controller.authorize()).not.toThrow();
    });

    it('should return undefined (Passport handles redirect)', () => {
      const result = controller.authorize();
      expect(result).toBeUndefined();
    });
  });

  describe('callback', () => {
    it('should extract JWT from request.user', () => {
      const res = mockResponse();
      const req = mockRequest('test-jwt-token');

      controller.callback(req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'ca-auth',
        'test-jwt-token',
        expect.any(Object),
      );
    });

    it('should set cookie with correct name and value', () => {
      const res = mockResponse();
      const req = mockRequest('my-jwt-token');

      controller.callback(req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'ca-auth',
        'my-jwt-token',
        expect.any(Object),
      );
    });

    it('should set cookie with correct options in development', () => {
      process.env.NODE_ENV = 'development';
      const res = mockResponse();
      const req = mockRequest('test-token');

      controller.callback(req, res);

      expect(res.cookie).toHaveBeenCalledWith('ca-auth', 'test-token', {
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        domain: 'localhost',
      });
    });

    it('should set cookie with secure flag in production', () => {
      process.env.NODE_ENV = 'production';
      const res = mockResponse();
      const req = mockRequest('test-token');

      controller.callback(req, res);

      expect(res.cookie).toHaveBeenCalledWith('ca-auth', 'test-token', {
        httpOnly: false,
        secure: true, // Should be true in production
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        domain: 'localhost',
      });
    });

    it('should set cookie with 7-day expiration', () => {
      const res = mockResponse();
      const req = mockRequest('test-token');
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

      controller.callback(req, res);

      const cookieOptions = (res.cookie as jest.Mock).mock.calls[0][2];
      expect(cookieOptions.maxAge).toBe(sevenDaysInMs);
    });

    it('should use COOKIE_DOMAIN from environment', () => {
      process.env.COOKIE_DOMAIN = 'example.com';
      const res = mockResponse();
      const req = mockRequest('test-token');

      controller.callback(req, res);

      const cookieOptions = (res.cookie as jest.Mock).mock.calls[0][2];
      expect(cookieOptions.domain).toBe('example.com');
    });

    it('should redirect to FRONTEND_URL', () => {
      process.env.FRONTEND_URL = 'http://localhost:3000/dashboard';
      const res = mockResponse();
      const req = mockRequest('test-token');

      controller.callback(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/dashboard',
      );
    });

    it('should handle missing JWT gracefully', () => {
      const res = mockResponse();
      const req = mockRequest(); // No JWT

      controller.callback(req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'ca-auth',
        undefined,
        expect.any(Object),
      );
      expect(res.redirect).toHaveBeenCalled();
    });

    it('should set sameSite to lax', () => {
      const res = mockResponse();
      const req = mockRequest('test-token');

      controller.callback(req, res);

      const cookieOptions = (res.cookie as jest.Mock).mock.calls[0][2];
      expect(cookieOptions.sameSite).toBe('lax');
    });

    it('should set path to root', () => {
      const res = mockResponse();
      const req = mockRequest('test-token');

      controller.callback(req, res);

      const cookieOptions = (res.cookie as jest.Mock).mock.calls[0][2];
      expect(cookieOptions.path).toBe('/');
    });

    it('should set httpOnly to false', () => {
      const res = mockResponse();
      const req = mockRequest('test-token');

      controller.callback(req, res);

      const cookieOptions = (res.cookie as jest.Mock).mock.calls[0][2];
      expect(cookieOptions.httpOnly).toBe(false);
    });
  });

  describe('getJwks', () => {
    it('should call googleStrategy.getPublicJwks', () => {
      controller.getJwks();

      expect(mockGoogleStrategy.getPublicJwks).toHaveBeenCalled();
    });

    it('should return JWKS from googleStrategy', async () => {
      const mockJwks = {
        keys: [
          {
            kty: 'RSA',
            use: 'sig',
            kid: 'abc123',
            alg: 'RS256',
            n: 'mock-n',
            e: 'AQAB',
          },
        ],
      };
      mockGoogleStrategy.getPublicJwks.mockResolvedValue(mockJwks);

      const result = await controller.getJwks();

      expect(result).toEqual(mockJwks);
    });

    it('should return object with keys array', async () => {
      const mockJwks = {
        keys: [
          {
            kty: 'RSA',
            use: 'sig',
            kid: 'test-kid',
            alg: 'RS256',
            n: 'test-n',
            e: 'AQAB',
          },
        ],
      };
      mockGoogleStrategy.getPublicJwks.mockResolvedValue(mockJwks);

      const result = await controller.getJwks();

      expect(result).toHaveProperty('keys');
      expect(Array.isArray(result.keys)).toBe(true);
    });

    it('should propagate errors from googleStrategy', async () => {
      const error = new Error('Failed to generate JWKS');
      mockGoogleStrategy.getPublicJwks.mockRejectedValue(error);

      await expect(controller.getJwks()).rejects.toThrow(
        'Failed to generate JWKS',
      );
    });
  });

  describe('integration tests', () => {
    it('should complete full callback flow', () => {
      const res = mockResponse();
      const req = mockRequest('integration-test-jwt');

      controller.callback(req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'ca-auth',
        'integration-test-jwt',
        expect.objectContaining({
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      );
      expect(res.redirect).toHaveBeenCalledWith(process.env.FRONTEND_URL);
    });

    it('should handle different environment configurations', () => {
      const configs = [
        {
          NODE_ENV: 'development',
          FRONTEND_URL: 'http://localhost:3000',
          COOKIE_DOMAIN: 'localhost',
          expectedSecure: false,
        },
        {
          NODE_ENV: 'production',
          FRONTEND_URL: 'https://champions-arena.com',
          COOKIE_DOMAIN: '.champions-arena.com',
          expectedSecure: true,
        },
      ];

      configs.forEach((config) => {
        process.env.NODE_ENV = config.NODE_ENV;
        process.env.FRONTEND_URL = config.FRONTEND_URL;
        process.env.COOKIE_DOMAIN = config.COOKIE_DOMAIN;

        const res = mockResponse();
        const req = mockRequest('test-token');

        controller.callback(req, res);

        const cookieOptions = (res.cookie as jest.Mock).mock.calls[0][2];
        expect(cookieOptions.secure).toBe(config.expectedSecure);
        expect(cookieOptions.domain).toBe(config.COOKIE_DOMAIN);

        expect(res.redirect).toHaveBeenCalledWith(config.FRONTEND_URL);

        jest.clearAllMocks();
      });
    });
  });
});
