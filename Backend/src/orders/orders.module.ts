import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { Client } from 'src/client/entities/client.entity';
import { User } from 'src/users/entities/user.entity';
import { Product } from 'src/products/entities/product.entity';
import { OrdersDetail } from 'src/orders_detail/entities/orders_detail.entity';
import { Sale } from 'src/sale/entities/sale.entity';
import { SaleDetail } from 'src/sale_detail/entities/sale_detail.entity';
import { StockAlert } from 'src/stock_alert/entities/stock_alert.entity';
import { Topping } from 'src/topping/entities/topping.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      Client,
      User,
      Product,
      OrdersDetail,
      Sale,
      SaleDetail,
      StockAlert,
      Topping,
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
