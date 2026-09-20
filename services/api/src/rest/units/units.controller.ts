import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import type { UnitDto } from '../../database/tables/unit.table.js';
import { CreateUnitDto } from './dto/create-unit.dto.js';
import { UpdateUnitDto } from './dto/update-unit.dto.js';
import { UnitsService, type UnitNode } from './units.service.js';

@Controller('units')
export class UnitsController {
  constructor(private readonly units: UnitsService) {}

  /** Navegación nivel a nivel: sin ?parentId= devuelve las comunidades; con él, los hijos directos. */
  @Get()
  findChildren(@Query('parentId', new ParseUUIDPipe({ optional: true })) parentId?: string): Promise<UnitDto[]> {
    return this.units.findChildren(parentId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UnitDto> {
    return this.units.findOne(id);
  }

  /** La unidad con todo su subárbol anidado. */
  @Get(':id/tree')
  findTree(@Param('id', ParseUUIDPipe) id: string): Promise<UnitNode> {
    return this.units.findTree(id);
  }

  @Post()
  create(@Body() dto: CreateUnitDto): Promise<UnitDto> {
    return this.units.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUnitDto): Promise<UnitDto> {
    return this.units.update(id, dto);
  }
}
