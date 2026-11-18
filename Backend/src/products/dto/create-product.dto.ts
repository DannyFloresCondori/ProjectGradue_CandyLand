import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductDto {

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty({ message: 'El nombre del producto es obligatorio' })
  @Length(2, 100)
  @Matches(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/, { message: 'El nombre debe contener al menos una letra' })
  name!: string;

  @IsOptional()
  @IsString()
  @Length(5, 255)
  @Matches(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/, { message: 'La descripción debe contener al menos una letra' })
  description?: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio debe ser un número válido' },
  )
  @IsPositive({ message: 'El precio debe ser mayor a 0' })
  price!: number;

  @IsNumber()
  @IsInt({ message: 'El stock debe ser un número entero' })
  @Min(0, { message: 'El stock no puede ser negativo' })
  current_stock!: number;

  @IsNumber()
  @IsInt({ message: 'El stock mínimo debe ser un número entero' })
  @Min(0, { message: 'El stock no puede ser negativo' })
  minimum_stock!: number;

  @IsString()
  image?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsUUID(4, { message: 'Debe ser un UUID válido' })
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique({
  message: 'No puede haber toppings repetidos',
  
})
  @IsUUID(4, { each: true })
  toppingId?: string[];

}