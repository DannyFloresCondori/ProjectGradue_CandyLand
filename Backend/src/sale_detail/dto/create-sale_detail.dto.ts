import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateSaleDetailDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
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