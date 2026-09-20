import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CONTRACT_TYPES_BY_KIND } from '../../database/contract-rules.js';
import type { contract_type, unit_kind } from '../../database/generated/enums.js';
import { AppUserTable } from '../../database/tables/app-user.table.js';
import { ContractTable, type ContractDto } from '../../database/tables/contract.table.js';
import { UnitTable } from '../../database/tables/unit.table.js';
import { CreateContractDto } from './dto/create-contract.dto.js';
import { UpdateContractDto } from './dto/update-contract.dto.js';

const TYPE_ES: Record<contract_type, string> = { ownership: 'propiedad', lease: 'arriendo', administration: 'administración', employment: 'empleo' };
const KIND_ES: Record<unit_kind, string> = { community: 'una comunidad', building: 'un edificio', apartment: 'un departamento', account: 'una cuenta' };

@Injectable()
export class ContractsService {
  constructor(
    private readonly contracts: ContractTable,
    private readonly units: UnitTable,
    private readonly users: AppUserTable,
  ) {}

  async findOne(id: string): Promise<ContractDto> {
    const contract = await this.contracts.find(id);
    if (!contract) throw new NotFoundException('Contrato no encontrado');
    return contract;
  }

  async create(unitId: string, dto: CreateContractDto): Promise<ContractDto> {
    const unit = await this.units.find(unitId);
    if (!unit) throw new NotFoundException('Unidad no encontrada');
    this.assertTypeAllowed(unit.kind, dto.type);
    await this.assertUserExists(dto.userId);
    assertDates(dto.startsAt, dto.endsAt ?? null);
    return this.contracts.create({
      unitId,
      userId: dto.userId,
      type: dto.type,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt ?? null,
      documentUrl: dto.documentUrl ?? null,
      notes: dto.notes ?? null,
    });
  }

  async update(id: string, dto: UpdateContractDto): Promise<ContractDto> {
    const current = await this.findOne(id);
    if (dto.type && dto.type !== current.type) {
      const unit = await this.units.findAny(current.unitId);
      this.assertTypeAllowed(unit!.kind, dto.type);
    }
    if (dto.userId && dto.userId !== current.user.id) await this.assertUserExists(dto.userId);
    assertDates(dto.startsAt ?? current.startsAt, dto.endsAt === undefined ? current.endsAt : dto.endsAt);
    return this.contracts.update(id, dto);
  }

  /** Qué tipos admite cada tipo de unidad: comunidad → administración y empleo; edificio → empleo; departamento → propiedad y arriendo. */
  private assertTypeAllowed(kind: unit_kind, type: contract_type): void {
    if (!CONTRACT_TYPES_BY_KIND[kind].includes(type)) {
      throw new BadRequestException(`Un contrato de ${TYPE_ES[type]} no puede ir sobre ${KIND_ES[kind]}`);
    }
  }

  private async assertUserExists(userId: string): Promise<void> {
    if (!(await this.users.exists(userId))) throw new BadRequestException('La persona no existe');
  }
}

function assertDates(startsAt: string, endsAt: string | null): void {
  if (endsAt !== null && endsAt < startsAt) throw new BadRequestException('La fecha de término no puede ser anterior a la de inicio');
}
