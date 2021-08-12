import { Module } from '@nestjs/common';
import { InstantBuyService } from './instant-buy.service';
import { InstantBuyController } from './instant-buy.controller';
import { DynamoModule } from '../dynamo/dynamo.module';
import { CacheModule } from '../cache/cache.module';
import { MarketOrderQcModule } from '../market-order-qc/market-order-qc.module';
import { OrderbookModule } from '../orderbook/orderbook.module';
import { ExchangeModule } from '../exchange/exchange.module';
import { EventbridgeModule } from '../eventbridge/eventbridge.module';
import { UserModule } from '../user/user.module';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [
    CacheModule,
    LoggerModule,
    DynamoModule,
    UserModule,
    MarketOrderQcModule,
    OrderbookModule,
    ExchangeModule,
    EventbridgeModule,
  ],
  providers: [InstantBuyService],
  controllers: [InstantBuyController],
})
export class InstantBuyModule {}
