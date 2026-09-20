import { Injectable } from '@nestjs/common';
import type { unit_kind } from '../generated/enums.js';
import { PrismaService } from '../prisma.service.js';

export interface UnitDto {
  id: string;
  parentId: string | null;
  kind: unit_kind;
  code: string;
  name: string | null;
  deletedAt: string | null; // ISO 8601; null = viva
}

// Fila de un listado por nivel: cuántos hijos vivos tiene
export interface UnitSummary extends UnitDto {
  childrenCount: number;
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
}

interface Row {
  id: string;
  parent_id: string | null;
  kind: unit_kind;
  code: string;
  name: string | null;
  deleted_at: Date | null;
}

function toUnit(row: Row): UnitDto {
  return { id: row.id, parentId: row.parent_id, kind: row.kind, code: row.code, name: row.name, deletedAt: row.deleted_at?.toISOString() ?? null };
}

// Las operaciones normales ven solo unidades vivas (deleted_at IS NULL); las que dicen "any" o "includeDeleted" ven todas.
@Injectable()
export class UnitTable {
  constructor(private readonly prisma: PrismaService) {}

  /** Hijos directos de una unidad (con `null`, las comunidades raíz), con su número de hijos vivos. Sin `includeDeleted`, solo vivos. */
  async listChildren(parentId: string | null, includeDeleted = false): Promise<UnitSummary[]> {
    const rows = await this.prisma.unit.findMany({
      where: { parent_id: parentId, ...(includeDeleted ? {} : { deleted_at: null }) },
      include: { _count: { select: { children: { where: { deleted_at: null } } } } },
      orderBy: { code: 'asc' },
    });
    return rows.map((row) => ({ ...toUnit(row), childrenCount: row._count.children }));
  }

  /** Unidades vivas por tipo. */
  async countByKind(): Promise<Record<unit_kind, number>> {
    const groups = await this.prisma.unit.groupBy({ by: ['kind'], where: { deleted_at: null }, _count: { _all: true } });
    const counts = { community: 0, building: 0, apartment: 0, account: 0 };
    for (const g of groups) counts[g.kind] = g._count._all;
    return counts;
  }

  /** Una unidad viva. */
  async find(id: string): Promise<UnitDto | null> {
    const row = await this.prisma.unit.findUnique({ where: { id, deleted_at: null } });
    return row && toUnit(row);
  }

  /** Una unidad, viva o eliminada. */
  async findAny(id: string): Promise<UnitDto | null> {
    const row = await this.prisma.unit.findUnique({ where: { id } });
    return row && toUnit(row);
  }

  /** La unidad y todo su subárbol, en orden de recorrido (padres antes que hijos). Sin `includeDeleted`, solo lo vivo. */
  async subtree(id: string, includeDeleted = false): Promise<UnitDto[]> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      WITH RECURSIVE tree AS (
        SELECT id, parent_id, kind, code, name, deleted_at, 0 AS depth, code::text AS path
        FROM units.unit WHERE id = ${id}::uuid AND (${includeDeleted} OR deleted_at IS NULL)
        UNION ALL
        SELECT u.id, u.parent_id, u.kind, u.code, u.name, u.deleted_at, t.depth + 1, t.path || '/' || u.code
        FROM units.unit u JOIN tree t ON u.parent_id = t.id
        WHERE ${includeDeleted} OR u.deleted_at IS NULL
      )
      SELECT id, parent_id, kind, code, name, deleted_at FROM tree ORDER BY depth, path`;
    return rows.map(toUnit);
  }

  /** Ancestros de una unidad, de la raíz hacia el padre directo (vivos o no). */
  async ancestors(id: string): Promise<UnitDto[]> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      WITH RECURSIVE up AS (
        SELECT u.id, u.parent_id, u.kind, u.code, u.name, u.deleted_at, 0 AS depth
        FROM units.unit u WHERE u.id = (SELECT parent_id FROM units.unit WHERE id = ${id}::uuid)
        UNION ALL
        SELECT u.id, u.parent_id, u.kind, u.code, u.name, u.deleted_at, up.depth + 1
        FROM units.unit u JOIN up ON u.id = up.parent_id
      )
      SELECT id, parent_id, kind, code, name, deleted_at FROM up ORDER BY depth DESC`;
    return rows.map(toUnit);
  }

  /** Tipos distintos de los hijos directos (vivos o eliminados). */
  async childKinds(id: string): Promise<unit_kind[]> {
    const groups = await this.prisma.unit.groupBy({ by: ['kind'], where: { parent_id: id } });
    return groups.map((g) => g.kind);
  }

  /** ¿`candidateId` es `ancestorId` o cuelga de él (viva o eliminada)? Sirve para impedir ciclos al mover una unidad. */
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

  /** ¿Ya hay un hermano vivo con ese código bajo `parentId` (o una raíz viva, si es null)? */
  async existsSiblingCode(parentId: string | null, code: string, exceptId?: string): Promise<boolean> {
    return (await this.prisma.unit.count({ where: { parent_id: parentId, code, deleted_at: null, ...(exceptId ? { id: { not: exceptId } } : {}) } })) > 0;
  }

  async create(unit: NewUnit): Promise<UnitDto> {
    const row = await this.prisma.unit.create({ data: { parent_id: unit.parentId, kind: unit.kind, code: unit.code, name: unit.name } });
    return toUnit(row);
  }

  async update(id: string, patch: UnitPatch): Promise<UnitDto> {
    const row = await this.prisma.unit.update({ where: { id }, data: { parent_id: patch.parentId, kind: patch.kind, code: patch.code, name: patch.name } });
    return toUnit(row);
  }

  /** Borrado lógico de la unidad y de todo su subárbol vivo, con el mismo instante. Devuelve cuántas se marcaron. */
  async softDelete(id: string): Promise<number> {
    return this.prisma.$executeRaw`
      WITH RECURSIVE tree AS (
        SELECT id FROM units.unit WHERE id = ${id}::uuid
        UNION ALL
        SELECT u.id FROM units.unit u JOIN tree t ON u.parent_id = t.id
      )
      UPDATE units.unit SET deleted_at = now() WHERE id IN (SELECT id FROM tree) AND deleted_at IS NULL`;
  }

  /** Revierte el borrado de la unidad y de las del subárbol que se eliminaron con ella (mismo deleted_at). */
  async restore(id: string): Promise<UnitDto> {
    await this.prisma.$executeRaw`
      WITH RECURSIVE tree AS (
        SELECT id, deleted_at FROM units.unit WHERE id = ${id}::uuid
        UNION ALL
        SELECT u.id, u.deleted_at FROM units.unit u JOIN tree t ON u.parent_id = t.id
      )
      UPDATE units.unit SET deleted_at = NULL
      WHERE id IN (SELECT id FROM tree)
        AND deleted_at = (SELECT deleted_at FROM units.unit WHERE id = ${id}::uuid)`;
    return (await this.findAny(id))!;
  }
}
