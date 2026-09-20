import { IsArray, IsOptional, IsString, Length, Matches, MaxLength, ValidateIf } from 'class-validator';

// Todos opcionales: solo se cambia lo que viene. `permissions` reemplaza el conjunto completo; null en description la borra.
export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsArray()
  @Matches(/^[a-z]+\.[a-z]+$/, { each: true, message: 'cada permiso debe tener formato recurso.accion' })
  permissions?: string[];
}
