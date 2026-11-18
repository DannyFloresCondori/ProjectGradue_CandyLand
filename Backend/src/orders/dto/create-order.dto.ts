import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { Transform, Type } from 'class-transformer';
import { OrderStatus, OrderType } from '../entities/order.entity';
import { Payment_method } from 'src/sale/entities/sale.entity';
import { CreateOrdersDetailDto } from 'src/orders_detail/dto/create-orders_detail.dto';
import { CreateClientDto } from 'src/client/dto/create-client.dto';

export class CreateOrderDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'cash') return Payment_method.IN_EFECTIVE;
    if (value === 'qr') return Payment_method.IN_QR;
    return value;
  })
  @IsEnum(Payment_method)
  paymentType?: Payment_method;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateClientDto)
  client?: CreateClientDto;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  user_id?: string;

  @IsOptional()
  type?: OrderType;

  @IsOptional()
  orderType?: string;

  @IsOptional()
  order_type?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsBoolean()
  programed?: boolean;

  @IsOptional()
  @IsBoolean()
  programado?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsDateString()
  delivery_date?: Date;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @IsOptional()
  @IsString()
  delivery_address?: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  scheduled_at?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrdersDetailDto)
  details!: CreateOrdersDetailDto[];
}
