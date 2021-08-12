import { default as WebSocket } from 'ws';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { config } from './binance.config';
import { Orderbook, OrderbookItem } from '../../orderbooks/orderbook';
import { OrderSideEnum } from '../../orders/entities/order.entity';
import { BinanceReposter } from './binance.reposter';

@Injectable()
export class BinanceService implements OnApplicationBootstrap {
  private requestId = new Date().valueOf();
  private logger = new Logger(BinanceService.name);
  private ws: WebSocket;
  private orderbooks: Map<string, Orderbook> = new Map();

  constructor(private eventEmiter: EventEmitter2) {}

  async onApplicationBootstrap() {
    this.initOrderbooks();
    await this.createReposters();
    this.connectWebsocket();
  }

  async createReposters() {
    for (const trader of config.traders) {
      const reposter = new BinanceReposter(trader.username, this.eventEmiter);
      await reposter.authenticate();
    }
  }

  connectWebsocket() {
    this.logger.log(`connecting to ${config.ws}`);
    this.ws = new WebSocket(config.ws);
    this.ws.on('open', () => {
      const subscribe = {
        method: 'SUBSCRIBE',
        params: [
          ...config.instruments.map(
            (instrument) => `${instrument.toLowerCase()}@depth`,
          ),
        ],
        id: ++this.requestId,
      };
      this.logger.log(subscribe);
      this.ws.send(JSON.stringify(subscribe));
    });

    this.ws.on('message', (message) => {
      const frame = JSON.parse(message.toString());
      if (!frame.data) {
        return;
      }
      this.updateOrderbook(frame.data.s, frame.data.b, frame.data.a);
    });

    this.ws.on('close', (code) => {
      this.logger.error(`websocket closed code ${code}`);
      setTimeout(this.connectWebsocket, 5000);
    });
  }

  initOrderbooks() {
    config.instruments.forEach((instrument) => {
      const orderbook = new Orderbook();
      orderbook.instrument = instrument;
      this.orderbooks.set(instrument, orderbook);
    });
  }

  updateOrderbook(instrument: string, bids: any[], asks: any[]) {
    const orderbook = this.orderbooks.get(instrument);
    const sides: Record<OrderSideEnum, any[]> = {
      [OrderSideEnum.buy]: bids,
      [OrderSideEnum.sell]: asks,
    };
    const update: OrderbookItem[] = [];
    Object.keys(sides).forEach((side) => {
      const items = sides[side];
      items.forEach((item) => {
        const record = new OrderbookItem();
        record.price = Number(item[0]);
        record.quantity = Number(item[1]);
        record.side = side as OrderSideEnum;
        update.push(record);
      });
    });

    orderbook.clear();
    orderbook.update(update);

    this.eventEmiter.emitAsync('orderbook.updated', orderbook);
  }
}
