import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @MaxLength(320)
  email: string;

  @IsString()
  @Length(2, 200)
  fullName: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  // Id en el proveedor de identidad (Clerk, Auth0...). Se puede asignar después.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  externalAuthId?: string;
}
