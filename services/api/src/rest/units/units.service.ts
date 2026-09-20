import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UnitTable, type UnitDto } from '../../database/tables/unit.table.js';
import { CreateUnitDto } from './dto/create-unit.dto.js';
import { UpdateUnitDto } from './dto/update-unit.dto.js';

export interface UnitNode extends UnitDto {
  children: UnitNode[];
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
  constructor(private readonly units: UnitTable) {}

  /** Hijos directos de `parentId`; sin él, las comunidades raíz. */
  findChildren(parentId?: string): Promise<UnitDto[]> {
    return this.units.listChildren(parentId ?? null);
  }

  async findOne(id: string): Promise<UnitDto> {
    const unit = await this.units.find(id);
    if (!unit) throw new NotFoundException('Unidad no encontrada');
    return unit;
  }

  async findTree(id: string): Promise<UnitNode> {
    const flat = await this.units.subtree(id);
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
    return this.units.update(id, dto);
  }

  /** Reglas de ubicación: community es la única raíz, el padre existe y el código no se repite entre hermanos. */
  private async assertValidPlacement(kind: UnitDto['kind'], parentId: string | null, code: string, exceptId?: string): Promise<void> {
    if (kind === 'community' && parentId) throw new BadRequestException('Una comunidad no puede tener unidad padre');
    if (kind !== 'community' && !parentId) throw new BadRequestException('Toda unidad que no sea comunidad necesita parentId');
    if (parentId && !(await this.units.find(parentId))) throw new BadRequestException('La unidad padre no existe');
    if (await this.units.existsSiblingCode(parentId, code, exceptId)) throw new ConflictException('Ya existe una unidad con ese código en el mismo nivel');
  }
}
