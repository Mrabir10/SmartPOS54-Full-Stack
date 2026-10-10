import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('sale_items')
export class SaleItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  saleId: number;

  @Column()
  productId: number;

  @Column()
  productName: string;

  @Column()
  productCode: string;

  @Column({ nullable: true })
  size: string;

  @Column()
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  sellingPrice: number;

  @Column('decimal', { precision: 10, scale: 2 })
  purchasePrice: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalSellingAmount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalPurchaseCost: number;

  @Column('decimal', { precision: 10, scale: 2 })
  grossProfit: number;
}