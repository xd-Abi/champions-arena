import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { GoogleStrategy } from './google.strategy';
import { JwtModule } from '@nestjs/jwt';
import * as fs from 'fs';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    JwtModule.registerAsync({
      useFactory: () => {
        const privateKey = fs.readFileSync(
          process.env.JWT_PRIVATE_KEY_PATH!,
          'utf8',
        );
        const publicKey = fs.readFileSync(
          process.env.JWT_PUBLIC_KEY_PATH!,
          'utf8',
        );

        return {
          privateKey,
          publicKey,
          signOptions: {
            algorithm: 'RS256',
            expiresIn: '7d',
            issuer: 'champions-arena',
          },
        };
      },
    }),
  ],
  controllers: [AppController],
  providers: [GoogleStrategy],
})
export class AppModule {}
