import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

export interface CredentialRow {
  userId: string;
  passwordHash: string;
  isActive: boolean;
}

/** Los refresh tokens se guardan por su hash: si alguien lee la tabla no obtiene tokens utilizables. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class CredentialTable {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<CredentialRow | null> {
    const row = await this.prisma.credential.findFirst({ where: { user: { email } }, select: { user_id: true, password_hash: true, user: { select: { is_active: true } } } });
    return row && { userId: row.user_id, passwordHash: row.password_hash, isActive: row.user.is_active };
  }

  async setPassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.credential.upsert({ where: { user_id: userId }, create: { user_id: userId, password_hash: passwordHash }, update: { password_hash: passwordHash } });
  }

  async createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.prisma.refresh_token.create({ data: { user_id: userId, token_hash: hashToken(token), expires_at: expiresAt } });
  }

  /** El refresh token si existe, no está revocado y no ha expirado. */
  async findValidRefreshToken(token: string): Promise<{ id: string; userId: string } | null> {
    const row = await this.prisma.refresh_token.findFirst({ where: { token_hash: hashToken(token), revoked_at: null, expires_at: { gt: new Date() } }, select: { id: true, user_id: true } });
    return row && { id: row.id, userId: row.user_id };
  }

  async revokeRefreshToken(id: string): Promise<void> {
    await this.prisma.refresh_token.update({ where: { id }, data: { revoked_at: new Date() } });
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refresh_token.updateMany({ where: { user_id: userId, revoked_at: null }, data: { revoked_at: new Date() } });
  }
}
