import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import {
  DataSource,
  Repository,
} from 'typeorm';

import { Product } from '../products/product.entity';

import { Sale } from './sale.entity';

import { SaleItem } from './sale-item.entity';
import { StockMovement } from '../stock-movements/stock-movement.entity';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,

    @InjectRepository(SaleItem)
    private readonly saleItemRepository: Repository<SaleItem>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    private readonly dataSource: DataSource,
  ) {}

  // =====================================================
  // CREATE SALE
  // =====================================================

  async createSale(saleData: {
    invoiceNumber: string;
    paymentMethod: string;

    items: {
      productId: number;
      quantity: number;
    }[];
  }) {
    // ===================================================
    // VALIDATE SALE
    // ===================================================

    if (
      !saleData.items ||
      saleData.items.length === 0
    ) {
      throw new BadRequestException(
        'Sale must contain at least one product',
      );
    }

    // ===================================================
    // DATABASE TRANSACTION
    // ===================================================

    return this.dataSource.transaction(
      async (manager) => {
        let totalAmount = 0;

        let totalPurchaseCost = 0;

        const saleItemsData: any[] = [];

        // =================================================
        // 1. CHECK PRODUCTS + STOCK
        // =================================================

        for (const item of saleData.items) {
          const product =
            await manager.findOne(Product, {
              where: {
                id: item.productId,
              },
            });

          if (!product) {
            throw new NotFoundException(
              `Product ${item.productId} not found`,
            );
          }

          if (item.quantity <= 0) {
            throw new BadRequestException(
              'Quantity must be greater than 0',
            );
          }

          if (
            product.stock <
            item.quantity
          ) {
            throw new BadRequestException(
              `Insufficient stock for ${product.name}. Available stock: ${product.stock}`,
            );
          }

          // =================================================
          // 2. CALCULATE ITEM AMOUNTS
          // =================================================

          const sellingPrice =
            Number(product.sellingPrice);

          const purchasePrice =
            Number(product.purchasePrice);

          const quantity =
            Number(item.quantity);

          const totalSellingAmount =
            sellingPrice * quantity;

          const itemPurchaseCost =
            purchasePrice * quantity;

          const itemGrossProfit =
            totalSellingAmount -
            itemPurchaseCost;

          totalAmount +=
            totalSellingAmount;

          totalPurchaseCost +=
            itemPurchaseCost;

          // =================================================
          // 3. PREPARE SALE ITEM
          // =================================================

          saleItemsData.push({
            product,

            productId:
              product.id,

            productName:
              product.name,

            productCode:
              product.productCode,

            size:
              product.size || null,

            quantity,

            sellingPrice,

            purchasePrice,

            totalSellingAmount,

            totalPurchaseCost:
              itemPurchaseCost,

            grossProfit:
              itemGrossProfit,
          });
        }

        // =================================================
        // 4. CALCULATE TOTAL GROSS PROFIT
        // =================================================

        const grossProfit =
          totalAmount -
          totalPurchaseCost;

        // =================================================
        // 5. CREATE SALE
        // =================================================

        const sale =
          manager.create(Sale, {
            invoiceNumber:
              saleData.invoiceNumber,

            totalAmount,

            totalPurchaseCost,

            grossProfit,

            paymentMethod:
              saleData.paymentMethod,
          });

        const savedSale =
          await manager.save(
            Sale,
            sale,
          );

        // =================================================
        // 6. CREATE SALE ITEMS
        // =================================================

        for (
          const itemData of saleItemsData
        ) {
          const saleItem =
            manager.create(
              SaleItem,
              {
                saleId:
                  savedSale.id,

                productId:
                  itemData.productId,

                productName:
                  itemData.productName,

                productCode:
                  itemData.productCode,

                size:
                  itemData.size,

                quantity:
                  itemData.quantity,

                sellingPrice:
                  itemData.sellingPrice,

                purchasePrice:
                  itemData.purchasePrice,

                totalSellingAmount:
                  itemData.totalSellingAmount,

                totalPurchaseCost:
                  itemData.totalPurchaseCost,

                grossProfit:
                  itemData.grossProfit,
              },
            );

          await manager.save(
            SaleItem,
            saleItem,
          );
        }

        // =================================================
        // 7. DECREASE PRODUCT STOCK
        //    + SAVE SALE MOVEMENT
        // =================================================

        for (
          const itemData of saleItemsData
        ) {
          const product =
            await manager.findOne(Product, {
              where: {
                id: itemData.productId,
              },
            });

          if (!product) {
            throw new NotFoundException(
              `Product ${itemData.productId} not found`,
            );
          }

          product.stock =
            Number(product.stock) -
            Number(itemData.quantity);

          await manager.save(
            Product,
            product,
          );

          const stockMovement =
            manager.create(StockMovement, {
              productId:
                itemData.productId,

              productName:
                itemData.productName,

              productCode:
                itemData.productCode,

              type:
                'SALE',

              quantity:
                -Number(
                  itemData.quantity,
                ),

              purchasePrice:
                itemData.purchasePrice,

              totalPurchaseCost:
                itemData.totalPurchaseCost,

              supplier:
                null,

              reason:
                `Sale ${savedSale.invoiceNumber}`,

              referenceType:
                'SALE',

              referenceId:
                savedSale.id,
            });

          await manager.save(
            StockMovement,
            stockMovement,
          );
        }

        // =================================================
        // 8. RETURN SALE RESULT
        // =================================================

        return {
          message:
            'Sale completed successfully',

          sale: {
            id:
              savedSale.id,

            invoiceNumber:
              savedSale.invoiceNumber,

            totalAmount:
              Number(
                savedSale.totalAmount,
              ),

            totalPurchaseCost:
              Number(
                savedSale.totalPurchaseCost,
              ),

            grossProfit:
              Number(
                savedSale.grossProfit,
              ),

            paymentMethod:
              savedSale.paymentMethod,

            createdAt:
              savedSale.createdAt,
          },

          items:
            saleItemsData.map(
              (item) => ({
                productId:
                  item.productId,

                productName:
                  item.productName,

                quantity:
                  item.quantity,

                sellingPrice:
                  item.sellingPrice,

                purchasePrice:
                  item.purchasePrice,

                totalSellingAmount:
                  item.totalSellingAmount,

                totalPurchaseCost:
                  item.totalPurchaseCost,

                grossProfit:
                  item.grossProfit,
              }),
            ),
        };
      },
    );
  }

  // =====================================================
  // GET ALL SALES
  // =====================================================

  async getAllSales() {
    const sales =
      await this.saleRepository
        .createQueryBuilder('sale')

        .leftJoin(
          SaleItem,
          'item',
          'item.saleId = sale.id',
        )

        .select([
          'sale.id',
          'sale.invoiceNumber',
          'sale.totalAmount',
          'sale.totalPurchaseCost',
          'sale.grossProfit',
          'sale.paymentMethod',
          'sale.createdAt',
        ])

        .addSelect(
          'COALESCE(SUM(item.quantity), 0)',
          'itemsCount',
        )

        .groupBy(
          'sale.id',
        )

        .addGroupBy(
          'sale.invoiceNumber',
        )

        .addGroupBy(
          'sale.totalAmount',
        )

        .addGroupBy(
          'sale.totalPurchaseCost',
        )

        .addGroupBy(
          'sale.grossProfit',
        )

        .addGroupBy(
          'sale.paymentMethod',
        )

        .addGroupBy(
          'sale.createdAt',
        )

        .orderBy(
          'sale.id',
          'DESC',
        )

        .getRawMany();

    return sales.map(
      (sale) => ({
        id:
          Number(
            sale.sale_id,
          ),

        invoiceNumber:
          sale.sale_invoiceNumber,

        totalAmount:
          Number(
            sale.sale_totalAmount,
          ),

        totalPurchaseCost:
          Number(
            sale.sale_totalPurchaseCost,
          ),

        grossProfit:
          Number(
            sale.sale_grossProfit,
          ),

        paymentMethod:
          sale.sale_paymentMethod,

        createdAt:
          sale.sale_createdAt,

        itemsCount:
          Number(
            sale.itemsCount || 0,
          ),
      }),
    );
  }

  // =====================================================
  // GET SINGLE SALE
  // =====================================================

  async getSaleById(
    id: number,
  ) {
    const sale =
      await this.saleRepository.findOne({
        where: {
          id,
        },
      });

    if (!sale) {
      throw new NotFoundException(
        'Sale not found',
      );
    }

    const items =
      await this.saleItemRepository.find({
        where: {
          saleId: id,
        },
      });

    return {
      sale,
      items,
    };
  }
}