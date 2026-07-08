import { Order } from 'src/orders/entities/order.entity';
import { Sale } from 'src/sale/entities/sale.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120, nullable: false })
  full_name?: string;

  @Column({ type: 'varchar', length: 155, nullable: true })
  direction?: string;

  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  ci?: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  phone?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => Order, (order) => order.client)
  order!: Order[];

  @OneToMany(() => Sale, (sale) => sale.client)
  sale!: Sale[];

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date;
}
