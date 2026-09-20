import { Test } from '@nestjs/testing';
import { UnitTable } from '../../database/tables/unit.table.js';
import { buildTree, UnitsService } from './units.service.js';

const community = { id: 'c', parentId: null, kind: 'community' as const, code: 'los-alamos', name: 'Los Álamos', isActive: true };
const towerA = { id: 'a', parentId: 'c', kind: 'building' as const, code: 'A', name: 'Torre A', isActive: true };
const apt101 = { id: 'a101', parentId: 'a', kind: 'apartment' as const, code: '101', name: null, isActive: true };

async function serviceWith(table: Partial<Record<keyof UnitTable, unknown>>): Promise<UnitsService> {
  const moduleRef = await Test.createTestingModule({ providers: [UnitsService, { provide: UnitTable, useValue: table }] }).compile();
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
