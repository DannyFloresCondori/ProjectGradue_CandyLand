import { IsArray, IsEnum, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CreateClientDto } from 'src/client/dto/create-client.dto';
import { Payment_method } from '../entities/sale.entity';
import { CreateSaleDetailDto } from 'src/sale_detail/dto/create-sale_detail.dto';

export class CreateSaleDto {
  @ValidateNested()
  @Type(() => CreateClientDto)
  client?: CreateClientDto;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'cash') return Payment_method.IN_EFECTIVE;
    if (value === 'qr') return Payment_method.IN_QR;
    return value;
  })
  @IsEnum(Payment_method)
  payment_method?: Payment_method;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'cash') return 'cash';
    if (value === 'qr') return 'qr';
    return value;
  })
  paymentType?: Payment_method | string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleDetailDto)
  details?: CreateSaleDetailDto[];

  @IsOptional()
  @IsUUID()
  orderId?: string;
}
