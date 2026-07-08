import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersDetailService } from './orders_detail.service';
import { OrdersDetailController } from './orders_detail.controller';
import { OrdersDetail } from './entities/orders_detail.entity';
import { Order } from 'src/orders/entities/order.entity';
import { Product } from 'src/products/entities/product.entity';
import { Topping } from 'src/topping/entities/topping.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrdersDetail, Order, Product, Topping])],
  controllers: [OrdersDetailController],
  providers: [OrdersDetailService],
})
export class OrdersDetailModule {}
