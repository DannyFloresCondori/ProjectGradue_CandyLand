import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateOrdersDetailDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  @Max(50, { message: 'La cantidad máxima por producto es 50.' })
  quantity!: number;

  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  toppingIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  toppings?: string[];
}