import { Test } from '@nestjs/testing';
import { ContractTable } from '../../database/tables/contract.table.js';
import { UnitTable } from '../../database/tables/unit.table.js';
import { buildTree, UnitsService } from './units.service.js';

const community = { id: 'c', parentId: null, kind: 'community' as const, code: 'los-alamos', name: 'Los Álamos', deletedAt: null };
const towerA = { id: 'a', parentId: 'c', kind: 'building' as const, code: 'A', name: 'Torre A', deletedAt: null };
const apt101 = { id: 'a101', parentId: 'a', kind: 'apartment' as const, code: '101', name: null, deletedAt: null };

async function serviceWith(table: Partial<Record<keyof UnitTable, unknown>>, contracts: Partial<Record<keyof ContractTable, unknown>> = {}): Promise<UnitsService> {
  const moduleRef = await Test.createTestingModule({
    providers: [UnitsService, { provide: UnitTable, useValue: table }, { provide: ContractTable, useValue: contracts }],
  }).compile();
  return moduleRef.get(UnitsService);
}

describe('buildTree', () => {
  it('nests the flat subtree under its root', () => {
    expect(buildTree([community, towerA, apt101])).toEqual({
      ...community,
      children: [{ ...towerA, children: [{ ...apt101, children: [] }] }],
    });
  });
});

