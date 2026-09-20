import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, ValidateIf } from 'class-validator';
import { contract_type } from '../../../database/generated/enums.js';

export const CONTRACT_TYPES = Object.values(contract_type);
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateContractDto {
  @IsUUID()
  userId: string;

  @IsIn(CONTRACT_TYPES)
  type: contract_type;

  @Matches(ISO_DATE, { message: 'startsAt debe tener formato YYYY-MM-DD' })
  startsAt: string;

  // null o ausente = sin término
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @Matches(ISO_DATE, { message: 'endsAt debe tener formato YYYY-MM-DD' })
  endsAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  documentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
