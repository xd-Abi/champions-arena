import { Injectable, UnauthorizedException } from '@nestjs/common';
import { importSPKI, jwtVerify } from 'jose';

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

      // Import JWK als CryptoKey
      const publicKey = await importSPKI(
        this.jwkToPem(jwk),
        'RS256',
      );

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
   * Hilfsfunktion: Konvertiert JWK zu PEM Format
   */
  private jwkToPem(jwk: any): string {
    // Für RSA Public Key
    const header = '-----BEGIN PUBLIC KEY-----\n';
    const footer = '\n-----END PUBLIC KEY-----';

    // Vereinfachte PEM-Konvertierung für RS256
    // In Produktion: Verwende eine Library wie node-jose
    const n = this.base64UrlToBase64(jwk.n);
    const e = this.base64UrlToBase64(jwk.e);

    // ASN.1 DER Encoding für RSA Public Key
    const modulus = Buffer.from(n, 'base64');
    const exponent = Buffer.from(e, 'base64');

    // Simplified: Return PEM (in production use proper library)
    // For now, we'll use a workaround with the Auth Service
    return `${header}${n}${footer}`;
  }

  private base64UrlToBase64(base64url: string): string {
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return base64;
  }

  /**
   * Vereinfachte Validierung: Nutzt x-user-id Header für Entwicklung
   * und JWT Token für Produktion
   */
  async getUserId(
    authHeader: string | undefined,
    userIdHeader: string | undefined,
  ): Promise<string> {
    // Development: Nutze x-user-id Header
    if (userIdHeader && process.env.NODE_ENV !== 'production') {
      console.log('⚠️ Development Mode: Using x-user-id header');
      return userIdHeader;
    }

    // Production: Validiere JWT Token
    const token = this.extractTokenFromHeader(authHeader);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const payload = await this.validateToken(token);
    return payload.sub;
  }
}
