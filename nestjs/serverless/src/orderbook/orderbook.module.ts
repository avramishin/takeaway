import { Module } from '@nestjs/common';
import { OrderbookService } from './orderbook.service';
import { ExchangeModule } from '../exchange/exchange.module';
import { OrderbookController } from './orderbook.controller';

@Module({
  imports: [ExchangeModule],
  controllers: [OrderbookController],
  providers: [OrderbookService],
  exports: [OrderbookService],
})
export class OrderbookModule {}
