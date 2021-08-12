import { default as debugFactory } from 'debug';

import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InstrumentsService } from '../instruments/instruments.service';
import { OrdersService } from '../orders/orders.service';
import { Orderbook } from './orderbook';
import { OrderEvent, OrderEventTypeEnum } from '../orders/order.event';
import { OrderbookEvent, OrderbookEventTypeEnum } from './orderbook.event';
import { PubSubService } from '../pubsub.service';

@Injectable()
export class OrderbooksService implements OnApplicationBootstrap {
  private debug = debugFactory(OrderbooksService.name);

  /**
   * Orderbooks repository
   */
  orderbooks: Record<string, Orderbook> = {};

  constructor(
    private ordersService: OrdersService,
    private instrumentsService: InstrumentsService,
    private eventEmitter: EventEmitter2,
    private pubSubService: PubSubService,
  ) {}

  getOrderbook(instrumentId: string) {
    return this.orderbooks[instrumentId];
  }

  /**
   * Update orderbooks for all instruments on service start
   * and subscribe to order changes
   */
  async onApplicationBootstrap() {
    const instruments = await this.instrumentsService.findAll();
    this.debug(`Building orderbooks for ${instruments.length} instruments`);
    instruments.forEach((instrument) => this.updateOrderbook(instrument.id));
    this.eventEmitter.on(OrderEvent.name, (orderEvent: OrderEvent) => {
      if (
        [
          OrderEventTypeEnum.OrderClosed,
          OrderEventTypeEnum.OrderOpened,
        ].includes(orderEvent.type)
      ) {
        this.updateOrderbook(orderEvent.order.instrument_id);
      }
    });
  }

  /**
   * Update orderbook for selected instrument
   */
  updateOrderbook(instrumentId: string) {
    const orderbook = new Orderbook();
    orderbook.instrument = instrumentId;
    orderbook.update(
      this.ordersService.openOrdersLocal.filter(
        (o) => o.instrument_id == instrumentId,
      ),
    );
    this.orderbooks[instrumentId] = orderbook;

    // orderbook update event
    const orderbookUpdatedEvent = new OrderbookEvent();
    orderbookUpdatedEvent.type = OrderbookEventTypeEnum.OrderbookUpdated;
    orderbookUpdatedEvent.orderbook = orderbook;
    return this.eventEmitter.emitAsync(
      orderbookUpdatedEvent.constructor.name,
      orderbookUpdatedEvent,
    );
  }

  /**
   * Forward events from local EventEmitter2 to GraphQL pubSubService
   */
  @OnEvent(OrderbookEvent.name)
  publishOrderbookEvent(payload: OrderbookEvent) {
    this.pubSubService.publish(OrderbookEvent.name, {
      [OrderbookEvent.name]: payload,
    });
  }
}
