import { Body, Controller, Delete, Get, HttpCode, Param, ParseBoolPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import type { UnitDto, UnitSummary } from '../../database/tables/unit.table.js';
import { CreateUnitDto } from './dto/create-unit.dto.js';
import { UpdateUnitDto } from './dto/update-unit.dto.js';
import { UnitsService, type UnitDetail, type UnitNode } from './units.service.js';
import { RequirePermission } from '../auth/auth.decorators.js';

@Controller('units')
export class UnitsController {
  constructor(private readonly units: UnitsService) {}

  /** Navegación nivel a nivel: sin ?parentId= devuelve las comunidades; con él, los hijos directos. Solo vivas salvo ?includeDeleted=true. */
  @RequirePermission('units.read')
  @Get()
  findChildren(
    @Query('parentId', new ParseUUIDPipe({ optional: true })) parentId?: string,
    @Query('includeDeleted', new ParseBoolPipe({ optional: true })) includeDeleted?: boolean,
  ): Promise<UnitSummary[]> {
    return this.units.findChildren(parentId, includeDeleted ?? false);
  }

  @RequirePermission('units.read')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UnitDto> {
    return this.units.findOne(id);
  }

  /** Detalle completo: la unidad, sus ancestros (ruta), sus hijos vivos y sus contratos con la persona de cada uno. */
  @RequirePermission('units.read')
  @Get(':id/detail')
  findDetail(@Param('id', ParseUUIDPipe) id: string): Promise<UnitDetail> {
    return this.units.findDetail(id);
  }

  /** La unidad con todo su subárbol anidado. Con ?includeDeleted=true incluye las eliminadas. */
  @RequirePermission('units.read')
  @Get(':id/tree')
  findTree(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeDeleted', new ParseBoolPipe({ optional: true })) includeDeleted?: boolean,
  ): Promise<UnitNode> {
    return this.units.findTree(id, includeDeleted ?? false);
  }

  @RequirePermission('units.write')
  @Post()
  create(@Body() dto: CreateUnitDto): Promise<UnitDto> {
    return this.units.create(dto);
  }

  @RequirePermission('units.write')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUnitDto): Promise<UnitDto> {
    return this.units.update(id, dto);
  }

  /** Borrado lógico en cascada. Nunca borra físicamente. */
  @RequirePermission('units.delete')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ deleted: number }> {
    return this.units.remove(id);
  }

  @RequirePermission('units.delete')
  @Post(':id/restore')
  @HttpCode(200)
  restore(@Param('id', ParseUUIDPipe) id: string): Promise<UnitDto> {
    return this.units.restore(id);
  }
}
