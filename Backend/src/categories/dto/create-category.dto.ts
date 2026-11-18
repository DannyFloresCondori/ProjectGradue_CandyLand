import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCategoryDto {

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la categoría es obligatorio' })
  @Length(2, 25)
  @Matches(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/, { message: 'El nombre debe contener al menos una letra' })
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

}