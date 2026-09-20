import { IsIn, IsOptional, IsString, IsUUID, Length, MaxLength, ValidateIf } from 'class-validator';
import { unit_kind } from '../../../database/generated/enums.js';
import { UNIT_KINDS } from './create-unit.dto.js';

// Todos opcionales: solo se cambia lo que viene. Cambiar parentId mueve la unidad con todo su subárbol.
// Eliminar y restaurar tienen sus propios endpoints.
export class UpdateUnitDto {
  // null = convertir en raíz (solo válido si kind queda en community)
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsIn(UNIT_KINDS)
  kind?: unit_kind;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  code?: string;

  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(200)
  name?: string | null;
}
