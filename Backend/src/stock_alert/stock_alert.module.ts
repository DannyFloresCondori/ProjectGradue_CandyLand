import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockAlertService } from './stock_alert.service';
import { StockAlertController } from './stock_alert.controller';
import { StockAlert } from './entities/stock_alert.entity';
import { Product } from 'src/products/entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StockAlert, Product])],
  controllers: [StockAlertController],
  providers: [StockAlertService],
})
export class StockAlertModule {}
