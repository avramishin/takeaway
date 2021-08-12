import { Module } from '@nestjs/common';
import { TickersService } from './tickers.service';
import { OrdersModule } from '../orders/orders.module';
import { InstrumentsModule } from '../instruments/instruments.module';
import { PubSubService } from '../pubsub.service';
import { TickersResolver } from './tickers.resolver';

@Module({
  imports: [OrdersModule, InstrumentsModule],
  providers: [TickersService, PubSubService, TickersResolver],
})
export class TickersModule {}
