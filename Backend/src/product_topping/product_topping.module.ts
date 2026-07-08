import { Module } from '@nestjs/common';
import { ProductToppingService } from './product_topping.service';
import { ProductToppingController } from './product_topping.controller';

@Module({
  controllers: [ProductToppingController],
  providers: [ProductToppingService],
})
export class ProductToppingModule {}
