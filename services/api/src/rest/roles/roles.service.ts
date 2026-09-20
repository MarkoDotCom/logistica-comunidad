import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AppUserTable } from '../../database/tables/app-user.table.js';
import { type PermissionDto, type RoleDetail, type RoleSummary, RoleTable } from '../../database/tables/role.table.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';

@Injectable()
export class RolesService {
  constructor(
    private readonly roles: RoleTable,
    private readonly users: AppUserTable,
  ) {}

  permissions(): Promise<PermissionDto[]> {
    return this.roles.listPermissions();
  }

  findAll(): Promise<RoleSummary[]> {
    return this.roles.list();
  }

  async findOne(id: string): Promise<RoleDetail> {
    const role = await this.roles.find(id);
    if (!role) throw new NotFoundException('Rol no encontrado');
    return role;
  }

  async create(dto: CreateRoleDto): Promise<RoleDetail> {
    const name = dto.name.trim();
    if (await this.roles.existsName(name)) throw new ConflictException('Ya existe un rol con ese nombre');
    await this.assertPermissions(dto.permissions);
    return this.roles.create({ name, description: dto.description?.trim() || null, permissions: [...new Set(dto.permissions)] });
  }

  /** Los roles del sistema cambian de permisos y descripción, pero no de nombre. */
  async update(id: string, dto: UpdateRoleDto): Promise<RoleDetail> {
    const current = await this.findOne(id);
    const name = dto.name?.trim();
    if (name !== undefined && name !== current.name) {
      if (current.isSystem) throw new BadRequestException('Un rol del sistema no se puede renombrar');
      if (await this.roles.existsName(name, id)) throw new ConflictException('Ya existe un rol con ese nombre');
    }
    if (dto.permissions) await this.assertPermissions(dto.permissions);
    return this.roles.update(id, {
      name,
      description: dto.description === undefined ? undefined : dto.description?.trim() || null,
      permissions: dto.permissions && [...new Set(dto.permissions)],
    });
  }

  /** Borrado lógico; los roles del sistema no se eliminan. */
  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);
    if (role.isSystem) throw new BadRequestException('Un rol del sistema no se puede eliminar');
    await this.roles.softDelete(id);
  }

  async addUser(roleId: string, userId: string): Promise<RoleDetail> {
    await this.findOne(roleId);
    if (!(await this.users.exists(userId))) throw new BadRequestException('La persona no existe');
    await this.roles.addUser(roleId, userId);
    return this.findOne(roleId);
  }

  async removeUser(roleId: string, userId: string): Promise<RoleDetail> {
    await this.findOne(roleId);
    await this.roles.removeUser(roleId, userId);
    return this.findOne(roleId);
  }

  private async assertPermissions(keys: string[]): Promise<void> {
    if (keys.length && !(await this.roles.permissionsExist(keys))) throw new BadRequestException('Alguno de los permisos no existe');
  }
}
