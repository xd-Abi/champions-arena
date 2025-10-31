import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import jwksRsa from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksUri: process.env.AUTH_JWKS_URL!,
      }),
      algorithms: ['RS256'],
      issuer: process.env.AUTH_ISSUER || 'champions-arena',
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    // landet als req.user in den Handlern
    return { sub: payload.sub };
  }
}
