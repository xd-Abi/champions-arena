import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Profile } from 'passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import * as fs from 'fs';
import { calculateJwkThumbprint, exportJWK, importSPKI, JWK } from 'jose';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private cachedJwk?: JWK;

  constructor(private readonly jwt: JwtService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL ?? '',
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    try {
      const jwt = await this.signUserJwt(profile);
      done(null, { jwt });
    } catch (err) {
      done(err, false);
    }
  }

  private async signUserJwt(profile: Profile) {
    const payload = { sub: profile.id };
    return this.jwt.signAsync(payload);
  }

  private resolvePublicKeyPem(): string {
    const inline = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH!, 'utf8');
    if (inline) return inline;

    throw new Error(
      'JWKS: no public key provided. Set JWT_PUBLIC_KEY_PATH in env.',
    );
  }

  async getPublicJwks(): Promise<{ keys: JWK[] }> {
    if (!this.cachedJwk) {
      const pem = this.resolvePublicKeyPem();
      const cryptoKey = await importSPKI(pem, 'RS256');
      const jwk = await exportJWK(cryptoKey);

      const jwkWithMeta: JWK = {
        ...jwk,
        alg: 'RS256',
        use: 'sig',
        kid: await calculateJwkThumbprint(jwk, 'sha256'),
      };

      this.cachedJwk = jwkWithMeta;
    }
    return { keys: [this.cachedJwk] };
  }
}
