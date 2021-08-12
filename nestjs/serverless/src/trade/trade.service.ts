import _ from 'lodash';
import moment from 'moment';
import { plainToClass, serialize } from 'class-transformer';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { logglyFactory } from '../loggly';
import {
  Injectable,
  BadRequestException,
  OnApplicationBootstrap,
} from '@nestjs/common';

import { Order } from './order.model';
import { User } from '../user/user.model';
import { AccountTransaction } from './account-transaction.model';
import { CreateOrder } from './dto/create-order.dto';

import { OrderPagedFilter } from './dto/order-paged-filter.dto';
import { TransactionPagedFilter } from './dto/transaction-paged-filter.dto';
import { ActivityPagedFilter } from './dto/activity-paged-filter.dto';
import { Transaction } from '@shiftforex/client-sdkv2/dist/wis/interfaces/transaction.interface';
import { DynamoService, QueryInput } from '../dynamo/dynamo.service';
import { OrderPagedResponse } from './dto/order-paged-response.dto';
import { Account } from './dto/account.dto';

import { OrderEvent } from './order-event.model';
import {
  ConfiguratorOrderDto,
  CreateOrderRequestDto,
  OrderTimeInForce as DeltixTimeInForce,
  SDKv2 as AdminSDK,
} from '@shiftforex/admin-sdkv2';
import NodeCache from 'node-cache';
import { config } from '../config';
import { CancelOrderRequestDto } from '@shiftforex/admin-sdkv2/dist/admin/dto/order.dto';
import { OrderTimeInForce } from './dto/order-time-in-force.dto';
import debugFactory from 'debug';

const cache = new NodeCache();

@Injectable()
export class TradeService implements OnApplicationBootstrap {
  private adminSDKs: {
    [environment: string]: AdminSDK;
  } = {};

  constructor(private dynamoService: DynamoService) {}

  async onApplicationBootstrap() {
    const environments = Object.keys(config.authService);
    for (const environment of environments) {
      this.adminSDKs[environment] = new AdminSDK(environment);
    }
  }

  async getAdminSDKAccessToken(sdk: AdminSDK) {
    const debug = debugFactory('TradeService:getAdminSDKAccessToken');
    const cacheKey = 'ADMIN_SDK_ACCESS_TOKEN';
    let accessToken = cache.get(cacheKey);
    if (!accessToken) {
      debug(
        `Login with ${config.authService[sdk.environment].username} to ${
          sdk.environment
        }`,
      );

      const tokens = await sdk.login(
        config.authService[sdk.environment].username,
        config.authService[sdk.environment].password,
      );

      debug(`Got access token ${tokens.access_token}`);
      accessToken = tokens.access_token;
      cache.set(cacheKey, accessToken, 15 * 60);
    }
    return accessToken as string;
  }

  private async getAdminSDK(environment: string) {
    const sdk = this.adminSDKs[environment.toLowerCase()];
    sdk.serviceAccessToken = await this.getAdminSDKAccessToken(sdk);
    return sdk;
  }

  private parseMessageFromAdminServiceError(error: AxiosError) {
    let message: string = error.response?.data?.message ?? error.message;
    const json = message.match(/\{.*\}/);
    try {
      if (json?.length) message = JSON.parse(json[0]).message;
    } catch {}
    return message;
  }

  async getOrder(orderId: string, user: User) {
    const debug = debugFactory('TradeService:getOrder');
    let order: Order;

    try {
      const openOrders = await this.getOpenOrders(user);
      order = _.find(openOrders, order => order.id == orderId);

      if (!order) {
        const result = await this.dynamoService.client
          .get({
            TableName: this.dynamoService.table('closed_orders'),
            Key: {
              id: orderId,
            },
          })
          .promise();
        order = plainToClass(Order, result.Item, {
          excludeExtraneousValues: true,
        });
      }

      return order;
    } catch (error) {
      const message = this.parseMessageFromAdminServiceError(error);
      debug(`Error: ${message}`, {
        orderId,
        user,
      });
      throw new BadRequestException(message);
    }
  }

