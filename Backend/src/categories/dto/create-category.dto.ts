import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateCategoryDto {

  @IsString()
  @IsNotEmpty({ message: 'El nombre de la categoría es obligatorio' })
  @Length(2, 25)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

}