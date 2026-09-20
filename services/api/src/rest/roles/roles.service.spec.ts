import { Test } from '@nestjs/testing';
import { AppUserTable } from '../../database/tables/app-user.table.js';
import { RoleTable } from '../../database/tables/role.table.js';
import { RolesService } from './roles.service.js';

const admin = { id: 'r1', name: 'Administrador', description: null, isSystem: true, permissionCount: 10, userCount: 1, permissions: ['units.read'], users: [] };
const conserje = { ...admin, id: 'r2', name: 'Conserje', isSystem: false };

async function serviceWith(roles: object, users: object = {}): Promise<RolesService> {
  const moduleRef = await Test.createTestingModule({
    providers: [RolesService, { provide: RoleTable, useValue: roles }, { provide: AppUserTable, useValue: users }],
  }).compile();
  return moduleRef.get(RolesService);
}

describe('RolesService', () => {
  it('creates a role with a unique name and existing permissions, without duplicates', async () => {
    const existsName = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const permissionsExist = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const create = vi.fn().mockResolvedValue(conserje);
    const service = await serviceWith({ existsName, permissionsExist, create });

    await expect(service.create({ name: ' Conserje ', description: ' ', permissions: ['units.read', 'units.read'] })).resolves.toEqual(conserje);
    expect(create).toHaveBeenCalledWith({ name: 'Conserje', description: null, permissions: ['units.read'] });
    await expect(service.create({ name: 'Conserje', permissions: [] })).rejects.toThrow('Ya existe un rol con ese nombre');
    await expect(service.create({ name: 'Otro', permissions: ['nope.read'] })).rejects.toThrow('Alguno de los permisos no existe');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('lets a system role change permissions but not its name, and never deletes it', async () => {
    const find = vi.fn().mockResolvedValue(admin);
    const permissionsExist = vi.fn().mockResolvedValue(true);
    const update = vi.fn().mockImplementation(async (_id: string, patch: object) => ({ ...admin, ...patch }));
    const softDelete = vi.fn();
    const service = await serviceWith({ find, permissionsExist, update, softDelete });

    await expect(service.update('r1', { permissions: ['units.read', 'units.write'] })).resolves.toMatchObject({ permissions: ['units.read', 'units.write'] });
    await expect(service.update('r1', { name: 'Root' })).rejects.toThrow('no se puede renombrar');
    await expect(service.update('r1', { name: 'Administrador', description: null })).resolves.toBeDefined(); // mismo nombre: no es renombrar
    await expect(service.remove('r1')).rejects.toThrow('no se puede eliminar');
    expect(softDelete).not.toHaveBeenCalled();

    find.mockResolvedValueOnce(conserje);
    await service.remove('r2');
    expect(softDelete).toHaveBeenCalledWith('r2');
  });

  it('assigns and removes users, requiring the person to exist', async () => {
    const find = vi.fn().mockResolvedValue(conserje);
    const addUser = vi.fn();
    const removeUser = vi.fn();
    const exists = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const service = await serviceWith({ find, addUser, removeUser }, { exists });

    await expect(service.addUser('r2', 'u1')).resolves.toEqual(conserje);
    expect(addUser).toHaveBeenCalledWith('r2', 'u1');
    await expect(service.addUser('r2', 'ghost')).rejects.toThrow('La persona no existe');
    await service.removeUser('r2', 'u1');
    expect(removeUser).toHaveBeenCalledWith('r2', 'u1');

    find.mockResolvedValueOnce(null);
    await expect(service.findOne('nope')).rejects.toThrow('Rol no encontrado');
  });
});
