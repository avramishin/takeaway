import { default as debugFactory } from 'debug';

import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { OrdersService } from '../orders/orders.service';
import { InstrumentsService } from '../instruments/instruments.service';
import { Ticker } from './ticker';
import { Order, OrderSideEnum } from '../orders/entities/order.entity';
import { PubSubService } from '../pubsub.service';
import { OrderEvent, OrderEventTypeEnum } from '../orders/order.event';
import { TickerEvent, TickerEventTypeEnum } from './ticker.event';

@Injectable()
export class TickersService implements OnApplicationBootstrap {
  private debug = debugFactory(TickersService.name);

  tickers: Record<string, Ticker> = {};

  constructor(
    private ordersService: OrdersService,
    private instrumentsService: InstrumentsService,
    private eventEmitter: EventEmitter2,
    private pubSubService: PubSubService,
  ) {
    this.eventEmitter.on(OrderEvent.name, (orderEvent: OrderEvent) => {
      if (
        [
          OrderEventTypeEnum.OrderClosed,
          OrderEventTypeEnum.OrderOpened,
        ].includes(orderEvent.type)
      ) {
        this.updateTicker(orderEvent.order.instrument_id);
      }
    });
  }

  getTicker(instrument: string) {
    return this.tickers[instrument];
  }

  async onApplicationBootstrap() {
    // update tickers on service start
    const instruments = await this.instrumentsService.findAll();
    this.debug(`Building tickers for ${instruments.length} instruments`);
    instruments.forEach((instrument) => this.updateTicker(instrument.id));
  }

  updateTicker(instrumentId: string) {
    const ticker = new Ticker();
    ticker.instrument = instrumentId;
    [OrderSideEnum.buy, OrderSideEnum.sell].forEach((side) => {
      const orders = this.ordersService.openOrdersLocal
        .filter(
          (order) => order.instrument_id == instrumentId && order.side == side,
        )
        .sort((a: Order, b: Order) => {
          return side == OrderSideEnum.buy
            ? b.price - a.price
            : a.price - b.price;
        });

      if (orders.length) {
        if (side == OrderSideEnum.sell) {
          ticker.ask = orders[0].price;
        } else {
          ticker.bid = orders[0].price;
        }
      }
    });

    const lastTicker = this.getTicker(instrumentId);
    if (lastTicker) {
      if (lastTicker.ask == ticker.ask && lastTicker.bid == lastTicker.bid) {
        // no update
        return;
      }
    }

    this.tickers[instrumentId] = ticker;

    const tickerUpdatedEvent = new TickerEvent();
    tickerUpdatedEvent.type = TickerEventTypeEnum.TickerUpdated;
    tickerUpdatedEvent.ticker = ticker;
    return this.eventEmitter.emitAsync(
      tickerUpdatedEvent.constructor.name,
      tickerUpdatedEvent,
    );
  }

  /**
   * Forward events from local EventEmitter2 to GraphQL pubSubService
   */
  @OnEvent(TickerEvent.name)
  publishTickerEvent(payload: TickerEvent) {
    this.pubSubService.publish(TickerEvent.name, {
      [TickerEvent.name]: payload,
    });
  }
}
