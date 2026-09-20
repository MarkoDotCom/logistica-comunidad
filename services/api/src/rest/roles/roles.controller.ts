import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import type { PermissionDto, RoleDetail, RoleSummary } from '../../database/tables/role.table.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { RolesService } from './roles.service.js';

@Controller()
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  /** Catálogo fijo de permisos (recurso.accion). */
  @Get('permissions')
  permissions(): Promise<PermissionDto[]> {
    return this.roles.permissions();
  }

  @Get('roles')
  findAll(): Promise<RoleSummary[]> {
    return this.roles.findAll();
  }

  @Get('roles/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RoleDetail> {
    return this.roles.findOne(id);
  }

  @Post('roles')
  create(@Body() dto: CreateRoleDto): Promise<RoleDetail> {
    return this.roles.create(dto);
  }

  @Patch('roles/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto): Promise<RoleDetail> {
    return this.roles.update(id, dto);
  }

  /** Borrado lógico. */
  @Delete('roles/:id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.roles.remove(id);
  }

  /** Asigna el rol a la persona (idempotente). */
  @Put('roles/:id/users/:userId')
  addUser(@Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) userId: string): Promise<RoleDetail> {
    return this.roles.addUser(id, userId);
  }

  @Delete('roles/:id/users/:userId')
  removeUser(@Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) userId: string): Promise<RoleDetail> {
    return this.roles.removeUser(id, userId);
  }
}
