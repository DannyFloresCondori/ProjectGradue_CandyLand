import { Category } from 'src/categories/entities/category.entity';
import { OrdersDetail } from 'src/orders_detail/entities/orders_detail.entity';
import { ProductTopping } from 'src/product_topping/entities/product_topping.entity';
import { Promotion } from 'src/promotions/entities/promotion.entity';
import { SaleDetail } from 'src/sale_detail/entities/sale_detail.entity';
import { StockAlert } from 'src/stock_alert/entities/stock_alert.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price!: number;

  @Column({ type: 'int', default: 0 })
  current_stock!: number;

  @Column({ type: 'int', default: 0 })
  minimum_stock!: number;

  @Column({ type: 'varchar', length: 255, nullable: true, })
  image?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => ProductTopping, (productToppings) => productToppings.product)
  productToppings!: ProductTopping[];

  @OneToMany(() => OrdersDetail, (ordersDetail) => ordersDetail.product)
  ordersDetail!: OrdersDetail[];

  @OneToMany(() => SaleDetail, (saleDetail) => saleDetail.product)
  saleDetail!: SaleDetail[];

  @ManyToOne(() => Category, (category) => category.products, {
    eager: true,
    onDelete: 'SET NULL',
    nullable: true,
  })
  category?: Category | null;

  @ManyToOne(() => Promotion, (promotion) => promotion.products , {
    eager: true,
    onDelete: 'SET NULL',
    nullable: true,
  })
  promotion?: Promotion | null;

  @OneToMany(() => StockAlert, (stockAlert) => stockAlert.product)
  stock_alerts!: StockAlert[];
}
