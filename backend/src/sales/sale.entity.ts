import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  invoiceNumber: string;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalPurchaseCost: number;

  @Column('decimal', { precision: 10, scale: 2 })
  grossProfit: number;

  @Column()
  paymentMethod: string;

  @CreateDateColumn()
  createdAt: Date;
}