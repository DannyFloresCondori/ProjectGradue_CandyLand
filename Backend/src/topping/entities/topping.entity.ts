import { ProductTopping } from 'src/product_topping/entities/product_topping.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('toppings')
export class Topping {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 80, nullable: false, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => ProductTopping, (productToppings) => productToppings.topping)
    productToppings!: ProductTopping[]
}
