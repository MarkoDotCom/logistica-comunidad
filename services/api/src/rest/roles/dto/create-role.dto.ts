import { IsArray, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @Length(2, 80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  // Claves del catálogo (units.write…); puede ir vacío
  @IsArray()
  @Matches(/^[a-z]+\.[a-z]+$/, { each: true, message: 'cada permiso debe tener formato recurso.accion' })
  permissions: string[];
}
