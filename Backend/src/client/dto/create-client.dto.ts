import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateClientDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  @Length(2, 65)
  @Matches(/^[\p{L}][\p{L}\s.'-]*$/u, { message: 'El nombre solo puede contener letras' })
  full_name?: string;

  @IsOptional()
  @IsString()
  @Length(5, 155)
  direction?: string;

  @IsOptional()
  @IsString()
  @Length(4, 20)
  @Matches(/^\d+$/, { message: 'El CI debe contener únicamente números' })
  ci?: string;

  @IsOptional()
  @Matches(/^[67]\d{7}$/, { message: 'El teléfono debe contener únicamente 8 números y comenzar con 6 o 7' })
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
