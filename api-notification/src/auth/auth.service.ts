import { Injectable, UnauthorizedException } from '@nestjs/common';
import { importJWK, jwtVerify } from 'jose';

interface JWKSResponse {
  keys: Array<{
    kty: string;
    kid: string;
    use: string;
    n: string;
    e: string;
  }>;
}

interface JWTPayload {
  sub: string; // User ID (Google OAuth ID)
  email?: string;
  name?: string;
  picture?: string;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthService {
  private publicKey: string | null = null;
  private readonly authServiceUrl =
    process.env.AUTH_SERVICE_URL || 'http://localhost:3000';

  /**
   * Holt den Public Key vom Auth Service (JWKS Endpoint)
   */
  async getPublicKey(): Promise<string> {
    if (this.publicKey) {
      return this.publicKey;
    }

    try {
      const response = await fetch(`${this.authServiceUrl}/jwks`);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch JWKS: ${response.status} ${response.statusText}`,
        );
      }

      const jwks: JWKSResponse = await response.json();

      if (!jwks.keys || jwks.keys.length === 0) {
        throw new Error('No keys found in JWKS');
      }

      // Nehme den ersten Key (in Produktion: nach kid suchen)
      const key = jwks.keys[0];

      // Konvertiere JWK zu PEM Format für jose
      // Für RS256: Verwende den Public Key direkt
      this.publicKey = JSON.stringify(key);

      console.log('✅ Public Key vom Auth Service geladen');

      return this.publicKey;
    } catch (error) {
      console.error('❌ Fehler beim Laden des Public Keys:', error);
      throw new UnauthorizedException('Could not verify token');
    }
  }

  /**
   * Validiert ein JWT Token gegen den Auth Service Public Key
   */
  async validateToken(token: string): Promise<JWTPayload> {
    try {
      // Hole Public Key vom Auth Service
      const publicKeyStr = await this.getPublicKey();
      const jwk = JSON.parse(publicKeyStr);

      // Import JWK direkt (jose unterstützt JWK nativ)
      const publicKey = await importJWK(jwk, 'RS256');

      // Verifiziere JWT
      const { payload } = await jwtVerify(token, publicKey, {
        algorithms: ['RS256'],
      });

      console.log('✅ Token erfolgreich validiert für User:', payload.sub);

      return payload as unknown as JWTPayload;
    } catch (error) {
      console.error('❌ Token Validierung fehlgeschlagen:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Extrahiert Token aus Authorization Header
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }

  /**
   * Flexible Validierung: Unterstützt beide Methoden parallel
   * 1. x-user-id Header (Development/Testing)
   * 2. JWT Token (Production/Auth Service Integration)
   */
  async getUserId(
    authHeader: string | undefined,
    userIdHeader: string | undefined,
  ): Promise<string> {
    // Option 1: x-user-id Header (immer akzeptiert für einfaches Testing)
    if (userIdHeader) {
      console.log('🔓 Using x-user-id header:', userIdHeader);
      return userIdHeader;
    }

    // Option 2: JWT Token (für echte Authentifizierung)
    const token = this.extractTokenFromHeader(authHeader);

    if (!token) {
      throw new UnauthorizedException('No authentication provided. Use either x-user-id header or Authorization Bearer token');
    }

    console.log('🔐 Validating JWT token...');
    const payload = await this.validateToken(token);
    console.log('✅ Token valid for user:', payload.sub);
    return payload.sub;
  }
}
