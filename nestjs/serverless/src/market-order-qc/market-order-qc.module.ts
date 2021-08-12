import { Module } from '@nestjs/common';
import { MarketOrderQcService } from './market-order-qc.service';
import { MarketOrderQcController } from './market-order-qc.controller';
import { DynamoModule } from '../dynamo/dynamo.module';
import { EventbridgeModule } from '../eventbridge/eventbridge.module';
import { OrderbookModule } from '../orderbook/orderbook.module';
import { ExchangeModule } from '../exchange/exchange.module';
import { LoggerModule } from '../logger/logger.module';
import { TradeModule } from '../trade/trade.module';
import { TradeService } from '../trade/trade.service';

@Module({
  imports: [
    DynamoModule,
    EventbridgeModule,
    OrderbookModule,
    ExchangeModule,
    LoggerModule,
    TradeModule,
  ],
  providers: [MarketOrderQcService, TradeService],
  controllers: [MarketOrderQcController],
  exports: [MarketOrderQcService],
})
export class MarketOrderQcModule {}