  async getOrderEvents(orderId: string) {
    const query = {
      TableName: this.dynamoService.table('order_events'),

      IndexName: 'order_id_index',
      KeyConditionExpression: 'order_id = :orderId',
      ExpressionAttributeValues: {
        ':orderId': orderId,
      },
      ScanIndexForward: false,
    } as QueryInput;

    const result = await this.dynamoService.client.query(query).promise();

    return result.Items.map(event =>
      plainToClass(OrderEvent, event, {
        excludeExtraneousValues: true,
      }),
    );
  }

  async getActivity(filter: ActivityPagedFilter, user: User) {
    const instruments = new Map(
      (
        await user.exchange.getInstrumentsThruCache()
      ).map(({ id, base_product, quote_product }) => [
        id,
        [base_product, quote_product],
      ]),
    );

    // WIS deposits and withdrawals
    const clientSdk = user.getClientSDK();

    const {
      items: accounTransactions,
    } = await this.getAccountTransactionsByType(
      {
        pager_limit: filter.pager_limit,
        pager_offset: 0,
        filter_type: '',
        filter_date_from: '',
        filter_date_to: '',
      },
      'Interest',
      user,
    );

    const {
      transactions: wisTransactions,
    } = await clientSdk.getWalletTransactionHistory({
      pager: { limit: filter.pager_limit, offset: 0 },
      sort: { field: 'created_at', direction: 'desc' },
    });

    // Closed Orders
    const { items: closedOrders } = await this.getClosedOrders(
      { pager_offset: 0, pager_limit: filter.pager_limit },
      user,
    );

    // Combine all together
    const activity = [];

    closedOrders.forEach(order => {
      activity.push({
        entity_id: order.id,
        entity_type: 'ORDER',
        description: TradeService.generateOrderDescription(order, instruments),
        instrument_id: order.instrument_id,
        status: order.status,
        type: order.type,
        side: order.side,
        quantity: order.quantity,
        executed_quantity: order.executed_quantity,
        price: order.limit_price || order.stop_price || order.average_price,
        timestamp: order.close_time,
        message: order.reason,
      });
    });

    wisTransactions.forEach(trx => {
      if (trx.status === 'PENDING') return;
      activity.push({
        entity_id: trx.txid,
        entity_type: trx.type,
        description: TradeService.generateWisDescription(trx),
        product_id: trx.product,
        amount: Number(trx.amount),
        status: trx.status,
        confirmations_count: trx.confirmations_count,
        confirmations_required: trx.confirmations_required,
        timestamp: moment(trx.created_at).valueOf(),
        message: trx.message,
      });
    });

    accounTransactions.forEach(transaction => {
      activity.push({
        entity_id: transaction.id,
        entity_type: transaction.type,
        description: 'Referral Commission',
        product_id: transaction.currency,
        amount: Number(transaction.amount),
        price: transaction.conversion_price,
        timestamp: moment(transaction.timestamp).valueOf(),
      });
    });

    /**
     * Sort and take top
     */
    return activity
      .sort((a, b) => {
        return b.timestamp - a.timestamp;
      })
      .slice(0, filter.pager_limit);
  }

  static generateOrderDescription(
    order: Order,
    instruments: Map<string, string[]>,
  ) {
    const products = instruments.get(order.instrument_id);
    if (!products?.length) return;
    const side = order.side === 'sell' ? 'Sell' : 'Buy';
    if (order.status == 'canceled') {
      return `${side} order canceled for ${order.quantity}${products[0]}`;
    } else if (order.status == 'rejected') {
      return `${side} order rejected for ${order.quantity}${products[0]}`;
    } else {
      return `${side} order executed for ${order.quantity}${
        products[0]
      } @ ${order.limit_price || order.average_price}${products[1]}`;
    }
  }

