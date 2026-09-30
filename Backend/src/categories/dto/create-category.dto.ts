import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateCategoryDto {

  @IsString()
  @IsNotEmpty({ message: 'El nombre de la categoría es obligatorio' })
  @Length(2, 25)
  @Matches(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/, { message: 'El nombre debe contener al menos una letra' })
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

}