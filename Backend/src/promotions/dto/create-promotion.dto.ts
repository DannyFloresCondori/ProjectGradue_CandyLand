import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

import { PromotionType } from '../entities/promotion.entity';

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty({ message: 'Promotion name is required'})
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  description?: string;

  @IsEnum(PromotionType)
  type!: PromotionType;

  @IsNumber()
  @IsOptional()
  value?: number;

  @IsOptional()
  @IsDateString()
  start_date?: Date;

  @IsDateString()
  end_date!: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  productIds!: string[];
}