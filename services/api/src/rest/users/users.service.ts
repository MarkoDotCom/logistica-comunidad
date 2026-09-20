import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AppUserTable, type AppUserDto, type AppUserWithContracts } from '../../database/tables/app-user.table.js';
import { RoleTable } from '../../database/tables/role.table.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

export type UserSummary = AppUserDto;
export type UserDetail = AppUserWithContracts;

@Injectable()
export class UsersService {
  constructor(
    private readonly users: AppUserTable,
    private readonly roles: RoleTable,
  ) {}

  findAll(search?: string): Promise<UserSummary[]> {
    return this.users.list(search?.trim() || undefined);
  }

  async findOne(id: string): Promise<UserDetail> {
    const user = await this.users.findWithContracts(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(dto: CreateUserDto): Promise<UserSummary> {
    if (await this.users.existsByEmail(dto.email)) throw new ConflictException('Ya existe un usuario con ese email');
    return this.users.create({ email: dto.email, fullName: dto.fullName, phone: dto.phone ?? null, externalAuthId: dto.externalAuthId ?? null });
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDetail> {
    if (!(await this.users.findWithContracts(id))) throw new NotFoundException('Usuario no encontrado');
    if (dto.email && (await this.users.existsByEmail(dto.email, id))) throw new ConflictException('Ya existe un usuario con ese email');
    const { roleIds, ...fields } = dto;
    if (roleIds !== undefined) {
      if (!(await this.roles.allExist(roleIds))) throw new BadRequestException('Alguno de los roles no existe');
      await this.users.setRoles(id, roleIds);
    }
    return this.users.update(id, fields);
  }
}
