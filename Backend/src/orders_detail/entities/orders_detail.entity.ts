import { Order } from 'src/orders/entities/order.entity';
import { Product } from 'src/products/entities/product.entity';
import { Topping } from 'src/topping/entities/topping.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('orders_detail')
export class OrdersDetail {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Product, (product) => product.ordersDetail)
  product!: Product;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  priceUnique?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountApplied!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  finalPrice!: number;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  toppings!: Array<{ id: string; name: string }>;

  @CreateDateColumn({ type: 'timestamp', name: 'order_date' })
  orderDate!: Date;

  @ManyToOne(() => Order, (order) => order.details, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  order!: Order;
}
