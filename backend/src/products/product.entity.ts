import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  productCode: string;

  @Column('decimal', {
    precision: 10,
    scale: 2,
  })
  sellingPrice: number;

  @Column('decimal', {
    precision: 10,
    scale: 2,
  })
  purchasePrice: number;

  @Column({ nullable: true })
  size: string;

  @Column({ default: 0 })
  stock: number;

  // Reference photo is persisted in MySQL as a data URI.
  // select:false keeps the large image out of normal
  // product-list queries.
  @Column('longtext', {
    nullable: true,
    select: false,
  })
  imageData: string | null;

  @CreateDateColumn()
  createdAt: Date;
}