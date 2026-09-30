import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
  MaxLength,
  IsUUID,
  Matches,
  ValidateIf,
} from 'class-validator';

export class CreateUserDto {

  @IsString()
  @IsNotEmpty({ message: 'El nombre del usuario es obligatorio'})
  @Length(2, 20)
  @Matches(/^[\p{L}][\p{L}\s.'-]*$/u, { message: 'El nombre solo puede contener letras' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria'})
  @MinLength(6)
  @MaxLength(255)
  password!: string;

  @IsOptional()
  @ValidateIf((o) => !o.phone)
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email?: string;

  @IsOptional()
  @ValidateIf((o) => !o.email)
  @IsString({ message: 'El teléfono debe ser un texto' })
  @Matches(/^\d{7,15}$/, { message: 'El teléfono debe contener únicamente números' })
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsUUID(4, { message: 'Debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El rol es obligatorio' })
  roleId!: string;

}