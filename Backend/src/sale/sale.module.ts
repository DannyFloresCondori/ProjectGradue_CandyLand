import { Module } from '@nestjs/common';
import { SaleService } from './sale.service';
import { SaleController } from './sale.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Sale } from './entities/sale.entity';
import { Product } from 'src/products/entities/product.entity';
import { SaleDetail } from 'src/sale_detail/entities/sale_detail.entity';
import { Client } from 'src/client/entities/client.entity';
import { Order } from 'src/orders/entities/order.entity';
import { StockAlert } from 'src/stock_alert/entities/stock_alert.entity';
import { Topping } from 'src/topping/entities/topping.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Sale, Product, SaleDetail, Client, Order, StockAlert , Topping])],
  controllers: [SaleController],
  providers: [SaleService],
})
export class SaleModule {}
