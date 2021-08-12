import { Module } from '@nestjs/common';

import { TradeController } from './trade.controller';
import { TradeService } from './trade.service';

import { ExchangeModule } from '../exchange/exchange.module';
import { OrderbookModule } from '../orderbook/orderbook.module';
import { DynamoModule } from '../dynamo/dynamo.module';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [OrderbookModule, ExchangeModule, DynamoModule, LoggerModule],
  controllers: [TradeController],
  providers: [TradeService],
})
export class TradeModule {}
