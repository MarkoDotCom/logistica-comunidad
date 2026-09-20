import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, ValidateIf } from 'class-validator';
import { contract_type } from '../../../database/generated/enums.js';
import { CONTRACT_TYPES, ISO_DATE } from './create-contract.dto.js';

// Todos opcionales: solo se cambia lo que viene. null borra el término, el documento o las notas.
export class UpdateContractDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsIn(CONTRACT_TYPES)
  type?: contract_type;

  @IsOptional()
  @Matches(ISO_DATE, { message: 'startsAt debe tener formato YYYY-MM-DD' })
  startsAt?: string;

  @ValidateIf((_, v) => v !== undefined && v !== null)
  @Matches(ISO_DATE, { message: 'endsAt debe tener formato YYYY-MM-DD' })
  endsAt?: string | null;

  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(500)
  documentUrl?: string | null;

  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
