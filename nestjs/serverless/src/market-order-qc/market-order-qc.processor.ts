import _ from 'lodash';
import axios, { AxiosRequestConfig } from 'axios';
import { MarketOrderQc } from './market-order-qc.model';
import { DynamoService } from '../dynamo/dynamo.service';
import { EventbridgeService } from '../eventbridge/eventbridge.service';
import { waitFor } from '../helpers/wait-for.helper';
import { OrderbookService } from '../orderbook/orderbook.service';
import { ExchangeService } from '../exchange/exchange.service';
import { plainToClass } from 'class-transformer';
import { Exchange } from '../exchange/exchange.model';
import { Instrument, Orderbook, Product } from '@shiftforex/client-sdkv2';
import { Order } from '../trade/order.model';
import { Logger } from 'winston';

// const NO_ORDERBOOK_DELAY = 5000;
const LIMIT_ORDER_LOOKUP = 1500;
const LIMIT_ORDER_TIMEOUT = 30000;
const LIMIT_ORDER_SUCCESS = ['expired', 'canceled', 'completely_filled'];
const LIMIT_ORDER_FAILURE = ['rejected'];

export class MarketOrderQcProcessor {
  private table: string;
  private exchange: Exchange;
  private instrument: Instrument;
  private quoteProduct: Product;
  private orderbook: Orderbook;

  constructor(
    private order: MarketOrderQc,
    private orderbookService: OrderbookService,
    private dynamoService: DynamoService,
    private exchangeService: ExchangeService,
    private eventbridgeService: EventbridgeService,
    private logger: Logger,
  ) {
    this.table = this.dynamoService.table('market_orders_qc');
  }

  async process() {
    try {
      if (['completely_filled', 'rejected'].includes(this.order.status)) {
        return;
      }

      this.exchange = await this.exchangeService.getByIdThruCache(
        this.order.exchange_id,
      );

      this.instrument = _.find(await this.exchange.getInstrumentsThruCache(), {
        id: this.order.instrument_id,
      });

      this.quoteProduct = _.find(await this.exchange.getProductsThruCache(), {
        id: this.instrument.quote_product,
      });

      const requiredQty = this.order.quantity - this.order.executed_quantity;

      this.orderbook = await this.orderbookService.getOrderbook(
        this.exchange,
        this.instrument.id,
      );

      const orderbookSide =
        this.order.side == 'buy'
          ? this.orderbook.getSellSide()
          : this.orderbook.getBuySide();

      if (orderbookSide.length == 0) {
        throw new Error(`No market for ${orderbookSide} side`);
      }

      let layer: number;
      let availableQty = 0;
      let availableQuoteQty = 0;
      let previousSafeQty = 0;
      let previousPrice = 0;

      for (layer = 0; layer < orderbookSide.length; layer++) {
        const safeQuantity = requiredQty / orderbookSide[layer].price;
        if (safeQuantity < availableQty) {
          break;
        }

        if (availableQuoteQty >= requiredQty) {
          break;
        }

        previousPrice = orderbookSide[layer].price;
        previousSafeQty = safeQuantity;
        availableQty += orderbookSide[layer].volume;
        availableQuoteQty +=
          orderbookSide[layer].volume * orderbookSide[layer].price;
      }

      /** make qty multiple of increment */
      previousSafeQty =
        Math.trunc(previousSafeQty / this.instrument.quantity_increment) *
        this.instrument.quantity_increment;
      previousSafeQty = _.round(
        previousSafeQty,
        this.instrument.quantity_decimals,
      );

      if (previousSafeQty < this.instrument.min_quantity) {
        if (this.order.executed_quantity == 0) {
          // first iteration, no qty exectuted yet and qty to trade is less than min qty
          // have to reject order
          this.order.reason = `qty ${previousSafeQty} < min qty ${this.instrument.min_quantity}`;
          this.order.status = 'rejected';
        } else {
          // there is already traded qty and we just got to complete order because
          // qty to trade is less than min qty
          this.order.status = 'completely_filled';
        }

        await this.saveOrder();
        await this.eventbridgeService.publish(
          'MarketOrderQcClosed',
          this.order,
        );
        return;
      }

      previousPrice = _.round(previousPrice, this.instrument.price_decimals);
      const executedQty = await this.executeLimitOrder(
        previousSafeQty,
        previousPrice,
      );

      this.order.executed_quantity += _.round(
        executedQty * previousPrice,
        this.quoteProduct.precision,
      );

      this.order.executed_base_quantity += executedQty;
      const remainingQty = this.order.quantity - this.order.executed_quantity;

      if (remainingQty <= 0) {
        this.order.status = 'completely_filled';
      } else {
        this.order.status = 'partially_filled';
      }

      await this.saveOrder();
      if (this.order.status == 'completely_filled') {
        await this.eventbridgeService.publish(
          'MarketOrderQcClosed',
          this.order,
        );
      } else {
        /** Go next round */
        await this.eventbridgeService.publish('MarketOrderQc', this.order);
      }
    } catch (error) {
      this.order.reason = error.message;
      this.order.status = 'rejected';
      this.logger.error(`MAQC process error ${error.message}`, {
        context: {
          stack: error.stack,
          order: this.order,
        },
      });
      await this.saveOrder();
      await this.eventbridgeService.publish('MarketOrderQcClosed', this.order);
    }
  }

