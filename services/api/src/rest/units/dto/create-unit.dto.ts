import { IsIn, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { unit_kind } from '../../../database/generated/enums.js';

export const UNIT_KINDS = Object.values(unit_kind);

export class CreateUnitDto {
  // Obligatorio salvo para community, que es raíz
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsIn(UNIT_KINDS)
  kind: unit_kind;

  // Identificador visible, único entre hermanos: "A", "101", "GC"
  @IsString()
  @Length(1, 50)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;
}
