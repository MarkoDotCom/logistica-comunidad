import { Body, Controller, Delete, Get, HttpCode, Param, ParseBoolPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import type { UnitDto } from '../../database/tables/unit.table.js';
import { CreateUnitDto } from './dto/create-unit.dto.js';
import { UpdateUnitDto } from './dto/update-unit.dto.js';
import { UnitsService, type UnitNode } from './units.service.js';

@Controller('units')
export class UnitsController {
  constructor(private readonly units: UnitsService) {}

  /** Navegación nivel a nivel: sin ?parentId= devuelve las comunidades; con él, los hijos directos. Solo vivas. */
  @Get()
  findChildren(@Query('parentId', new ParseUUIDPipe({ optional: true })) parentId?: string): Promise<UnitDto[]> {
    return this.units.findChildren(parentId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UnitDto> {
    return this.units.findOne(id);
  }

  /** La unidad con todo su subárbol anidado. Con ?includeDeleted=true incluye las eliminadas. */
  @Get(':id/tree')
  findTree(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeDeleted', new ParseBoolPipe({ optional: true })) includeDeleted?: boolean,
  ): Promise<UnitNode> {
    return this.units.findTree(id, includeDeleted ?? false);
  }

  @Post()
  create(@Body() dto: CreateUnitDto): Promise<UnitDto> {
    return this.units.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUnitDto): Promise<UnitDto> {
    return this.units.update(id, dto);
  }

  /** Borrado lógico en cascada. Nunca borra físicamente. */
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ deleted: number }> {
    return this.units.remove(id);
  }

  @Post(':id/restore')
  @HttpCode(200)
  restore(@Param('id', ParseUUIDPipe) id: string): Promise<UnitDto> {
    return this.units.restore(id);
  }
}
