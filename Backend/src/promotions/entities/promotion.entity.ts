import { Product } from 'src/products/entities/product.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PromotionType {
  DISCOUNT = 'discount',
  BUY_ONE_GET_ONE = 'buy_one_get_one',
}
@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, nullable: false, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: PromotionType,
    default: PromotionType.BUY_ONE_GET_ONE,
  })
  type!: PromotionType;

  @Column({ type: 'boolean', nullable: false, default: true })
  is_active!: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  value?: number;

  @Column({ type: 'timestamp', nullable: false })
  end_date!: Date;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Product, (product) => product.promotion)
  products!: Product[];
}
