import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
  ) {}

  @Post()
  createSale(
    @Body()
    saleData: {
      invoiceNumber: string;
      paymentMethod: string;

      items: {
        productId: number;
        quantity: number;
      }[];
    },
  ) {
    return this.salesService.createSale(
      saleData,
    );
  }

  @Get()
  getAllSales() {
    return this.salesService.getAllSales();
  }

  @Get(':id')
  getSaleById(
    @Param('id') id: string,
  ) {
    return this.salesService.getSaleById(
      Number(id),
    );
  }
}