import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const authHeader = request.headers.authorization;
    const userIdHeader = request.headers['x-user-id'] as string;

    try {
      // Validiere Token und hole User ID
      const userId = await this.authService.getUserId(
        authHeader,
        userIdHeader,
      );

      // Füge User ID zum Request hinzu
      (request as any).userId = userId;

      return true;
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      throw new UnauthorizedException('Invalid or missing authentication');
    }
  }
}
