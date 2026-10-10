import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'int',
  })
  productId: number;

  @Column({
    type: 'varchar',
    length: 255,
  })
  productName: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  productCode: string | null;

  @Column({
    type: 'varchar',
    length: 50,
  })
  type: string;

  // RESTOCK = positive quantity
  // SALE / DAMAGED / MISSING etc. = negative quantity
  @Column({
    type: 'int',
  })
  quantity: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  purchasePrice: number | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  totalPurchaseCost: number | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  supplier: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  reason: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  referenceType: string | null;

  @Column({
    type: 'int',
    nullable: true,
  })
  referenceId: number | null;

  @CreateDateColumn({
    type: 'datetime',
  })
  date: Date;
}