  static generateWisDescription(trx: Transaction) {
    const type = trx.type === 'DEPOSIT' ? 'Deposit' : 'Withdraw';
    return `${type} amount of ${trx.amount} ${trx.product}`;
  }

  async getTransactions(filter: TransactionPagedFilter, user: User) {
    const dateFrom = filter.filter_date_from
      ? moment(filter.filter_date_from).valueOf()
      : 0;

    const dateTo = filter.filter_date_to
      ? moment(filter.filter_date_to).valueOf()
      : moment().valueOf();

    const query = {
      TableName: this.dynamoService.table('account_transactions'),
      IndexName: 'client_user_id_index',
      KeyConditionExpression:
        'client_user_id = :userId AND #timestamp BETWEEN :dateFrom AND :dateTo',
      ExpressionAttributeValues: {
        ':userId': user.id,
        ':dateFrom': dateFrom,
        ':dateTo': dateTo,
      },
      ExpressionAttributeNames: {
        '#timestamp': 'timestamp',
      },
      ScanIndexForward: filter.sort_direction == 'asc',
    } as QueryInput;

    const result = await this.dynamoService.client.query(query).promise();

    const items = result.Items.slice(
      filter.pager_offset,
      filter.pager_offset + filter.pager_limit,
    ) as AccountTransaction[];
    return {
      items: items.map(item =>
        plainToClass(AccountTransaction, item, {
          excludeExtraneousValues: true,
        }),
      ),
      pager_limit: filter.pager_limit,
      pager_offset: filter.pager_offset,
      pager_total_rows: result.Items.length,
    };
  }

  async getAccountTransactionsByType(
    filter: TransactionPagedFilter,
    type: string,
    user: User,
  ) {
    const dateFrom = filter.filter_date_from
      ? moment(filter.filter_date_from).valueOf()
      : 0;

    const dateTo = filter.filter_date_to
      ? moment(filter.filter_date_to).valueOf()
      : moment().valueOf();

    const query = {
      TableName: this.dynamoService.table('account_transactions'),
      IndexName: 'client_user_id_index',
      KeyConditionExpression: `client_user_id = :userId AND #timestamp BETWEEN :dateFrom AND :dateTo`,
      FilterExpression: '#type = :type',
      ExpressionAttributeValues: {
        ':userId': user.id,
        ':dateFrom': dateFrom,
        ':dateTo': dateTo,
        ':type': type,
      },
      ExpressionAttributeNames: {
        '#timestamp': 'timestamp',
        '#type': 'type',
      },
      ScanIndexForward: filter.sort_direction == 'asc',
    } as QueryInput;

    const result = await this.dynamoService.client.query(query).promise();

    const items = result.Items.slice(
      filter.pager_offset,
      filter.pager_offset + filter.pager_limit,
    ) as AccountTransaction[];
    return {
      items: items.map(item =>
        plainToClass(AccountTransaction, item, {
          excludeExtraneousValues: true,
        }),
      ),
      pager_limit: filter.pager_limit,
      pager_offset: filter.pager_offset,
      pager_total_rows: result.Items.length,
    };
  }

  private mapConfiguratorOrderToOrder(
    configuratorOrder: ConfiguratorOrderDto,
    user: User,
  ): Order {
    const order = plainToClass(Order, {
      id: configuratorOrder.orderId,
      type: configuratorOrder.orderType,
      side: configuratorOrder.side,
      status: configuratorOrder.orderStatus,
      time_in_force: configuratorOrder.timeInForce,
      exchange_id: user.exchange.id,
      instrument_id: configuratorOrder.symbol,
      quantity: configuratorOrder.quantity,
      executed_quantity: configuratorOrder.cumulativeQuantity,
      limit_price: configuratorOrder.limitPrice,
      stop_price: configuratorOrder.stopPrice,
      average_price: configuratorOrder.averagePrice,
      client_user_id: user.id,
      message: configuratorOrder.reason,
      user_data: configuratorOrder.userData,
      expire_time: moment(configuratorOrder.expireTime).valueOf(),
      open_time: moment(configuratorOrder.openTime).valueOf(),
      close_time: moment(configuratorOrder.closeTime).valueOf(),
    });

    return order;
  }

