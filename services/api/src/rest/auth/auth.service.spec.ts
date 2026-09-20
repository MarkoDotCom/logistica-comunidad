import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { hashPassword } from '../../database/password.js';
import { AppUserTable } from '../../database/tables/app-user.table.js';
import { CredentialTable } from '../../database/tables/credential.table.js';
import { AuthService } from './auth.service.js';

const marcela = { id: 'u1', email: 'admin@losalamos.example.com', externalAuthId: null, fullName: 'Marcela Soto', phone: null, isActive: true, roles: [{ id: 'r1', name: 'admin' }], permissions: ['units.read'] };

async function serviceWith(credentials: object, users: object): Promise<AuthService> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: JwtService, useValue: { signAsync: vi.fn().mockResolvedValue('jwt') } },
      { provide: ConfigService, useValue: { get: () => '30' } },
      { provide: CredentialTable, useValue: credentials },
      { provide: AppUserTable, useValue: users },
    ],
  }).compile();
  return moduleRef.get(AuthService);
}

describe('AuthService', () => {
  it('logs in with the right password, issuing an access token and a stored refresh token', async () => {
    const findByEmail = vi.fn().mockResolvedValue({ userId: 'u1', passwordHash: hashPassword('Comunidad2026!'), isActive: true });
    const createRefreshToken = vi.fn();
    const findAccount = vi.fn().mockResolvedValue(marcela);
    const service = await serviceWith({ findByEmail, createRefreshToken }, { findAccount });

    const { account, tokens } = await service.login('admin@losalamos.example.com', 'Comunidad2026!');
    expect(account).toEqual(marcela);
    expect(tokens.accessToken).toBe('jwt');
    expect(tokens.refreshToken).toHaveLength(64);
    expect(createRefreshToken).toHaveBeenCalledWith('u1', tokens.refreshToken, expect.any(Date));

    await expect(service.login('admin@losalamos.example.com', 'otra')).rejects.toThrow('Email o contraseña incorrectos');
    findByEmail.mockResolvedValueOnce(null);
    await expect(service.login('nadie@example.com', 'x')).rejects.toThrow('Email o contraseña incorrectos');
    findByEmail.mockResolvedValueOnce({ userId: 'u1', passwordHash: hashPassword('Comunidad2026!'), isActive: false });
    await expect(service.login('admin@losalamos.example.com', 'Comunidad2026!')).rejects.toThrow('inactiva');
  });

  it('rotates the refresh token and rejects unknown, used or missing ones', async () => {
    const findValidRefreshToken = vi.fn().mockResolvedValueOnce({ id: 't1', userId: 'u1' }).mockResolvedValueOnce(null);
    const revokeRefreshToken = vi.fn();
    const createRefreshToken = vi.fn();
    const findAccount = vi.fn().mockResolvedValue(marcela);
    const service = await serviceWith({ findValidRefreshToken, revokeRefreshToken, createRefreshToken }, { findAccount });

    const { tokens } = await service.refresh('old');
    expect(revokeRefreshToken).toHaveBeenCalledWith('t1');
    expect(tokens.refreshToken).not.toBe('old');
    await expect(service.refresh('old')).rejects.toThrow('Sesión expirada');
    await expect(service.refresh(undefined)).rejects.toThrow('Falta el refresh token');
  });
});