  /**
   * Execute limit order and return executed quantity in base currency
   * @param quantity
   * @param price
   */
  private async executeLimitOrder(
    quantity: number,
    price: number,
  ): Promise<number> {
    const request: AxiosRequestConfig = {
      method: 'POST',
      url: `${this.exchange.oms.rest}/api/v1/orders`,
      headers: {
        authorization: `bearer ${this.order.access_token}`,
        accept: 'application/json',
        'X-Deltix-Nonce': new Date().valueOf(),
      },
      data: {
        security_id: this.order.instrument_id,
        side: this.order.side,
        quantity: quantity.toString(),
        time_in_force: 'ioc',
        destination: 'SHIFTFX',
        type: 'limit',
        limit_price: price,
      },
    };

    this.logger.info('MAQC executeLimitOrder: placing limit order', {
      context: { request, order: this.order },
    });

    let limitOrderId: string;
    try {
      const { data } = await axios(request);
      limitOrderId = data.id;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      this.logger.error(`Execute limit order error ${message}`, {
        context: {
          params: request,
          response: error.response?.data,
          order: this.order,
        },
      });
      throw new Error(message);
    }

    if (!limitOrderId) {
      throw new Error(
        `Could not create limit order ${this.order.instrument_id} ${this.order.side} ${quantity}@${price}`,
      );
    }

    let limitOrder: Order;
    let timeout = 0;

    setTimeout(() => {
      timeout = 1;
    }, LIMIT_ORDER_TIMEOUT);

    while (!timeout) {
      await waitFor(LIMIT_ORDER_LOOKUP);
      this.logger.info(`MAQC waiting limit order ${limitOrderId} to complete`, {
        context: this.order,
      });

      const result = await this.dynamoService.client
        .get({
          TableName: this.dynamoService.table('closed_orders'),
          Key: {
            id: limitOrderId,
          },
        })
        .promise();

      if (result.Item) {
        limitOrder = plainToClass(Order, result.Item);
        this.order.limit_orders[limitOrder.id] = limitOrder;
        await this.saveOrder();
        if (LIMIT_ORDER_SUCCESS.includes(limitOrder.status)) {
          return limitOrder.executed_quantity;
        } else if (LIMIT_ORDER_FAILURE.includes(limitOrder.status)) {
          if (limitOrder.executed_quantity > 0) {
            return limitOrder.executed_quantity;
          }
          throw new Error(limitOrder.reason);
        }
      }
    }

    throw new Error(`Limit order ${limitOrderId} timeout`);
  }

  async saveOrder() {
    return this.dynamoService.client
      .update({
        TableName: this.table,
        Key: {
          id: this.order.id,
        },
        UpdateExpression:
          'set ' +
          [
            '#reason = :reason',
            '#status = :status',
            '#limit_orders = :limit_orders',
            '#executed_quantity = :executed_quantity',
            '#executed_base_quantity = :executed_base_quantity',
            '#close_time = :close_time',
          ].join(', '),
        ExpressionAttributeValues: {
          ':reason': this.order.reason || '',
          ':status': this.order.status,
          ':limit_orders': this.order.limit_orders,
          ':executed_quantity': this.order.executed_quantity,
          ':executed_base_quantity': this.order.executed_base_quantity,
          ':close_time': new Date().valueOf(),
        },
        ExpressionAttributeNames: {
          '#status': 'status',
          '#reason': 'reason',
          '#limit_orders': 'limit_orders',
          '#executed_quantity': 'executed_quantity',
          '#executed_base_quantity': 'executed_base_quantity',
          '#close_time': 'close_time',
        },
      })
      .promise();
  }

 
}
