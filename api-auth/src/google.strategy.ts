import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Profile } from 'passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import * as fs from 'fs';
import * as crypto from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jose = require('node-jose');

export interface JWK {
  kty: string;
  use: string;
  kid: string;
  alg: string;
  n?: string;
  e?: string;
}

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

      // Konvertiere PEM zu JWK mit node-jose
      const keystore = jose.JWK.createKeyStore();
      const key = await keystore.add(pem, 'pem');
      const jwk = key.toJSON();

      // Generiere kid (Key ID) durch Hashing des Public Keys
      const kid = crypto
        .createHash('sha256')
        .update(pem)
        .digest('hex')
        .substring(0, 16);

      const jwkWithMeta: JWK = {
        kty: jwk.kty,
        use: 'sig',
        kid: kid,
        alg: 'RS256',
        n: jwk.n,
        e: jwk.e,
      };

      this.cachedJwk = jwkWithMeta;
    }
    return { keys: [this.cachedJwk] };
  }
}
