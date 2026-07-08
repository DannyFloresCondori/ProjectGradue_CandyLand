import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { Category } from 'src/categories/entities/category.entity';
import { Topping } from 'src/topping/entities/topping.entity';
import { ProductTopping } from 'src/product_topping/entities/product_topping.entity';
import { StockAlert } from 'src/stock_alert/entities/stock_alert.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category, Topping, ProductTopping, StockAlert])],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
