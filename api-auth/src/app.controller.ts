import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { RequestWithUser } from './app.interfaces';
import { GoogleStrategy } from './google.strategy';
import type { Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly googleStrategy: GoogleStrategy) {}

  @Get('authorize')
  @UseGuards(AuthGuard('google'))
  authorize() {}

  @Get('callback')
  @UseGuards(AuthGuard('google'))
  callback(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.user?.jwt;

    res.cookie('ca-auth', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      domain: process.env.COOKIE_DOMAIN!,
    });

    return res.redirect(process.env.FRONTEND_URL!);
  }

  @Get('jwks')
  getJwks() {
    return this.googleStrategy.getPublicJwks();
  }
}
