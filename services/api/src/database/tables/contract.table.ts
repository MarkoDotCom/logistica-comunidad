import { Injectable } from '@nestjs/common';
import { fromIsoDate, toIsoDate } from '../dates.js';
import type { contract_type } from '../generated/enums.js';
import { PrismaService } from '../prisma.service.js';

export interface ContractDto {
  id: string;
  unitId: string;
  type: contract_type;
  startsAt: string; // YYYY-MM-DD
  endsAt: string | null;
  documentUrl: string | null;
  notes: string | null;
  user: { id: string; fullName: string; email: string };
}

export interface NewContract {
  unitId: string;
  userId: string;
  type: contract_type;
  startsAt: string;
  endsAt: string | null;
  documentUrl: string | null;
  notes: string | null;
}

export interface ContractPatch {
  userId?: string;
  type?: contract_type;
  startsAt?: string;
  endsAt?: string | null;
  documentUrl?: string | null;
  notes?: string | null;
}

const SELECT = {
  id: true,
  unit_id: true,
  type: true,
  starts_at: true,
  ends_at: true,
  document_url: true,
  notes: true,
  user: { select: { id: true, full_name: true, email: true } },
} as const;

interface Row {
  id: string;
  unit_id: string;
  type: contract_type;
  starts_at: Date;
  ends_at: Date | null;
  document_url: string | null;
  notes: string | null;
  user: { id: string; full_name: string; email: string };
}

function toContract(row: Row): ContractDto {
  return {
    id: row.id,
    unitId: row.unit_id,
    type: row.type,
    startsAt: toIsoDate(row.starts_at),
    endsAt: row.ends_at && toIsoDate(row.ends_at),
    documentUrl: row.document_url,
    notes: row.notes,
    user: { id: row.user.id, fullName: row.user.full_name, email: row.user.email },
  };
}

@Injectable()
export class ContractTable {
  constructor(private readonly prisma: PrismaService) {}

  /** Contratos vigentes hoy y cuántos de ellos terminan dentro de `days` días. */
  async countCurrent(days: number): Promise<{ current: number; endingSoon: number }> {
    const rows = await this.prisma.$queryRaw<{ current: bigint; ending_soon: bigint }[]>`
      SELECT count(*) AS current,
             count(*) FILTER (WHERE ends_at <= current_date + ${days}::int) AS ending_soon
      FROM users.contract
      WHERE starts_at <= current_date AND (ends_at IS NULL OR ends_at >= current_date)`;
    return { current: Number(rows[0].current), endingSoon: Number(rows[0].ending_soon) };
  }

  /** Contratos de una unidad con la persona de cada uno, del más reciente al más antiguo. */
  async listByUnit(unitId: string): Promise<ContractDto[]> {
    const rows = await this.prisma.contract.findMany({ where: { unit_id: unitId }, select: SELECT, orderBy: { starts_at: 'desc' } });
    return rows.map(toContract);
  }

  async find(id: string): Promise<ContractDto | null> {
    const row = await this.prisma.contract.findUnique({ where: { id }, select: SELECT });
    return row && toContract(row);
  }

  async create(c: NewContract): Promise<ContractDto> {
    const row = await this.prisma.contract.create({
      data: {
        unit_id: c.unitId,
        user_id: c.userId,
        type: c.type,
        starts_at: fromIsoDate(c.startsAt),
        ends_at: c.endsAt === null ? null : fromIsoDate(c.endsAt),
        document_url: c.documentUrl,
        notes: c.notes,
      },
      select: SELECT,
    });
    return toContract(row);
  }

  async update(id: string, patch: ContractPatch): Promise<ContractDto> {
    const row = await this.prisma.contract.update({
      where: { id },
      data: {
        user_id: patch.userId,
        type: patch.type,
        starts_at: patch.startsAt === undefined ? undefined : fromIsoDate(patch.startsAt),
        ends_at: patch.endsAt === undefined ? undefined : patch.endsAt === null ? null : fromIsoDate(patch.endsAt),
        document_url: patch.documentUrl,
        notes: patch.notes,
      },
      select: SELECT,
    });
    return toContract(row);
  }
}
