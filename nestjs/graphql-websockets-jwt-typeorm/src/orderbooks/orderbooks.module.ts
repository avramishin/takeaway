import { Module } from '@nestjs/common';
import { OrderbooksService } from './orderbooks.service';
import { OrdersModule } from '../orders/orders.module';
import { InstrumentsModule } from '../instruments/instruments.module';
import { PubSubService } from '../pubsub.service';
import { OrderbooksResolver } from './orderbooks.resolver';

@Module({
  imports: [OrdersModule, InstrumentsModule],
  providers: [OrderbooksService, PubSubService, OrderbooksResolver],
})
export class OrderbooksModule {}
