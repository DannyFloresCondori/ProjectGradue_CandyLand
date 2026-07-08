import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateStockAlertDto {
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @Min(0)
  current_stock!: number;

  @IsInt()
  @Min(0)
  minimum_stock!: number;

  @IsOptional()
  @IsBoolean()
  is_resolved?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  alert_message?: string;

  @IsOptional()
  @IsDateString()
  resolved_at?: Date | null;
}