import { Product } from 'src/products/entities/product.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('stock_alerts')
export class StockAlert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int', default: 0 })
  current_stock!: number;

  @Column({ type: 'int', default: 0 })
  minimum_stock!: number;

  @Column({ type: 'int', default: 0 })
  stock_quantity!: number;

  @Column({ type: 'boolean', default: false })
  is_resolved!: boolean;

  @Column({ type: 'varchar', length: 150, nullable: false })
  alert_message!: string;

  @CreateDateColumn({ type: 'timestamp', name: 'alerted_at' })
  alerted_at!: Date;

  @Column({
    type: 'timestamp',
    name: 'resolved_at',
    nullable: true,
  })
  resolved_at?: Date | null;

  @ManyToOne(() => Product, (product) => product.stock_alerts, {
    onDelete: 'CASCADE',
    eager: true,
  })
  product!: Product;
}
