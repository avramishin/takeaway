import _ from 'lodash';
import moment from 'moment';
import { v4 as uuid } from 'uuid';
import { Injectable, BadRequestException, Inject } from '@nestjs/common';

import { CreateMarketOrderQc } from './dto/create-market-order-qc.dto';
import { MarketOrderQcPagedFilter } from './dto/market-order-qc-paged-filter.dto';

import { DynamoService, QueryInput } from '../dynamo/dynamo.service';
import { MarketOrderQc } from './market-order-qc.model';
import { User } from '../user/user.model';
import { EventbridgeService } from '../eventbridge/eventbridge.service';
import { MarketOrderQcProcessor } from './market-order-qc.processor';
import { plainToClass } from 'class-transformer';
import { OrderbookService } from '../orderbook/orderbook.service';
import { ExchangeService } from '../exchange/exchange.service';
import { Logger } from 'winston';
import { TradeService } from '../trade/trade.service';

@Injectable()
export class MarketOrderQcService {
  private table: string;
  constructor(
    private dynamoService: DynamoService,
    private eventbridgeService: EventbridgeService,
    private orderbookService: OrderbookService,
    private exchangeService: ExchangeService,
    private tradeService: TradeService,
    @Inject('Logger') private logger: Logger,
  ) {
    this.table = this.dynamoService.table('market_orders_qc');
  }

  async createOrder(createOrder: CreateMarketOrderQc, user: User) {
    const instrument = _.find(await user.exchange.getInstrumentsThruCache(), {
      id: createOrder.instrument,
    });

    if (!instrument) {
      throw new BadRequestException('No instrument found!');
    }

    const orderbook = await this.orderbookService.getOrderbook(
      user.exchange,
      instrument.id,
    );

    const quoteVWap = orderbook.calculateQuoteVolumeVWAP(
      createOrder.side,
      createOrder.quantity,
    );

    if (quoteVWap.volume < createOrder.quantity || quoteVWap.price <= 0) {
      throw new BadRequestException('Not enough liquidity, try later!');
    }

    const accounts = await this.tradeService.getAccounts(user);
    const baseAccount = accounts.find(
      account => account.product == instrument.base_product,
    );

    if (!baseAccount) {
      throw new BadRequestException(
        `You don't have ${instrument.base_product} account`,
      );
    }

    const quoteAccount = accounts.find(
      account => account.product == instrument.quote_product,
    );

    if (!quoteAccount) {
      throw new BadRequestException(
        `You don't have ${instrument.quote_product} account`,
      );
    }

    if (createOrder.side == 'sell') {
      const requiredBalance = _.round(
        createOrder.quantity / quoteVWap.price,
        instrument.price_decimals,
      );
      if (baseAccount.balance.trade < requiredBalance) {
        throw new BadRequestException(
          `Not enough funds at ${baseAccount.product} account, current balance ${baseAccount.balance.trade}, but ${requiredBalance} required`,
        );
      }
    } else {
      const requiredBalance = createOrder.quantity;
      if (quoteAccount.balance.trade < requiredBalance) {
        throw new BadRequestException(
          `Not enough funds at ${quoteAccount.product} account, current balance ${quoteAccount.balance.trade}, but ${requiredBalance} required`,
        );
      }
    }

    const order = new MarketOrderQc();
    order.id = uuid();
    order.exchange_id = user.exchange.id;
    order.client_user_id = user.id;
    order.instrument_id = instrument.id;
    order.status = 'new';
    order.side = createOrder.side;
    order.quantity = createOrder.quantity;
    order.executed_quantity = 0;
    order.executed_base_quantity = 0;
    order.limit_orders = {};
    order.access_token = user.accessToken;
    order.open_time = new Date().valueOf();
    this.logger.debug('Saving new MarketOrderQC order', {
      context: {
        order,
      },
    });
    await this.dynamoService.client
      .put({
        TableName: this.table,
        Item: order,
      })
      .promise();
    await this.eventbridgeService.publish('MarketOrderQc', order);
    return order;
  }

  async getOrder(orderId: string) {
    const result = await this.dynamoService.client
      .get({
        TableName: this.table,
        Key: {
          id: orderId,
        },
      })
      .promise();

    if (!result.Item) {
      throw new BadRequestException('Order not found');
    }

    return plainToClass(MarketOrderQc, result.Item);
  }

  async getOrders(filter: MarketOrderQcPagedFilter, user: User) {
    const dateFrom = filter.filter_date_from
      ? moment(filter.filter_date_from).valueOf()
      : 0;

    const dateTo = filter.filter_date_to
      ? moment(filter.filter_date_to).valueOf()
      : moment().valueOf();

    const params = {
      TableName: this.table,
      IndexName: 'client_user_id_index',
      KeyConditionExpression:
        'client_user_id = :userId AND open_time BETWEEN :dateFrom AND :dateTo',
      ExpressionAttributeValues: {
        ':userId': user.id,
        ':dateFrom': dateFrom,
        ':dateTo': dateTo,
      },

      ScanIndexForward: filter.sort_direction == 'asc',
      Limit: filter.pager_limit,
    } as QueryInput;

    if (filter.exclusive_start_key) {
      params.ExclusiveStartKey = filter.exclusive_start_key;
    }

    const result = await this.dynamoService.client.query(params).promise();
    const items = result.Items as MarketOrderQc[];

    return {
      items: items,
      pager_limit: filter.pager_limit,
      last_evaluated_key: result.LastEvaluatedKey,
    };
  }

  /**
   * Method to invoke from lambda triggered my MarketOrderQc message
   * @param orderId
   */
  async process(orderId: string) {
    return new MarketOrderQcProcessor(
      await this.getOrder(orderId),
      this.orderbookService,
      this.dynamoService,
      this.exchangeService,
      this.eventbridgeService,
      this.logger,
    ).process();
  }
}
