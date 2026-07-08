import { Product } from 'src/products/entities/product.entity';
import { Topping } from 'src/topping/entities/topping.entity';
import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('product_toppings')
@Unique(['product', 'topping'])
export class ProductTopping {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Product, (product) => product.productToppings, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @ManyToOne(() => Topping, (topping) => topping.productToppings, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'topping_id' })
  topping!: Topping;
}
