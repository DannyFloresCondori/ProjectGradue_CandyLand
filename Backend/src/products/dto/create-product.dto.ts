import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export class CreateProductDto {

  @IsString()
  @IsNotEmpty({ message: 'El nombre del producto es obligatorio' })
  @Length(2, 100)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(5, 255)
  description?: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio debe ser un número válido' },
  )
  @IsPositive({ message: 'El precio debe ser mayor a 0' })
  price!: number;

  @IsNumber()
  @Min(0, { message: 'El stock no puede ser negativo' })
  current_stock!: number;

  @IsNumber()
  @Min(0, { message: 'El stock no puede ser negativo' })
  minimum_stock!: number;

  @IsOptional()
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