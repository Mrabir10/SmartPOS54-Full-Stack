import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '',
      database: 'smartpos_db',
      autoLoadEntities: true,
      synchronize: true,
    }),
    ProductsModule,
    SalesModule,
    StockMovementsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}