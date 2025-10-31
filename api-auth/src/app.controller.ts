import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { RequestWithUser } from './app.interfaces';
import { GoogleStrategy } from './google.strategy';

@Controller()
export class AppController {
  constructor(private readonly googleStrategy: GoogleStrategy) {}

  @Get('authorize')
  @UseGuards(AuthGuard('google'))
  authorize() {}

  @Get('callback')
  @UseGuards(AuthGuard('google'))
  callback(@Req() req: RequestWithUser) {
    const token = req.user?.jwt;
    return {
      accessToken: token,
    };
  }

  @Get('jwks')
  getJwks() {
    return this.googleStrategy.getPublicJwks();
  }
}
