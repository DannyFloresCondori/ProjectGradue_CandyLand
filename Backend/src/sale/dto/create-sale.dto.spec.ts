import { ValidationPipe } from '@nestjs/common';
import { Payment_method } from '../entities/sale.entity';
import { CreateSaleDto } from './create-sale.dto';

describe('CreateSaleDto', () => {
  it('accepts frontend aliases clientId and paymentType', async () => {
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    const dto = await pipe.transform(
      {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        payment_method: 'cash',
        details: [{ productId: '123e4567-e89b-12d3-a456-426614174000', quantity: 1 }],
      },
      {
        metatype: CreateSaleDto,
        type: 'body',
      } as any,
    );

    expect(dto).toBeInstanceOf(CreateSaleDto);
    expect(dto.clientId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(dto.payment_method).toBe(Payment_method.IN_EFECTIVE);
  });
});
