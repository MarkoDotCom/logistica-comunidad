import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import type { PermissionDto, RoleDetail, RoleSummary } from '../../database/tables/role.table.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { RolesService } from './roles.service.js';
import { RequirePermission } from '../auth/auth.decorators.js';

@Controller()
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  /** Catálogo fijo de permisos (recurso.accion). */
  @RequirePermission('roles.read')
  @Get('permissions')
  permissions(): Promise<PermissionDto[]> {
    return this.roles.permissions();
  }

  @RequirePermission('roles.read')
  @Get('roles')
  findAll(): Promise<RoleSummary[]> {
    return this.roles.findAll();
  }

  @RequirePermission('roles.read')
  @Get('roles/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RoleDetail> {
    return this.roles.findOne(id);
  }

  @RequirePermission('roles.write')
  @Post('roles')
  create(@Body() dto: CreateRoleDto): Promise<RoleDetail> {
    return this.roles.create(dto);
  }

  @RequirePermission('roles.write')
  @Patch('roles/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto): Promise<RoleDetail> {
    return this.roles.update(id, dto);
  }

  /** Borrado lógico. */
  @RequirePermission('roles.write')
  @Delete('roles/:id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.roles.remove(id);
  }

  /** Asigna el rol a la persona (idempotente). */
  @RequirePermission('roles.write')
  @Put('roles/:id/users/:userId')
  addUser(@Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) userId: string): Promise<RoleDetail> {
    return this.roles.addUser(id, userId);
  }

  @RequirePermission('roles.write')
  @Delete('roles/:id/users/:userId')
  removeUser(@Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) userId: string): Promise<RoleDetail> {
    return this.roles.removeUser(id, userId);
  }
}
