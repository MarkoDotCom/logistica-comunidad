import { IsBoolean, IsEmail, IsOptional, IsString, Length, MaxLength, ValidateIf } from 'class-validator';

// Todos opcionales: solo se cambia lo que viene. Los contratos no se editan por aquí.
export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @IsString()
  @Length(2, 200)
  fullName?: string;

  // null borra el valor
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(50)
  phone?: string | null;

  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(200)
  externalAuthId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
