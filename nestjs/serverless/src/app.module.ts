import { Module } from '@nestjs/common';
import { DynamoModule } from './dynamo/dynamo.module';
import { CacheModule } from './cache/cache.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { OrderbookModule } from './orderbook/orderbook.module';
import { ExchangeModule } from './exchange/exchange.module';
import { EventbridgeModule } from './eventbridge/eventbridge.module';
import { TradeModule } from './trade/trade.module';
import { MarketOrderQcModule } from './market-order-qc/market-order-qc.module';
import { InstantBuyModule } from './instant-buy/instant-buy.module';
import { LoggerModule } from './logger/logger.module';
import { AppController } from './app.controller';
import { TrackerModule } from './tracker/tracker.module';

@Module({
  imports: [
    AuthModule,
    OrderbookModule,
    ExchangeModule,
    DynamoModule,
    CacheModule,
    EventbridgeModule,
    UserModule,
    TradeModule,
    MarketOrderQcModule,
    InstantBuyModule,
    LoggerModule,
    TrackerModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
