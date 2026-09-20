import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser, Public, type SessionUser } from './auth.decorators.js';
import { type Account, AuthService, REFRESH_COOKIE, type Tokens } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';

export interface SessionResponse {
  accessToken: string;
  user: Account;
}

// El access token viaja en el cuerpo (el client lo guarda en memoria); el refresh token solo en una cookie
// httpOnly restringida a /auth, así el JavaScript de la página nunca lo ve.
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<SessionResponse> {
    const { account, tokens } = await this.auth.login(dto.email, dto.password);
    this.setRefreshCookie(res, tokens);
    return { accessToken: tokens.accessToken, user: account };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<SessionResponse> {
    const { account, tokens } = await this.auth.refresh(readCookie(req));
    this.setRefreshCookie(res, tokens);
    return { accessToken: tokens.accessToken, user: account };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(readCookie(req));
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
  }

  @Get('me')
  me(@CurrentUser() user: SessionUser): Promise<Account> {
    return this.auth.me(user.id);
  }

  private setRefreshCookie(res: Response, tokens: Tokens): void {
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/auth',
      expires: tokens.refreshExpiresAt,
    });
  }
}

function readCookie(req: Request): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
}
