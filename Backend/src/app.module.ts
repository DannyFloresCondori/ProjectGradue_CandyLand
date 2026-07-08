import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from './common/common.module';
import { TypeOrmConfig } from './config/typeOrm.config';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { ClientModule } from './client/client.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { ToppingModule } from './topping/topping.module';
import { PromotionsModule } from './promotions/promotions.module';
import { SaleModule } from './sale/sale.module';
import { StockAlertModule } from './stock_alert/stock_alert.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: TypeOrmConfig, 
      inject: [ConfigService],
    }),
    CommonModule,
    RolesModule,
    UsersModule,
    ClientModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    ToppingModule,
    PromotionsModule,
    SaleModule,
    StockAlertModule,
    AuthModule,
  ]
})
export class AppModule {}