describe('UnitsService', () => {
  it('creates a community as root and rejects one with a parent', async () => {
    const find = vi.fn();
    const existsSiblingCode = vi.fn().mockResolvedValue(false);
    const create = vi.fn().mockResolvedValue(community);
    const service = await serviceWith({ find, existsSiblingCode, create });

    await expect(service.create({ kind: 'community', code: 'los-alamos', name: 'Los Álamos' })).resolves.toEqual(community);
    expect(create).toHaveBeenCalledWith({ parentId: null, kind: 'community', code: 'los-alamos', name: 'Los Álamos' });

    await expect(service.create({ kind: 'community', code: 'x', parentId: 'c' })).rejects.toThrow('no puede tener unidad padre');
    await expect(service.create({ kind: 'building', code: 'B' })).rejects.toThrow('necesita parentId');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('requires an existing parent and a code unused among siblings', async () => {
    const find = vi.fn().mockResolvedValueOnce(null).mockResolvedValue(community);
    const existsSiblingCode = vi.fn().mockResolvedValue(true);
    const create = vi.fn();
    const service = await serviceWith({ find, existsSiblingCode, create });

    await expect(service.create({ kind: 'building', code: 'A', parentId: 'ghost' })).rejects.toThrow('La unidad padre no existe');
    await expect(service.create({ kind: 'building', code: 'A', parentId: 'c' })).rejects.toThrow('ese código en el mismo nivel');
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses to move a unit under its own subtree and allows a valid move', async () => {
    const find = vi.fn().mockImplementation(async (id: string) => ({ c: community, a: towerA, a101: apt101 })[id] ?? null);
    const isSelfOrDescendant = vi.fn().mockImplementation(async (ancestor: string, candidate: string) => ancestor === 'a' && candidate === 'a101');
    const existsSiblingCode = vi.fn().mockResolvedValue(false);
    const update = vi.fn().mockImplementation(async (_id: string, patch: object) => ({ ...towerA, ...patch }));
    const service = await serviceWith({ find, isSelfOrDescendant, existsSiblingCode, update });

    await expect(service.update('a', { parentId: 'a101' })).rejects.toThrow('su propio subárbol');
    expect(update).not.toHaveBeenCalled();

    await expect(service.update('a', { name: 'Torre A norte' })).resolves.toMatchObject({ name: 'Torre A norte' });
    expect(existsSiblingCode).not.toHaveBeenCalled(); // sin cambio de padre, tipo ni código no hay nada que validar

    await expect(service.update('a101', { parentId: 'c' })).resolves.toMatchObject({ parentId: 'c' });
    expect(existsSiblingCode).toHaveBeenCalledWith('c', '101', 'a101');

    await expect(service.update('nope', {})).rejects.toThrow('Unidad no encontrada');
  });
});

describe('UnitsService: borrado lógico', () => {
  it('soft-deletes an alive unit and reports how many were marked', async () => {
    const find = vi.fn().mockResolvedValueOnce(towerA).mockResolvedValueOnce(null);
    const softDelete = vi.fn().mockResolvedValue(3);
    const service = await serviceWith({ find, softDelete });

    await expect(service.remove('a')).resolves.toEqual({ deleted: 3 });
    await expect(service.remove('a')).rejects.toThrow('Unidad no encontrada'); // ya eliminada: no se ve
    expect(softDelete).toHaveBeenCalledTimes(1);
  });

  it('restores only when deleted, with an alive parent and a free code', async () => {
    const deleted = { ...apt101, deletedAt: '2026-09-20T00:00:00.000Z' };
    const findAny = vi.fn().mockResolvedValue(deleted);
    const find = vi.fn().mockResolvedValue(towerA);
    const existsSiblingCode = vi.fn().mockResolvedValue(false);
    const restore = vi.fn().mockResolvedValue(apt101);
    const service = await serviceWith({ findAny, find, existsSiblingCode, restore });

    await expect(service.restore('a101')).resolves.toEqual(apt101);
    expect(existsSiblingCode).toHaveBeenCalledWith('a', '101');

    findAny.mockResolvedValueOnce(apt101);
    await expect(service.restore('a101')).rejects.toThrow('no está eliminada');

    find.mockResolvedValueOnce(null);
    await expect(service.restore('a101')).rejects.toThrow('restaúrala primero');

    existsSiblingCode.mockResolvedValueOnce(true);
    await expect(service.restore('a101')).rejects.toThrow('código en el mismo nivel');
    expect(restore).toHaveBeenCalledTimes(1);
  });
});

describe('UnitsService: detalle', () => {
  it('combines the unit with its ancestors, children and contracts', async () => {
    const find = vi.fn().mockResolvedValue(apt101);
    const ancestors = vi.fn().mockResolvedValue([community, towerA]);
    const listChildren = vi.fn().mockResolvedValue([{ id: 'gc', parentId: 'a101', kind: 'account', code: 'GC', name: null, deletedAt: null, childrenCount: 0 }]);
    const listByUnit = vi.fn().mockResolvedValue([{ id: 'k1', type: 'ownership', startsAt: '2019-06-15', endsAt: null, user: { id: 'u1', fullName: 'Ana', email: 'ana@example.com' } }]);
    const service = await serviceWith({ find, ancestors, listChildren }, { listByUnit });

    const detail = await service.findDetail('a101');
    expect(detail).toMatchObject({ id: 'a101', ancestors: [community, towerA], children: [{ code: 'GC', childrenCount: 0 }], contracts: [{ type: 'ownership' }] });
    expect(listChildren).toHaveBeenCalledWith('a101');

    find.mockResolvedValueOnce(null);
    await expect(service.findDetail('nope')).rejects.toThrow('Unidad no encontrada');
  });
});

describe('UnitsService: orden de la jerarquía', () => {
  it('rejects nesting the same kind or a higher one, and allows skipping levels', async () => {
    const find = vi.fn().mockImplementation(async (id: string) => ({ c: community, a: towerA, a101: apt101 })[id] ?? null);
    const existsSiblingCode = vi.fn().mockResolvedValue(false);
    const create = vi.fn().mockImplementation(async (u: object) => ({ id: 'new', deletedAt: null, ...u }));
    const service = await serviceWith({ find, existsSiblingCode, create });

    await expect(service.create({ kind: 'building', code: 'B2', parentId: 'a' })).rejects.toThrow('Un edificio no puede colgar de un edificio');
    await expect(service.create({ kind: 'building', code: 'B2', parentId: 'a101' })).rejects.toThrow('Un edificio no puede colgar de un departamento');
    await expect(service.create({ kind: 'apartment', code: '7', parentId: 'c' })).resolves.toMatchObject({ kind: 'apartment', parentId: 'c' }); // salto de nivel
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('rejects a kind change that leaves children of the same or higher kind, and a move under a lower kind', async () => {
    const find = vi.fn().mockImplementation(async (id: string) => ({ c: community, a: towerA, a101: apt101 })[id] ?? null);
    const isSelfOrDescendant = vi.fn().mockResolvedValue(false);
    const existsSiblingCode = vi.fn().mockResolvedValue(false);
    const childKinds = vi.fn().mockResolvedValue(['apartment']);
    const update = vi.fn().mockImplementation(async (_id: string, patch: object) => ({ ...towerA, ...patch }));
    const service = await serviceWith({ find, isSelfOrDescendant, existsSiblingCode, childKinds, update });

    await expect(service.update('a', { kind: 'apartment' })).rejects.toThrow('Un departamento no puede tener dentro un departamento');
    await expect(service.update('a', { parentId: 'a101' })).rejects.toThrow('Un edificio no puede colgar de un departamento');
    expect(update).not.toHaveBeenCalled();

    childKinds.mockResolvedValueOnce(['account']);
    await expect(service.update('a', { kind: 'apartment' })).resolves.toMatchObject({ kind: 'apartment' });
  });
});
