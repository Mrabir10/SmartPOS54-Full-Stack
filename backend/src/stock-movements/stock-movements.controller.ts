import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import {
  StockMovementsService,
} from './stock-movements.service';

import type {
  CreateStockMovementDto,
} from './stock-movements.service';

@Controller('stock-movements')
export class StockMovementsController {
  constructor(
    private readonly stockMovementsService:
      StockMovementsService,
  ) {}

  @Get()
  getAllMovements() {
    return this.stockMovementsService.getAllMovements();
  }

  @Post()
  createMovement(
    @Body()
    movementData:
      CreateStockMovementDto,
  ) {
    return this.stockMovementsService.createMovement(
      movementData,
    );
  }
}