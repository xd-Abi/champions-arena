import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
import { Request } from 'express';
import { verify } from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';

interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
  iss?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

@Injectable()
export class AuthGuard implements CanActivate, OnModuleInit {
  private jwksClient: jwksClient.JwksClient | null = null;

  onModuleInit() {
    // Initialisiere JWKS Client - lädt Public Keys vom Auth Service
    const authServiceUrl =
      process.env.AUTH_SERVICE_URL || 'http://localhost:3000';

    this.jwksClient = jwksClient.default({
      jwksUri: `${authServiceUrl}/jwks`,
      cache: true,
      cacheMaxAge: 600000, // 10 Minuten Cache
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });

    console.log(
      `🔐 Auth Guard initialisiert - JWKS URL: ${authServiceUrl}/jwks`,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Kein Authorization Header gefunden');
    }

    const token = this.extractTokenFromHeader(authHeader);
    if (!token) {
      throw new UnauthorizedException('Ungültiger Token');
    }

    try {
      const payload = await this.validateToken(token);
      request.user = payload;
      console.log(`✅ Token validiert für User: ${payload.sub}`);
      return true;
    } catch (err) {
      console.error('❌ Token-Validierung fehlgeschlagen:', err.message);
      throw new UnauthorizedException('Token ungültig oder abgelaufen');
    }
  }

  private extractTokenFromHeader(authHeader: string): string | null {
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }

  /**
   * Validiert JWT-Token gegen den Auth Service via JWKS
   */
  private async validateToken(token: string): Promise<JwtPayload> {
    if (!this.jwksClient) {
      throw new UnauthorizedException('JWKS Client nicht initialisiert');
    }

    return new Promise((resolve, reject) => {
      // Funktion zum Abrufen des Signing Keys
      const getKey = (header: any, callback: any) => {
        this.jwksClient!.getSigningKey(header.kid, (err, key) => {
          if (err) {
            callback(err);
            return;
          }
          const signingKey = key?.getPublicKey();
          callback(null, signingKey);
        });
      };

      // Verifiziere Token mit dem Public Key vom Auth Service
      verify(
        token,
        getKey,
        {
          issuer: 'champions-arena',
          algorithms: ['RS256'],
        },
        (err, decoded) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(decoded as JwtPayload);
        },
      );
    });
  }
}
