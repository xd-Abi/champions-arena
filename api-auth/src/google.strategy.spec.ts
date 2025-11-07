import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { GoogleStrategy, JWK } from './google.strategy';
import { Profile } from 'passport';
import * as crypto from 'crypto';

// Mock fs module
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

// Mock node-jose
jest.mock('node-jose', () => ({
  JWK: {
    createKeyStore: jest.fn(() => ({
      add: jest.fn(async () => ({
        toJSON: jest.fn(() => ({
          kty: 'RSA',
          n: 'mock-n-value',
          e: 'AQAB',
        })),
      })),
    })),
  },
}));

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let jwtService: JwtService;

  const mockProfile: Profile = {
    id: 'google-user-123',
    displayName: 'Test User',
    name: { familyName: 'User', givenName: 'Test' },
    emails: [{ value: 'test@example.com', verified: true }],
    photos: [{ value: 'https://example.com/photo.jpg' }],
    provider: 'google',
    _raw: '',
    _json: {} as any,
  };

  const mockPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z5V3Y9s8v
-----END PUBLIC KEY-----`;

  beforeEach(async () => {
    // Mock environment variables
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/callback';
    process.env.JWT_PUBLIC_KEY_PATH = './keys/jwt.pub';

    // Mock fs.readFileSync
    const fs = require('fs');
    (fs.readFileSync as jest.Mock).mockReturnValue(mockPublicKey);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should configure strategy with correct options', () => {
      expect(strategy).toHaveProperty('name', 'google');
    });
  });

  describe('validate', () => {
    it('should successfully validate and return JWT', async () => {
      const done = jest.fn();

      await strategy.validate(
        {} as any,
        'access-token',
        'refresh-token',
        mockProfile,
        done,
      );

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'google-user-123',
      });
      expect(done).toHaveBeenCalledWith(null, { jwt: 'mock-jwt-token' });
    });

    it('should handle errors during JWT signing', async () => {
      const done = jest.fn();
      const error = new Error('JWT signing failed');
      jest.spyOn(jwtService, 'signAsync').mockRejectedValueOnce(error);

      await strategy.validate(
        {} as any,
        'access-token',
        'refresh-token',
        mockProfile,
        done,
      );

      expect(done).toHaveBeenCalledWith(error, false);
    });

    it('should use profile.id as subject in JWT payload', async () => {
      const done = jest.fn();
      const customProfile = { ...mockProfile, id: 'different-user-id' };

      await strategy.validate(
        {} as any,
        'access-token',
        'refresh-token',
        customProfile,
        done,
      );

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'different-user-id',
      });
    });
  });

  describe('resolvePublicKeyPem', () => {
    it('should read public key from file path', async () => {
      const fs = require('fs');
      const result = await strategy.getPublicJwks();

      expect(fs.readFileSync).toHaveBeenCalledWith(
        process.env.JWT_PUBLIC_KEY_PATH,
        'utf8',
      );
      expect(result).toHaveProperty('keys');
    });

    it('should throw error if public key path is not provided', async () => {
      const fs = require('fs');
      delete process.env.JWT_PUBLIC_KEY_PATH;
      (fs.readFileSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('File not found');
      });

      // Create a new instance without the environment variable
      const moduleWithoutEnv = await Test.createTestingModule({
        providers: [
          GoogleStrategy,
          {
            provide: JwtService,
            useValue: { signAsync: jest.fn() },
          },
        ],
      }).compile();

      const strategyWithoutEnv =
        moduleWithoutEnv.get<GoogleStrategy>(GoogleStrategy);

      await expect(strategyWithoutEnv.getPublicJwks()).rejects.toThrow();
    });
  });

  describe('getPublicJwks', () => {
    it('should return JWKS format with keys array', async () => {
      const result = await strategy.getPublicJwks();

      expect(result).toHaveProperty('keys');
      expect(Array.isArray(result.keys)).toBe(true);
      expect(result.keys).toHaveLength(1);
    });

    it('should return JWK with correct structure', async () => {
      const result = await strategy.getPublicJwks();
      const jwk = result.keys[0];

      expect(jwk).toHaveProperty('kty', 'RSA');
      expect(jwk).toHaveProperty('use', 'sig');
      expect(jwk).toHaveProperty('kid');
      expect(jwk).toHaveProperty('alg', 'RS256');
      expect(jwk).toHaveProperty('n', 'mock-n-value');
      expect(jwk).toHaveProperty('e', 'AQAB');
    });

    it('should generate consistent kid from public key hash', async () => {
      const result1 = await strategy.getPublicJwks();
      const result2 = await strategy.getPublicJwks();

      expect(result1.keys[0].kid).toBe(result2.keys[0].kid);
    });

    it('should cache JWK result and not rebuild on second call', async () => {
      const fs = require('fs');
      const readFileSyncMock = fs.readFileSync as jest.Mock;

      // First call
      await strategy.getPublicJwks();
      const firstCallCount = readFileSyncMock.mock.calls.length;

      // Second call - should use cache
      await strategy.getPublicJwks();
      const secondCallCount = readFileSyncMock.mock.calls.length;

      // readFileSync should only be called once (during first call)
      expect(firstCallCount).toBe(secondCallCount);
    });

    it('should generate kid as 16-character hex string', async () => {
      const result = await strategy.getPublicJwks();
      const kid = result.keys[0].kid;

      expect(kid).toHaveLength(16);
      expect(/^[0-9a-f]{16}$/.test(kid)).toBe(true);
    });

    it('should use SHA256 hash for kid generation', async () => {
      const expectedKid = crypto
        .createHash('sha256')
        .update(mockPublicKey)
        .digest('hex')
        .substring(0, 16);

      const result = await strategy.getPublicJwks();

      expect(result.keys[0].kid).toBe(expectedKid);
    });
  });

  describe('integration tests', () => {
    it('should handle complete OAuth flow validation', async () => {
      const done = jest.fn();

      // Simulate OAuth callback
      await strategy.validate(
        {} as any,
        'google-access-token',
        'google-refresh-token',
        mockProfile,
        done,
      );

      // Verify JWT was generated
      expect(jwtService.signAsync).toHaveBeenCalled();
      expect(done).toHaveBeenCalledWith(null, {
        jwt: expect.any(String),
      });
    });

    it('should generate different JWTs for different users', async () => {
      const done1 = jest.fn();
      const done2 = jest.fn();

      const profile1 = { ...mockProfile, id: 'user-1' };
      const profile2 = { ...mockProfile, id: 'user-2' };

      await strategy.validate(
        {} as any,
        'token',
        'token',
        profile1,
        done1,
      );
      await strategy.validate(
        {} as any,
        'token',
        'token',
        profile2,
        done2,
      );

      // Should be called with different sub values
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(1, { sub: 'user-1' });
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(2, { sub: 'user-2' });
    });
  });
});
