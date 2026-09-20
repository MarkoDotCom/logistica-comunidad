import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

export interface PermissionDto {
  key: string; // 'units.write'
  resource: string;
  action: string;
  description: string;
}

export interface RoleSummary {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionCount: number;
  userCount: number;
}

export interface RoleDetail extends RoleSummary {
  permissions: string[]; // claves
  users: { id: string; fullName: string; email: string }[];
}

export interface NewRole {
  name: string;
  description: string | null;
  permissions: string[];
}

export interface RolePatch {
  name?: string;
  description?: string | null;
  permissions?: string[]; // reemplaza el conjunto completo
}

const COUNTS = { _count: { select: { permissions: true, users: true } } } as const;

interface SummaryRow {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  _count: { permissions: number; users: number };
}

function toSummary(row: SummaryRow): RoleSummary {
  return { id: row.id, name: row.name, description: row.description, isSystem: row.is_system, permissionCount: row._count.permissions, userCount: row._count.users };
}

@Injectable()
export class RoleTable {
  constructor(private readonly prisma: PrismaService) {}

  async listPermissions(): Promise<PermissionDto[]> {
    return this.prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
  }

  /** ¿Existen todas las claves? */
  async permissionsExist(keys: string[]): Promise<boolean> {
    const unique = [...new Set(keys)];
    return (await this.prisma.permission.count({ where: { key: { in: unique } } })) === unique.length;
  }

  /** Roles vivos con sus conteos. */
  async list(): Promise<RoleSummary[]> {
    const rows = await this.prisma.role.findMany({ where: { deleted_at: null }, include: COUNTS, orderBy: { name: 'asc' } });
    return rows.map(toSummary);
  }

  /** ¿Existen (vivos) todos los roles? */
  async allExist(ids: string[]): Promise<boolean> {
    const unique = [...new Set(ids)];
    return (await this.prisma.role.count({ where: { id: { in: unique }, deleted_at: null } })) === unique.length;
  }

  async find(id: string): Promise<RoleDetail | null> {
    const row = await this.prisma.role.findUnique({
      where: { id, deleted_at: null },
      include: {
        ...COUNTS,
        permissions: { select: { permission_key: true }, orderBy: { permission_key: 'asc' } },
        users: { select: { user: { select: { id: true, full_name: true, email: true } } }, orderBy: { user: { full_name: 'asc' } } },
      },
    });
    if (!row) return null;
    return {
      ...toSummary(row),
      permissions: row.permissions.map((p) => p.permission_key),
      users: row.users.map((u) => ({ id: u.user.id, fullName: u.user.full_name, email: u.user.email })),
    };
  }

  async existsName(name: string, exceptId?: string): Promise<boolean> {
    return (await this.prisma.role.count({ where: { name, deleted_at: null, ...(exceptId ? { id: { not: exceptId } } : {}) } })) > 0;
  }

  async create(role: NewRole): Promise<RoleDetail> {
    const created = await this.prisma.role.create({
      data: { name: role.name, description: role.description, permissions: { create: role.permissions.map((key) => ({ permission_key: key })) } },
    });
    return (await this.find(created.id))!;
  }

  /** Actualiza los campos que vienen; si viene `permissions`, reemplaza el conjunto completo. */
  async update(id: string, patch: RolePatch): Promise<RoleDetail> {
    await this.prisma.$transaction(async (tx) => {
      await tx.role.update({ where: { id }, data: { name: patch.name, description: patch.description } });
      if (patch.permissions !== undefined) {
        await tx.role_permission.deleteMany({ where: { role_id: id } });
        await tx.role_permission.createMany({ data: patch.permissions.map((key) => ({ role_id: id, permission_key: key })) });
      }
    });
    return (await this.find(id))!;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.role.update({ where: { id }, data: { deleted_at: new Date() } });
  }

  /** Asigna el rol al usuario; si ya lo tiene, no hace nada. */
  async addUser(roleId: string, userId: string): Promise<void> {
    await this.prisma.user_role.upsert({ where: { user_id_role_id: { user_id: userId, role_id: roleId } }, create: { user_id: userId, role_id: roleId }, update: {} });
  }

  async removeUser(roleId: string, userId: string): Promise<void> {
    await this.prisma.user_role.deleteMany({ where: { user_id: userId, role_id: roleId } });
  }
}
