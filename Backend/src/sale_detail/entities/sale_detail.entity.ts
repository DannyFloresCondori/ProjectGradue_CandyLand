import { Product } from 'src/products/entities/product.entity';
import { Sale } from 'src/sale/entities/sale.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sale_details')
export class SaleDetail {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  priceUnique?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountApplied!: number; 

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  finalPrice!: number; 

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal?: number;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  toppings!: Array<{ id: string; name: string }>;

  @ManyToOne(() => Product, (product) => product.saleDetail)
  product!: Product;

  @ManyToOne(() => Sale, (sale) => sale.saleDetail, { onDelete: 'CASCADE' })
  sale!: Sale;
}
