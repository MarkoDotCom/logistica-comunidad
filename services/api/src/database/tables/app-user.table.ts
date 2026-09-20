import { Injectable } from '@nestjs/common';
import type { contract_type, unit_kind } from '../generated/enums.js';
import { toIsoDate } from '../dates.js';
import { PrismaService } from '../prisma.service.js';

export interface AppUserDto {
  id: string;
  email: string;
  externalAuthId: string | null;
  fullName: string;
  phone: string | null;
  isActive: boolean;
}

// Contrato visto desde el usuario: con qué unidad y en qué calidad
export interface UserContractDto {
  id: string;
  type: contract_type;
  startsAt: string;
  endsAt: string | null;
  unit: { id: string; kind: unit_kind; code: string; name: string | null };
}

export interface AppUserWithContracts extends AppUserDto {
  contracts: UserContractDto[];
}

export interface NewAppUser {
  email: string;
  fullName: string;
  phone: string | null;
  externalAuthId: string | null;
}

export interface AppUserPatch {
  email?: string;
  fullName?: string;
  phone?: string | null;
  externalAuthId?: string | null;
  isActive?: boolean;
}

const INCLUDE = {
  contracts: {
    select: {
      id: true,
      type: true,
      starts_at: true,
      ends_at: true,
      unit: { select: { id: true, kind: true, code: true, name: true } },
    },
    orderBy: { starts_at: 'desc' },
  },
} as const;

interface Row {
  id: string;
  email: string;
  external_auth_id: string | null;
  full_name: string;
  phone: string | null;
  is_active: boolean;
}

interface RowWithContracts extends Row {
  contracts: {
    id: string;
    type: contract_type;
    starts_at: Date;
    ends_at: Date | null;
    unit: { id: string; kind: unit_kind; code: string; name: string | null };
  }[];
}

function toUser(row: Row): AppUserDto {
  return { id: row.id, email: row.email, externalAuthId: row.external_auth_id, fullName: row.full_name, phone: row.phone, isActive: row.is_active };
}

function toUserWithContracts(row: RowWithContracts): AppUserWithContracts {
  return {
    ...toUser(row),
    contracts: row.contracts.map((c) => ({
      id: c.id,
      type: c.type,
      startsAt: toIsoDate(c.starts_at),
      endsAt: c.ends_at && toIsoDate(c.ends_at),
      unit: c.unit,
    })),
  };
}

@Injectable()
export class AppUserTable {
  constructor(private readonly prisma: PrismaService) {}

  /** Todos los usuarios, o los que coinciden con `search` en nombre o email. */
  async list(search?: string): Promise<AppUserDto[]> {
    const rows = await this.prisma.app_user.findMany({
      where: search
        ? { OR: [{ full_name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }
        : undefined,
      orderBy: { full_name: 'asc' },
    });
    return rows.map(toUser);
  }

  async findWithContracts(id: string): Promise<AppUserWithContracts | null> {
    const row = await this.prisma.app_user.findUnique({ where: { id }, include: INCLUDE });
    return row && toUserWithContracts(row);
  }

  async existsByEmail(email: string, exceptId?: string): Promise<boolean> {
    return (await this.prisma.app_user.count({ where: { email, ...(exceptId ? { id: { not: exceptId } } : {}) } })) > 0;
  }

  async create(user: NewAppUser): Promise<AppUserDto> {
    const row = await this.prisma.app_user.create({
      data: { email: user.email, full_name: user.fullName, phone: user.phone, external_auth_id: user.externalAuthId },
    });
    return toUser(row);
  }

  async update(id: string, patch: AppUserPatch): Promise<AppUserWithContracts> {
    const row = await this.prisma.app_user.update({
      where: { id },
      data: { email: patch.email, full_name: patch.fullName, phone: patch.phone, external_auth_id: patch.externalAuthId, is_active: patch.isActive },
      include: INCLUDE,
    });
    return toUserWithContracts(row);
  }
}
