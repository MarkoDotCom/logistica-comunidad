import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import type { ContractDto } from '../../database/tables/contract.table.js';
import { ContractsService } from './contracts.service.js';
import { CreateContractDto } from './dto/create-contract.dto.js';
import { UpdateContractDto } from './dto/update-contract.dto.js';
import { RequirePermission } from '../auth/auth.decorators.js';

// Los contratos se crean sobre una unidad y se modifican por su propio id. El listado va en GET /units/:id/detail.
@Controller()
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @RequirePermission('contracts.write')
  @Post('units/:unitId/contracts')
  create(@Param('unitId', ParseUUIDPipe) unitId: string, @Body() dto: CreateContractDto): Promise<ContractDto> {
    return this.contracts.create(unitId, dto);
  }

  @RequirePermission('contracts.read')
  @Get('contracts/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ContractDto> {
    return this.contracts.findOne(id);
  }

  @RequirePermission('contracts.write')
  @Patch('contracts/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateContractDto): Promise<ContractDto> {
    return this.contracts.update(id, dto);
  }
}
