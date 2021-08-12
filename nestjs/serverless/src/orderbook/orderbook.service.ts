import { SDKv2, Orderbook } from '@shiftforex/client-sdkv2';
import { Injectable } from '@nestjs/common';
import { Exchange } from '../exchange/exchange.model';

@Injectable()
export class OrderbookService {
  async getOrderbook(
    exchange: Exchange,
    instrument: string,
  ): Promise<Orderbook> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`${exchange.id} ${instrument} orderbook timeout`));
      }, 10000);
      new SDKv2(exchange.id, exchange.environment)
        .edsWebsocketFactory()
        .then(ws => {
          const orderbook = new Orderbook(exchange.id, instrument, () => {
            ws.close();
            clearTimeout(timeout);
            resolve(orderbook);
          });
          orderbook.subscribe(ws);
        })
        .catch(error => reject(error));
    });
  }
}
