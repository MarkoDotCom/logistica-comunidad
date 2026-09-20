import { Test } from '@nestjs/testing';
import { AppUserTable } from '../../database/tables/app-user.table.js';
import { UsersService } from './users.service.js';

const ana = { id: 'u1', email: 'ana@example.com', externalAuthId: null, fullName: 'Ana Rojas', phone: null, isActive: true };

async function serviceWith(table: Partial<Record<keyof AppUserTable, unknown>>): Promise<UsersService> {
  const moduleRef = await Test.createTestingModule({ providers: [UsersService, { provide: AppUserTable, useValue: table }] }).compile();
  return moduleRef.get(UsersService);
}

describe('UsersService', () => {
  it('lists users and passes a trimmed search term, or none when blank', async () => {
    const list = vi.fn().mockResolvedValue([ana]);
    const service = await serviceWith({ list });

    await expect(service.findAll('  ana ')).resolves.toEqual([ana]);
    expect(list).toHaveBeenLastCalledWith('ana');
    await service.findAll('   ');
    expect(list).toHaveBeenLastCalledWith(undefined);
  });

  it('creates a user with null optionals and rejects duplicated emails', async () => {
    const existsByEmail = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const create = vi.fn().mockResolvedValue(ana);
    const service = await serviceWith({ existsByEmail, create });

    await expect(service.create({ email: 'ana@example.com', fullName: 'Ana Rojas' })).resolves.toEqual(ana);
    expect(create).toHaveBeenCalledWith({ email: 'ana@example.com', fullName: 'Ana Rojas', phone: null, externalAuthId: null });

    await expect(service.create({ email: 'ana@example.com', fullName: 'Ana Rojas' })).rejects.toThrow('Ya existe un usuario con ese email');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('updates only what comes in the patch and checks the email against other users', async () => {
    const findWithContracts = vi.fn().mockResolvedValue({ ...ana, contracts: [] });
    const existsByEmail = vi.fn().mockResolvedValue(false);
    const update = vi.fn().mockResolvedValue({ ...ana, phone: '+56 9 1111 1111', contracts: [] });
    const service = await serviceWith({ findWithContracts, existsByEmail, update });

    await expect(service.update('u1', { phone: '+56 9 1111 1111', email: 'ana@example.com' })).resolves.toMatchObject({ phone: '+56 9 1111 1111' });
    expect(existsByEmail).toHaveBeenCalledWith('ana@example.com', 'u1');
    expect(update).toHaveBeenCalledWith('u1', { phone: '+56 9 1111 1111', email: 'ana@example.com' });

    findWithContracts.mockResolvedValueOnce(null);
    await expect(service.update('nope', {})).rejects.toThrow('Usuario no encontrado');
  });
});
