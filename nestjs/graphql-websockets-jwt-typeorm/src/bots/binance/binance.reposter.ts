import axios, { AxiosRequestConfig } from 'axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { OpenOrderArgs } from '../../orders/dto/open-order.args';
import { Orderbook } from '../../orderbooks/orderbook';
import {
  OrderSideEnum,
  OrderStatusEnum,
  OrderTimeInForceEnum,
  OrderTypeEnum,
} from '../../orders/entities/order.entity';
import { config } from './binance.config';

export class BinanceReposter {
  private accessToken: string;
  private settings: typeof config.traders[0];

  constructor(username: string, private eventEmiter: EventEmitter2) {
    this.settings = config.traders.find((user) => user.username == username);

    this.eventEmiter.on('orderbook.updated', this.main.bind(this));
  }

  @Cron('0 0 */2 * * *')
  async authenticate() {
    const response = await this.request({
      query: `mutation ($username: String!, $password: String!) {
        accessToken:authenticate(username: $username, password: $password)
      }`,
      variables: {
        username: this.settings.username,
        password: this.settings.password,
      },
    });

    this.accessToken = response.accessToken;
  }

  async main(orderbook: Orderbook) {
    if (!this.settings.instruments.includes(orderbook.instrument)) {
      return;
    }

    const openOrders = (await this.getOpenOrders()).filter(
      (order) => order.instrument_id == orderbook.instrument,
    );

    for (const order of openOrders) {
      try {
        await this.cancelOrder(order.id);
      } catch (error) {
        console.error(`Error cancelling order ${order.id}`, error.message);
      }
    }

    // make sure no open orders left
    const openOrdersCheck = (await this.getOpenOrders()).filter(
      (order) => order.instrument_id == orderbook.instrument,
    );

    if (openOrdersCheck.length) {
      console.log(
        `Open orders left after cancellation ${openOrdersCheck.length}`,
      );
      openOrdersCheck.forEach((o) => console.log('??? ' + o.id));
      return;
    }

    for (const side of [OrderSideEnum.buy, OrderSideEnum.sell]) {
      const orders = (side == OrderSideEnum.buy
        ? orderbook.getBuySide()
        : orderbook.getSellSide()
      ).slice(0, this.settings.layersToCopy);

      for (const origOrder of orders) {
        const order = new OpenOrderArgs();
        order.instrument_id = orderbook.instrument;
        order.side = side;
        order.time_in_force = OrderTimeInForceEnum.gtc;
        order.type = OrderTypeEnum.limit;
        order.quantity = origOrder.quantity * this.settings.pRatePercent;
        order.quantity = Number(order.quantity.toPrecision(6));

        if (side == OrderSideEnum.buy) {
          order.price =
            origOrder.price - origOrder.price * this.settings.markupPercent;
        } else {
          order.price =
            origOrder.price + origOrder.price * this.settings.markupPercent;
        }

        order.price = Number(order.price.toFixed(6));

        await this.openOrder(order);
      }
    }
  }

  async getOpenOrders() {
    const response = await this.request({
      query: `{
        openOrders:getOpenOrders {
          id
          side
          instrument_id
          quantity
          executed_quantity
          price
          status
          created_at
        }
      }`,
    });

    return response.openOrders as {
      id: string;
      side: OrderSideEnum;
      instrument_id: string;
      quantity: number;
      executed_quantity: number;
      price: number;
      status: OrderStatusEnum;
    }[];
  }

  async cancelOrder(id: string) {
    await this.request({
      query: `mutation ($id: String!, $message: String!) {
        cancelOrder(id: $id, message: $message)
      }`,
      variables: {
        id,
        message: 'Cancelled by user',
      },
    });
    console.log(`Cancel order ${id}`);
  }

  async openOrder(order: OpenOrderArgs) {
    const response = await this.request({
      query: `mutation (
          $instrument_id: String!,
          $quantity: Float!,
          $type: OrderTypeEnum!, 
          $side: OrderSideEnum!,
          $price: Float,
          $time_in_force: OrderTimeInForceEnum!
        ) {
        openOrder(
          instrument_id: $instrument_id,
          quantity: $quantity,
          type: $type,
          side: $side,
          price: $price,
          time_in_force: $time_in_force
        ) {
          id
          instrument_id
          side
          price
          type
          quantity
        }
      }`,
      variables: order,
    });

    console.log(
      `Opened ${response.openOrder.id} ${response.openOrder.instrument_id} ${response.openOrder.quantity} ${response.openOrder.side} ${response.openOrder.price}`,
    );
  }

  private async request(data: any) {
    const request = {
      method: 'post',
      url: config.oms.url,
      headers: {},
      data,
    } as AxiosRequestConfig;
    if (this.accessToken) {
      Object.assign(request.headers, {
        authorization: `bearer ${this.accessToken}`,
      });
    }
    try {
      const response = await axios(request);
      if (response.data.errors) {
        console.error(response.data.errors);
        throw new Error(response.data.errors);
      }
      return response.data.data;
    } catch (error) {
      console.error(error.response?.data);
      throw new Error(error.message);
    }
  }
}
