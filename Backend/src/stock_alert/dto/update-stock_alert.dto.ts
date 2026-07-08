import { PartialType } from '@nestjs/mapped-types';
import { CreateStockAlertDto } from './create-stock_alert.dto';

export class UpdateStockAlertDto extends PartialType(CreateStockAlertDto) {}
