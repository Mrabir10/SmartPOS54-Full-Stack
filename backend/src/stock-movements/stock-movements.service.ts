import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  Repository,
} from 'typeorm';

import {
  StockMovement,
} from './stock-movement.entity';

export type CreateStockMovementDto = {
  productId: number;
  productName: string;

  productCode?:
    string | null;

  type: string;

  quantity: number;

  purchasePrice?:
    number | null;

  totalPurchaseCost?:
    number | null;

  supplier?:
    string | null;

  reason?:
    string | null;

  referenceType?:
    string | null;

  referenceId?:
    number | null;
};

@Injectable()
export class StockMovementsService {
  constructor(
    @InjectRepository(
      StockMovement,
    )
    private readonly stockMovementRepository:
      Repository<StockMovement>,
  ) {}

  // =====================================================
  // GET ALL MOVEMENTS
  // =====================================================

  async getAllMovements() {
    const rows =
      await this.stockMovementRepository.find({
        order: {
          date:
            'DESC',

          id:
            'DESC',
        },
      });

    return rows.map(
      (movement) => ({
        ...movement,

        quantity:
          Number(
            movement.quantity ||
              0,
          ),

        purchasePrice:
          movement.purchasePrice ===
          null
            ? null
            : Number(
                movement.purchasePrice,
              ),

        totalPurchaseCost:
          movement.totalPurchaseCost ===
          null
            ? null
            : Number(
                movement.totalPurchaseCost,
              ),
      }),
    );
  }

  // =====================================================
  // CREATE MOVEMENT
  // =====================================================

  async createMovement(
    movementData:
      CreateStockMovementDto,
  ) {
    const productId =
      Number(
        movementData.productId,
      );

    const quantity =
      Number(
        movementData.quantity,
      );

    const type =
      String(
        movementData.type ||
          '',
      )
        .trim()
        .toUpperCase();

    const productName =
      String(
        movementData.productName ||
          '',
      ).trim();

    if (
      !Number.isFinite(
        productId,
      )
    ) {
      throw new BadRequestException(
        'A valid product ID is required.',
      );
    }

    if (!productName) {
      throw new BadRequestException(
        'Product name is required.',
      );
    }

    if (!type) {
      throw new BadRequestException(
        'Movement type is required.',
      );
    }

    if (
      !Number.isFinite(
        quantity,
      ) ||
      quantity === 0
    ) {
      throw new BadRequestException(
        'Movement quantity must be non-zero.',
      );
    }

    const movement =
      this.stockMovementRepository.create(
        {
          productId,

          productName,

          productCode:
            movementData.productCode ||
            null,

          type,

          quantity,

          purchasePrice:
            movementData.purchasePrice ===
              undefined ||
            movementData.purchasePrice ===
              null
              ? null
              : Number(
                  movementData.purchasePrice,
                ),

          totalPurchaseCost:
            movementData.totalPurchaseCost ===
              undefined ||
            movementData.totalPurchaseCost ===
              null
              ? null
              : Number(
                  movementData.totalPurchaseCost,
                ),

          supplier:
            movementData.supplier?.trim() ||
            null,

          reason:
            movementData.reason?.trim() ||
            null,

          referenceType:
            movementData.referenceType?.trim() ||
            null,

          referenceId:
            movementData.referenceId ===
              undefined ||
            movementData.referenceId ===
              null
              ? null
              : Number(
                  movementData.referenceId,
                ),
        },
      );

    return this.stockMovementRepository.save(
      movement,
    );
  }
}