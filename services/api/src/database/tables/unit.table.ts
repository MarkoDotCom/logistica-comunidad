import { Injectable } from '@nestjs/common';
import type { unit_kind } from '../generated/enums.js';
import { PrismaService } from '../prisma.service.js';

export interface UnitDto {
  id: string;
  parentId: string | null;
  kind: unit_kind;
  code: string;
  name: string | null;
  isActive: boolean;
}

export interface NewUnit {
  parentId: string | null;
  kind: unit_kind;
  code: string;
  name: string | null;
}

export interface UnitPatch {
  parentId?: string | null;
  kind?: unit_kind;
  code?: string;
  name?: string | null;
  isActive?: boolean;
}

interface Row {
  id: string;
  parent_id: string | null;
  kind: unit_kind;
  code: string;
  name: string | null;
  is_active: boolean;
}

function toUnit(row: Row): UnitDto {
  return { id: row.id, parentId: row.parent_id, kind: row.kind, code: row.code, name: row.name, isActive: row.is_active };
}

@Injectable()
export class UnitTable {
  constructor(private readonly prisma: PrismaService) {}

  /** Hijos directos de una unidad; con `null`, las comunidades raíz. */
  async listChildren(parentId: string | null): Promise<UnitDto[]> {
    const rows = await this.prisma.unit.findMany({ where: { parent_id: parentId }, orderBy: { code: 'asc' } });
    return rows.map(toUnit);
  }

  async find(id: string): Promise<UnitDto | null> {
    const row = await this.prisma.unit.findUnique({ where: { id } });
    return row && toUnit(row);
  }

  /** La unidad y todo su subárbol, en orden de recorrido (padres antes que hijos). */
  async subtree(id: string): Promise<UnitDto[]> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      WITH RECURSIVE tree AS (
        SELECT id, parent_id, kind, code, name, is_active, 0 AS depth, code::text AS path
        FROM units.unit WHERE id = ${id}::uuid
        UNION ALL
        SELECT u.id, u.parent_id, u.kind, u.code, u.name, u.is_active, t.depth + 1, t.path || '/' || u.code
        FROM units.unit u JOIN tree t ON u.parent_id = t.id
      )
      SELECT id, parent_id, kind, code, name, is_active FROM tree ORDER BY depth, path`;
    return rows.map(toUnit);
  }

  /** ¿`candidateId` es `ancestorId` o cuelga de él? Sirve para impedir ciclos al mover una unidad. */
  async isSelfOrDescendant(ancestorId: string, candidateId: string): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<{ found: boolean }[]>`
      WITH RECURSIVE tree AS (
        SELECT id FROM units.unit WHERE id = ${ancestorId}::uuid
        UNION ALL
        SELECT u.id FROM units.unit u JOIN tree t ON u.parent_id = t.id
      )
      SELECT EXISTS (SELECT 1 FROM tree WHERE id = ${candidateId}::uuid) AS found`;
    return rows[0]?.found ?? false;
  }

  /** ¿Ya hay un hermano con ese código bajo `parentId` (o una raíz, si es null)? */
  async existsSiblingCode(parentId: string | null, code: string, exceptId?: string): Promise<boolean> {
    return (await this.prisma.unit.count({ where: { parent_id: parentId, code, ...(exceptId ? { id: { not: exceptId } } : {}) } })) > 0;
  }

  async create(unit: NewUnit): Promise<UnitDto> {
    const row = await this.prisma.unit.create({ data: { parent_id: unit.parentId, kind: unit.kind, code: unit.code, name: unit.name } });
    return toUnit(row);
  }

  async update(id: string, patch: UnitPatch): Promise<UnitDto> {
    const row = await this.prisma.unit.update({
      where: { id },
      data: { parent_id: patch.parentId, kind: patch.kind, code: patch.code, name: patch.name, is_active: patch.isActive },
    });
    return toUnit(row);
  }
}
