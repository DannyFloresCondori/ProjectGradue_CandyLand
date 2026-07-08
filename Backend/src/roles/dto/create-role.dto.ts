import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateRoleDto {

  @IsString()
  @IsNotEmpty({ message: 'el nombre del rol es requerido'})
  @Length(2, 20)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(2, 150)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

}