  async getOpenOrders(user: User) {
    // if (user.exchange.id == 'COPTER') {
    //   throw new BadRequestException('RATE_LIMIT_EXCEEDED');
    // }

    const sdk = await this.getAdminSDK(user.exchange.environment);

    const configuratorOrders = await sdk.getConfiguratorOpenOrders({
      exchange: user.exchange.id,
      from: moment(0).toDate(),
      to: moment().toDate(),
    });

    return configuratorOrders
      .filter(order => order.client_user_id === user.id)
      .map(order => this.mapConfiguratorOrderToOrder(order, user));
  }

  async getClosedOrders(filter: OrderPagedFilter, user: User) {
    const dateFrom = filter.filter_date_from
      ? moment(filter.filter_date_from).valueOf()
      : 0;

    const dateTo = filter.filter_date_to
      ? moment(filter.filter_date_to).valueOf()
      : moment().valueOf();

    let idxName: string;
    let pkName: string;
    let pkValue: string;

    if (filter.filter_filled) {
      idxName = 'client_user_id_filled_index';
      pkValue = user.id + '#' + filter.filter_filled;
      pkName = 'client_user_id_filled';
    } else if (filter.filter_status) {
      idxName = 'client_user_id_status_index';
      pkValue = user.id + '#' + filter.filter_status;
      pkName = 'client_user_id_status';
    } else {
      idxName = 'client_user_id_index';
      pkValue = user.id;
      pkName = 'client_user_id';
    }

    const query = {
      TableName: this.dynamoService.table('closed_orders'),
      IndexName: idxName,
      KeyConditionExpression:
        '#pk = :pk AND #close_time BETWEEN :dateFrom AND :dateTo',
      ExpressionAttributeValues: {
        ':pk': pkValue,
        ':dateFrom': dateFrom,
        ':dateTo': dateTo,
      },
      ExpressionAttributeNames: {
        '#pk': pkName,
        '#close_time': 'close_time',
      },

      ScanIndexForward: filter.sort_direction == 'asc',
      Limit: 1000,
    } as QueryInput;

    const result = await this.dynamoService.client.query(query).promise();

    const items = result.Items.slice(
      filter.pager_offset || 0,
      (filter.pager_offset || 0) + filter.pager_limit,
    ) as Order[];

    return {
      items: items.map(item => {
        let trading_commission: number | undefined;
        let commission_product: string | undefined;

        Object.keys(item.transactions).forEach(key => {
          if (item.transactions[key].type == 'TradingCommission') {
            trading_commission = item.transactions[key].amount;
            commission_product = item.transactions[key].currency;
          }
        });

        const record: Order = JSON.parse(
          serialize(
            plainToClass(
              Order,
              {
                ...item,
                trading_commission,
                commission_product,
              },
              { excludeExtraneousValues: true },
            ),
          ),
        );

        return record;
      }),

      pager_limit: filter.pager_limit,
      pager_offset: filter.pager_offset,
      pager_total_rows: result.Items.length,
    } as OrderPagedResponse;
  }

  mapStringToDeltixTimeInForce(timeInForce: OrderTimeInForce) {
    const map = new Map<OrderTimeInForce, DeltixTimeInForce>([
      // ['day', 'day'],
      ['gtc', 'goodtillcancel'],
      ['ato', 'attheopening'],
      ['ioc', 'immediateorcancel'],
      ['fok', 'fillorkill'],
      ['gtcrs', 'goodtillcrossing'],
      ['gtd', 'goodtilldate'],
      ['atc', 'attheclose'],
    ]);
    return map.get(timeInForce);
  }

