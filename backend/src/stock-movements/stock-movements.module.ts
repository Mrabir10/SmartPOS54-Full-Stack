import {
  Module,
} from '@nestjs/common';

import {
  TypeOrmModule,
} from '@nestjs/typeorm';

import {
  StockMovement,
} from './stock-movement.entity';

import {
  StockMovementsController,
} from './stock-movements.controller';

import {
  StockMovementsService,
} from './stock-movements.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StockMovement,
    ]),
  ],

  controllers: [
    StockMovementsController,
  ],

  providers: [
    StockMovementsService,
  ],

  exports: [
    TypeOrmModule,
    StockMovementsService,
  ],
})
export class StockMovementsModule {}