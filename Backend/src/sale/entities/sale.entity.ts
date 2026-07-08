import { Client } from 'src/client/entities/client.entity';
import { Order } from 'src/orders/entities/order.entity';
import { SaleDetail } from 'src/sale_detail/entities/sale_detail.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';

export enum Payment_method {
  IN_QR = 'in_qr',
  IN_EFECTIVE = 'in_efective',
}

export enum SaleType {
  LOCAL = 'local',
  DELIVERY = 'delivery',
}

export enum SalesStatus {
  DELIVERED = 'delivered',
  CANCELED = 'canceled',
}

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total!: number;

  @Column({
    type: 'enum',
    enum: Payment_method,
    default: Payment_method.IN_EFECTIVE,
  })
  payment_method!: Payment_method;

  @Column({
    type: 'enum',
    enum: SalesStatus,
    default: SalesStatus.DELIVERED,
  })
  status!: SalesStatus;

  @Column({
    type: 'enum',
    enum: SaleType,
    default: SaleType.LOCAL,
  })
  type!: SaleType;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.sale)
  user!: User;

  @Index('UQ_SALES_ORDER_ID', { unique: true })
  @OneToOne(() => Order, (order) => order.sale, {
    nullable: true,
  })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @ManyToOne(() => Client, (client) => client.sale, { nullable: true, onDelete: 'SET NULL' })
  client!: Client | null;

  @OneToMany(() => SaleDetail, (saleDetail) => saleDetail.sale, {
    cascade: true,
  })
  saleDetail!: SaleDetail[];

}