  createOrder(createOrder: CreateOrder, user: User) {
    if (user.whitelabel && user.whitelabel != 'TRADERSCENTRAL') {
      return this.createOrderWithRest(createOrder, user);
    } else {
      return this.createOrderWithAdmin(createOrder, user);
    }
  }

  async createOrderWithRest(createOrder: CreateOrder, user: User) {
    const debug = debugFactory('TradeService:createOrderWithRest');
    const loggly = logglyFactory('TradeService:createOrderWithRest');
    const request: AxiosRequestConfig = {
      method: 'POST',
      url: `${user.exchange.oms.rest}/api/v1/orders`,
      headers: {
        authorization: `bearer ${user.accessToken}`,
        accept: 'application/json',
        'X-Deltix-Nonce': new Date().valueOf(),
      },
      data: {
        side: createOrder.side,
        security_id: createOrder.instrument,
        quantity: createOrder.quantity.toString(),
        time_in_force: createOrder.time_in_force,
        type: createOrder.type,
        destination: createOrder.destination,
      },
    };

    if (createOrder.type == 'limit') {
      request.data.limit_price = createOrder.limit_price.toString();
    }

    if (createOrder.type == 'stop') {
      request.data.stop_price = createOrder.stop_price.toString();
    }

    if (['gtd'].includes(createOrder.time_in_force)) {
      request.data.expire_time = createOrder.expire_time;
    }

    if (createOrder.client_order_id) {
      request.data.client_order_id = createOrder.client_order_id;
    }

    try {
      debug('Request %O', {
        exchange: user.exchange.id,
        createOrder,
        user: user.username,
      });
      const response = await axios(request);
      debug('Response %O', response.data);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      await loggly(`Error: ${message}`, {
        createOrder: createOrder,
        params: request,
        user: user.username,
        response: error.response?.data,
      });
      throw new BadRequestException(message);
    }
  }

  async createOrderWithAdmin(createOrder: CreateOrder, user: User) {
    const debug = debugFactory('TradeService:createOrderWithAdmin');
    const loggly = logglyFactory('TradeService:createOrderWithAdmin');

    // TODO: add "day" to SDK OrderTimeInForce interface
    if (['day'].includes(createOrder.time_in_force)) {
      throw new BadRequestException(
        `time_in_force '${createOrder.time_in_force}' is not supported`,
      );
    }

    const sdk = await this.getAdminSDK(user.exchange.environment);

    // TODO: add user_data, expiration & client_order_id to SDK CreateOrderRequestDto interface
    const createOrderConfig = {
      client_user_id: user.id,
      symbol: createOrder.instrument,
      quantity: createOrder.quantity,
      side: createOrder.side,
      type: createOrder.type,
      time_in_force: this.mapStringToDeltixTimeInForce(
        createOrder.time_in_force,
      ),
    } as CreateOrderRequestDto & {
      user_data: string;
      expiration: number;
      client_order_id: string;
    };

    switch (createOrder.type) {
      case 'limit':
        createOrderConfig.price = createOrder.limit_price;
        break;

      case 'stop':
        createOrderConfig.price = createOrder.stop_price;
        break;

      case 'market':
        const clientSDK = user.getClientSDK();
        const quote = await clientSDK.getQuote(createOrder.instrument);
        createOrderConfig.price =
          createOrder.side === 'buy' ? quote.bid : quote.ask;
        break;
    }

    if (['gtd'].includes(createOrder.time_in_force)) {
      createOrderConfig.expiration = createOrder.expire_time;
    }

    if (createOrder.user_data) {
      createOrderConfig.user_data = createOrder.user_data;
    }

    if (createOrder.client_order_id) {
      createOrderConfig.client_order_id = createOrder.client_order_id;
    }

    try {
      // TODO: move this to SDK
      const request = {
        url: config.adminService.url + '/api/trading/place',
        method: 'POST',
        headers: {
          authorization: `Bearer ${sdk.serviceAccessToken}`,
        },
        params: {
          exchange: user.exchange.id,
        },
        data: createOrderConfig,
      } as AxiosRequestConfig;

      debug('Request %O', {
        exchange: user.exchange.id,
        createOrder,
        user: user.username,
      });

      const response = await axios(request);

      debug('Response %O', response.data);
      return response.data;
    } catch (error) {
      const message = this.parseMessageFromAdminServiceError(error);
      await loggly(`Error: ${message}`, {
        createOrder,
        createOrderConfig,
        user: user.username,
        exchange: user.exchange.id,
        response: error.response?.data,
      });

      throw new BadRequestException(message);
    }
  }

