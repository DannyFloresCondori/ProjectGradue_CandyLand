import { PartialType } from '@nestjs/mapped-types';
import { CreateOrdersDetailDto } from './create-orders_detail.dto';

export class UpdateOrdersDetailDto extends PartialType(CreateOrdersDetailDto) {}
