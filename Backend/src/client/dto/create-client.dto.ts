import {
  IsBoolean,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
  IsUUID,
} from 'class-validator';

export class CreateClientDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  @Length(2, 65)
  full_name?: string;

  @IsOptional()
  @IsString()
  @Length(5, 155)
  direction?: string;

  @IsOptional()
  @IsString()
  @Length(4, 20)
  ci?: string;

  @IsOptional()
  @IsPhoneNumber('BO', {
    message: 'Debe ser un número telefónico válido de Bolivia',
  })
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