  async cancelOrderWithAdmin(orderId: string, user: User) {
    const debug = debugFactory('TradeService:cancelOrderWithAdmin');
    const loggly = logglyFactory('TradeService:cancelOrderWithAdmin');

    const order = await this.getOrder(orderId, user);
    if (!order) {
      const message = 'Order not found';

      debug(`Error: ${message} %O`, {
        orderId,
        user: user.username,
      });

      throw new BadRequestException(message);
    }

    const sdk = await this.getAdminSDK(user.exchange.environment);

    const cancelOrderRequestDto = {
      client_user_id: user.id,
      order_id: orderId,
      symbol: order.instrument_id,
      side: order.side,
      quantity: order.quantity,
    } as CancelOrderRequestDto;

    try {
      debug(cancelOrderRequestDto);
      await sdk.cancelOrder(user.exchange.id, cancelOrderRequestDto);
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      await loggly(`Error: ${message}`, {
        cancelOrderRequestDto,
        response: error.response?.data,
        orderId,
        user: user.username,
        exchange: user.exchange.id,
      });
      throw new BadRequestException(message);
    }
  }

  async cancelOrderWithRest(orderId: string, user: User) {
    const debug = debugFactory('TradeService:cancelOrderWithRest');
    const loggly = logglyFactory('TradeService:cancelOrderWithRest');
    const request: AxiosRequestConfig = {
      method: 'DELETE',
      url: `${user.exchange.oms.rest}/api/v1/orders`,
      headers: {
        authorization: `bearer ${user.accessToken}`,
        accept: 'application/json',
        'X-Deltix-Nonce': new Date().valueOf(),
        'X-Deltix-Order-ID': orderId,
      },
    };

    try {
      await axios(request);
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      await loggly(`cancelOrder error ${message}`, {
        context: {
          request,
          response: error.response?.data,
          orderId,
          user: user.username,
          exchange: user.exchange.id,
        },
      });
      throw new BadRequestException(message);
    }
  }

  cancelOrder(orderId: string, user: User) {
    if (user.whitelabel && user.whitelabel != 'TRADERSCENTRAL') {
      return this.cancelOrderWithRest(orderId, user);
    } else {
      return this.cancelOrderWithAdmin(orderId, user);
    }
  }

  async getAccounts(user: User) {
    const debug = debugFactory('TradeService:getAccounts');

    // TODO: move this to admin SDK
    const sdk = await this.getAdminSDK(user.exchange.environment);
    const request = {
      url: config.adminService.url + '/api/transaction/wallets',
      method: 'GET',
      headers: {
        authorization: `Bearer ${sdk.serviceAccessToken}`,
      },
      params: {
        exchange: user.exchange.id,
        client_user_id: user.id,
      },
    } as AxiosRequestConfig;

    try {
      const response = await axios(request);
      return response.data.wallets.map(
        wallet =>
          ({
            id: wallet.exchange_wallet_id,
            product: wallet.symbol,
            balance: {
              trade: wallet.wallet_balance,
              withdraw: wallet.active_balance,
            },
          } as Account),
      );
    } catch (error) {
      debug(`Error: ${error.message}`, {
        request,
        user,
        response: (error as AxiosError)?.response?.data,
      });
      throw error;
    }
  }
}
