import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersService, type UserDetail, type UserSummary } from './users.service.js';
import { RequirePermission } from '../auth/auth.decorators.js';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Lista todos, o filtra por nombre o email con ?search= */
  @RequirePermission('users.read')
  @Get()
  findAll(@Query('search') search?: string): Promise<UserSummary[]> {
    return this.users.findAll(search);
  }

  @RequirePermission('users.read')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserDetail> {
    return this.users.findOne(id);
  }

  @RequirePermission('users.write')
  @Post()
  create(@Body() dto: CreateUserDto): Promise<UserSummary> {
    return this.users.create(dto);
  }

  @RequirePermission('users.write')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto): Promise<UserDetail> {
    return this.users.update(id, dto);
  }
}
