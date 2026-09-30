import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsOptional } from 'class-validator';
import { CreateStockAlertDto } from './create-stock_alert.dto';

export class UpdateStockAlertDto extends PartialType(CreateStockAlertDto) {
	@IsOptional()
	@IsDateString()
	stock_updated_at?: Date | null;
}
