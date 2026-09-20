import { randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { verifyPassword } from '../../database/password.js';
import { AppUserTable, type AppUserDto } from '../../database/tables/app-user.table.js';
import { CredentialTable } from '../../database/tables/credential.table.js';

export interface Account extends AppUserDto {
  permissions: string[];
}

export interface Tokens {
  accessToken: string;
  refreshToken: string; // va en cookie httpOnly; nunca en el cuerpo
  refreshExpiresAt: Date;
}

export const REFRESH_COOKIE = 'refresh_token';

@Injectable()
export class AuthService {
  private readonly refreshTtlMs: number;

  constructor(
    private readonly jwt: JwtService,
    private readonly users: AppUserTable,
    private readonly credentials: CredentialTable,
    config: ConfigService,
  ) {
    this.refreshTtlMs = Number(config.get('REFRESH_TTL_DAYS') ?? 30) * 24 * 60 * 60 * 1000;
  }

  /** Email y contraseña → cuenta y tokens. El mismo mensaje para email desconocido y contraseña errónea. */
  async login(email: string, password: string): Promise<{ account: Account; tokens: Tokens }> {
    const credential = await this.credentials.findByEmail(email);
    if (!credential || !verifyPassword(password, credential.passwordHash)) throw new UnauthorizedException('Email o contraseña incorrectos');
    if (!credential.isActive) throw new UnauthorizedException('La cuenta está inactiva');
    return { account: (await this.users.findAccount(credential.userId))!, tokens: await this.issueTokens(credential.userId) };
  }

  /** Rotación: el refresh token usado se revoca y se emite un par nuevo. */
  async refresh(refreshToken: string | undefined): Promise<{ account: Account; tokens: Tokens }> {
    if (!refreshToken) throw new UnauthorizedException('Falta el refresh token');
    const stored = await this.credentials.findValidRefreshToken(refreshToken);
    if (!stored) throw new UnauthorizedException('Sesión expirada; vuelve a iniciar sesión');
    const account = await this.users.findAccount(stored.userId);
    if (!account?.isActive) throw new UnauthorizedException('La cuenta no existe o está inactiva');
    await this.credentials.revokeRefreshToken(stored.id);
    return { account, tokens: await this.issueTokens(stored.userId) };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const stored = await this.credentials.findValidRefreshToken(refreshToken);
    if (stored) await this.credentials.revokeRefreshToken(stored.id);
  }

  async me(userId: string): Promise<Account> {
    const account = await this.users.findAccount(userId);
    if (!account) throw new UnauthorizedException('La cuenta no existe');
    return account;
  }

  private async issueTokens(userId: string): Promise<Tokens> {
    const accessToken = await this.jwt.signAsync({ sub: userId });
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshExpiresAt = new Date(Date.now() + this.refreshTtlMs);
    await this.credentials.createRefreshToken(userId, refreshToken, refreshExpiresAt);
    return { accessToken, refreshToken, refreshExpiresAt };
  }
}
