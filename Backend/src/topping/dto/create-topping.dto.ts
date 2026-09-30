import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateToppingDto {

  @IsString()
  @IsNotEmpty({ message: 'El nombre del topping es obligatorio' })
  @Length(2, 80)
  @Matches(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/, { message: 'El nombre debe contener al menos una letra' })
  name!: string;

  @IsOptional()
  @IsString()
  @Length(5, 255)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

}