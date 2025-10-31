import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
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
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Kein Authorization Header gefunden');
    }

    const token = this.extractTokenFromHeader(authHeader);
    if (!token) {
      throw new UnauthorizedException('Ungültiger Token');
    }

    // Hier würde normalerweise die JWT-Validierung gegen den Auth Service erfolgen
    // Für das Schulprojekt verwenden wir eine vereinfachte Mock-Validierung
    try {
      const payload = this.validateToken(token);
      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Token ungültig oder abgelaufen' + error);
    }
  }

  private extractTokenFromHeader(authHeader: string): string | null {
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }

  /**
   * Vereinfachte Token-Validierung für das Schulprojekt
   * In Produktion würde man hier das JWT gegen den Auth Service validieren
   */
  private validateToken(token: string): JwtPayload {
    // Mock-Validierung: Token sollte mindestens 20 Zeichen lang sein
    if (token.length < 20) {
      throw new Error('Token zu kurz');
    }

    // Simuliere JWT Payload
    // In Produktion: jwt.verify(token, publicKey) oder Aufruf an Auth Service
    return {
      sub: 'google-oauth2|mock-user-id',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
  }
}
