import { Client } from 'src/client/entities/client.entity';
import { User } from 'src/users/entities/user.entity';
import { OrdersDetail } from 'src/orders_detail/entities/orders_detail.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  ManyToOne,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { Sale } from 'src/sale/entities/sale.entity';

export enum OrderStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  PREPARING = 'preparing',
  READY = 'ready',
}

export enum OrderType {
  DELIVERY = 'delivery',
  SCHEDULED = 'scheduled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Client, { eager: true, nullable: true, onDelete: 'SET NULL' })
  client!: Client | null;

  @ManyToOne(() => User, { eager: true, nullable: false })
  user!: User;

  @Column({
    type: 'enum',
    enum: OrderType,
    default: OrderType.DELIVERY,
  })
  type!: OrderType;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @Column({ type: 'text', nullable: true })
  delivery_address?: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduled_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  delivery_date?: Date;

  @Column({ type: 'boolean', default: false })
  programed!: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => OrdersDetail, (detail) => detail.order, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  details!: OrdersDetail[];

  @OneToOne(() => Sale, (sale) => sale.order)
  sale!: Sale;
}
