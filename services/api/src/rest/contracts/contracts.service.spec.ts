import { Test } from '@nestjs/testing';
import { AppUserTable } from '../../database/tables/app-user.table.js';
import { ContractTable } from '../../database/tables/contract.table.js';
import { UnitTable } from '../../database/tables/unit.table.js';
import { ContractsService } from './contracts.service.js';

const community = { id: 'c', parentId: null, kind: 'community' as const, code: 'los-alamos', name: 'Los Álamos', deletedAt: null };
const ana = { id: 'u1', fullName: 'Ana', email: 'ana@example.com' };
const existing = { id: 'k1', unitId: 'c', type: 'administration' as const, startsAt: '2024-03-01', endsAt: null, documentUrl: null, notes: null, user: ana };

async function serviceWith(contracts: object, units: object = {}, users: object = {}): Promise<ContractsService> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      ContractsService,
      { provide: ContractTable, useValue: contracts },
      { provide: UnitTable, useValue: units },
      { provide: AppUserTable, useValue: users },
    ],
  }).compile();
  return moduleRef.get(ContractsService);
}

describe('ContractsService', () => {
  it('creates a contract when the type fits the unit kind, the person exists and the dates are in order', async () => {
    const create = vi.fn().mockImplementation(async (c: object) => ({ id: 'k9', ...c, user: ana }));
    const find = vi.fn().mockResolvedValue(community);
    const exists = vi.fn().mockResolvedValue(true);
    const service = await serviceWith({ create }, { find }, { exists });

    await expect(service.create('c', { userId: 'u1', type: 'administration', startsAt: '2026-01-01' })).resolves.toMatchObject({ id: 'k9', type: 'administration' });
    expect(create).toHaveBeenCalledWith({ unitId: 'c', userId: 'u1', type: 'administration', startsAt: '2026-01-01', endsAt: null, documentUrl: null, notes: null });

    await expect(service.create('c', { userId: 'u1', type: 'lease', startsAt: '2026-01-01' })).rejects.toThrow('Un contrato de arriendo no puede ir sobre una comunidad');
    await expect(service.create('c', { userId: 'u1', type: 'employment', startsAt: '2026-01-01', endsAt: '2025-12-31' })).rejects.toThrow('término no puede ser anterior');
    exists.mockResolvedValueOnce(false);
    await expect(service.create('c', { userId: 'u9', type: 'employment', startsAt: '2026-01-01' })).rejects.toThrow('La persona no existe');
    find.mockResolvedValueOnce(null);
    await expect(service.create('ghost', { userId: 'u1', type: 'employment', startsAt: '2026-01-01' })).rejects.toThrow('Unidad no encontrada');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('updates a contract validating the new type against its unit and the resulting dates', async () => {
    const find = vi.fn().mockResolvedValue(existing);
    const update = vi.fn().mockImplementation(async (_id: string, patch: object) => ({ ...existing, ...patch }));
    const findAny = vi.fn().mockResolvedValue(community);
    const exists = vi.fn().mockResolvedValue(true);
    const service = await serviceWith({ find, update }, { findAny }, { exists });

    await expect(service.update('k1', { endsAt: '2026-12-31', notes: 'renovado' })).resolves.toMatchObject({ endsAt: '2026-12-31', notes: 'renovado' });
    await expect(service.update('k1', { type: 'ownership' })).rejects.toThrow('propiedad no puede ir sobre una comunidad');
    await expect(service.update('k1', { endsAt: '2020-01-01' })).rejects.toThrow('término no puede ser anterior');
    await expect(service.update('k1', { type: 'employment' })).resolves.toMatchObject({ type: 'employment' });

    find.mockResolvedValueOnce(null);
    await expect(service.update('nope', {})).rejects.toThrow('Contrato no encontrado');
  });
});
