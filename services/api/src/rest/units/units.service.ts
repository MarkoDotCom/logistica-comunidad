import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ContractTable, type ContractDto } from '../../database/tables/contract.table.js';
import { UnitTable, type UnitDto, type UnitSummary } from '../../database/tables/unit.table.js';
import { canNest } from '../../database/unit-rank.js';
import { CreateUnitDto } from './dto/create-unit.dto.js';
import { UpdateUnitDto } from './dto/update-unit.dto.js';

// Para los mensajes de error, con artículo
const KIND_ES: Record<UnitDto['kind'], string> = { community: 'una comunidad', building: 'un edificio', apartment: 'un departamento', account: 'una cuenta' };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export interface UnitNode extends UnitDto {
  children: UnitNode[];
}

// Detalle completo: ruta hasta la raíz, hijos vivos y contratos con sus personas
export interface UnitDetail extends UnitDto {
  ancestors: UnitDto[];
  children: UnitSummary[];
  contracts: ContractDto[];
}

/** Arma el árbol a partir de la lista plana del subárbol (la raíz viene primero). */
export function buildTree(units: UnitDto[]): UnitNode {
  const nodes = new Map(units.map((u) => [u.id, { ...u, children: [] as UnitNode[] }]));
  for (const node of nodes.values()) {
    if (node.id !== units[0].id) nodes.get(node.parentId!)?.children.push(node);
  }
  return nodes.get(units[0].id)!;
}

@Injectable()
export class UnitsService {
  constructor(
    private readonly units: UnitTable,
    private readonly contracts: ContractTable,
  ) {}

  /** Hijos directos de `parentId`; sin él, las comunidades raíz. Solo vivos salvo `includeDeleted`. */
  findChildren(parentId?: string, includeDeleted = false): Promise<UnitSummary[]> {
    return this.units.listChildren(parentId ?? null, includeDeleted);
  }

  async findDetail(id: string): Promise<UnitDetail> {
    const unit = await this.findOne(id);
    const [ancestors, children, contracts] = await Promise.all([this.units.ancestors(id), this.units.listChildren(id), this.contracts.listByUnit(id)]);
    return { ...unit, ancestors, children, contracts };
  }

  async findOne(id: string): Promise<UnitDto> {
    const unit = await this.units.find(id);
    if (!unit) throw new NotFoundException('Unidad no encontrada');
    return unit;
  }

  /** El subárbol vivo; con `includeDeleted`, también las eliminadas (para poder restaurarlas). */
  async findTree(id: string, includeDeleted = false): Promise<UnitNode> {
    const flat = await this.units.subtree(id, includeDeleted);
    if (flat.length === 0) throw new NotFoundException('Unidad no encontrada');
    return buildTree(flat);
  }

  async create(dto: CreateUnitDto): Promise<UnitDto> {
    const parentId = dto.parentId ?? null;
    await this.assertValidPlacement(dto.kind, parentId, dto.code);
    return this.units.create({ parentId, kind: dto.kind, code: dto.code, name: dto.name ?? null });
  }

  async update(id: string, dto: UpdateUnitDto): Promise<UnitDto> {
    const current = await this.findOne(id);
    const next = {
      kind: dto.kind ?? current.kind,
      parentId: dto.parentId === undefined ? current.parentId : dto.parentId,
      code: dto.code ?? current.code,
    };
    const moves = next.parentId !== current.parentId;

    if (moves && next.parentId && (await this.units.isSelfOrDescendant(id, next.parentId))) {
      throw new BadRequestException('Una unidad no puede colgar de sí misma ni de su propio subárbol');
    }
    if (moves || next.kind !== current.kind || next.code !== current.code) {
      await this.assertValidPlacement(next.kind, next.parentId, next.code, id);
    }
    if (next.kind !== current.kind) {
      const lower = (await this.units.childKinds(id)).filter((k) => !canNest(next.kind, k));
      if (lower.length) throw new BadRequestException(`${cap(KIND_ES[next.kind])} no puede tener dentro ${lower.map((k) => KIND_ES[k]).join(' ni ')}`);
    }
    return this.units.update(id, dto);
  }

  /** Borrado lógico de la unidad y su subárbol. Devuelve cuántas unidades se eliminaron. */
  async remove(id: string): Promise<{ deleted: number }> {
    await this.findOne(id);
    return { deleted: await this.units.softDelete(id) };
  }

  /** Revierte un borrado lógico. El padre debe estar vivo: se restaura de arriba hacia abajo. */
  async restore(id: string): Promise<UnitDto> {
    const unit = await this.units.findAny(id);
    if (!unit) throw new NotFoundException('Unidad no encontrada');
    if (!unit.deletedAt) throw new BadRequestException('La unidad no está eliminada');
    if (unit.parentId && !(await this.units.find(unit.parentId))) {
      throw new BadRequestException('La unidad padre está eliminada; restaúrala primero');
    }
    if (await this.units.existsSiblingCode(unit.parentId, unit.code)) {
      throw new ConflictException('Ya existe una unidad viva con ese código en el mismo nivel');
    }
    return this.units.restore(id);
  }

  /**
   * Reglas de ubicación: community es la única raíz, el padre existe (vivo) y es de rango superior
   * (comunidad > edificio > departamento > cuenta; se pueden saltar niveles), y el código no se repite entre hermanos vivos.
   */
  private async assertValidPlacement(kind: UnitDto['kind'], parentId: string | null, code: string, exceptId?: string): Promise<void> {
    if (kind === 'community' && parentId) throw new BadRequestException('Una comunidad no puede tener unidad padre');
    if (kind !== 'community' && !parentId) throw new BadRequestException('Toda unidad que no sea comunidad necesita parentId');
    if (parentId) {
      const parent = await this.units.find(parentId);
      if (!parent) throw new BadRequestException('La unidad padre no existe');
      if (!canNest(parent.kind, kind)) throw new BadRequestException(`${cap(KIND_ES[kind])} no puede colgar de ${KIND_ES[parent.kind]}`);
    }
    if (await this.units.existsSiblingCode(parentId, code, exceptId)) throw new ConflictException('Ya existe una unidad con ese código en el mismo nivel');
  }
}
