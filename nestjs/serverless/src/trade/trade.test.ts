import axios, { AxiosRequestConfig } from 'axios';
import debugFactory from 'debug';
import {
  OrderSide,
  OrderTimeInForce,
  OrderType,
  SDKv2,
} from '@shiftforex/client-sdkv2';
import { v4 as uuid } from 'uuid';
jest.setTimeout(10000);

const myLimitOrders = [];
const myMarketOrders = [];
const myOpenOrders = [];
const myClosedFilledOrders = [];

const debug = debugFactory('Trade');

// const serviceUrl = 'http://localhost:3000/v1';
// const serviceUrl = 'https://trade-service-sls.cryptosrvc-dev.com/v1'  ;
const serviceUrl = 'https://trade-service-sls.cryptosrvc.com/v1';
const username = 'rfq.broker3@mailinator.com';
const password = 'Password_1';
const exchange = 'DEMO';
const instrument = 'BTCUSD';
const environment = 'production';
let orderbook: any = {};
let user_id: string;

const sdk = new SDKv2(exchange, environment);
sdk.config.trade_api_sls_url = serviceUrl;

beforeAll(async () => {
  const tokens = await sdk.login(username, password);
  sdk.accessToken = tokens.client_access_token;
  user_id = tokens.client_user_id;
});

test('sdk has access token', async () => {
  expect(sdk.accessToken).toBeTruthy();
  console.log(sdk.accessToken);
});

test('get closed canceled orders', async () => {
  const pagedOrdersResponse = await sdk.getClosedOrders({
    pager_limit: 5,
    filter_status: 'canceled',
    pager_offset: 0,
  });

  debug('closed canceled orders', pagedOrdersResponse);
  expect(pagedOrdersResponse.items.length).toBeGreaterThan(0);

  for (const order of pagedOrdersResponse.items) {
    expect(order).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        instrument_id: expect.any(String),
        exchange_id: exchange,
        client_user_id: user_id,
        status: 'canceled',
      }),
    );
  }
});

test('get closed filled orders', async () => {
  const pagedOrdersResponse = await sdk.getClosedOrders({
    pager_limit: 5,
    filter_filled: 'yes',
  });

  debug('closed filled orders', pagedOrdersResponse);
  expect(pagedOrdersResponse.items.length > 0).toBeTruthy();

  for (const order of pagedOrdersResponse.items) {
    expect(order).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        instrument_id: expect.any(String),
        exchange_id: exchange,
        client_user_id: user_id,
        status: 'completely_filled',
      }),
    );

    myClosedFilledOrders.push(order);
  }
});

test('get closed order events', async () => {
  for (const order of myClosedFilledOrders) {
    const events = await sdk.getOrderEvents(order.id);
    debug('order events', events);
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          order_id: expect.any(String),
          type: expect.any(String),
        }),
      );
    }
    break;
  }
});

test('get all closed orders', async () => {
  const pager_limit = 20;
  const pagedOrdersResponse = await sdk.getClosedOrders({
    pager_limit,
  });

  // console.log(pagedOrdersResponse);

  debug('all closed orders', pagedOrdersResponse);
  expect(pagedOrdersResponse.pager_limit).toEqual(pager_limit);

  for (const order of pagedOrdersResponse.items) {
    expect(order).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        instrument_id: expect.any(String),
        exchange_id: exchange,
        client_user_id: user_id,
      }),
    );
  }
});

test('get orderbooks snapshot', async () => {
  const request = {
    method: 'GET',
    url: `${serviceUrl}/orderbook/snapshot/${exchange}/${instrument}`,
  } as AxiosRequestConfig;
  const response = await axios(request);
  orderbook = response.data;
  expect(orderbook).toEqual(
    expect.objectContaining({
      sell: expect.any(Array),
      buy: expect.any(Array),
    }),
  );
  debug(orderbook);
});

test('open market order', async () => {
  for (const side of ['sell', 'buy']) {
    const createOrder = {
      instrument,
      client_order_id: uuid().toUpperCase(),
      type: 'market' as OrderType,
      quantity: 0.001,
      side: side as OrderSide,
      time_in_force: 'ioc' as OrderTimeInForce,
    };
    const order = await sdk.createOrder(createOrder);

    debug('limit order', order);
    expect(order).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        status: expect.any(String),
      }),
    );
    myMarketOrders.push(order);
  }
});

test('open limit orders', async () => {
  for (const side of ['sell', 'buy']) {
    const limit_price =
      side == 'buy'
        ? orderbook.buy[orderbook.buy.length - 1].price - 100
        : orderbook.sell[orderbook.sell.length - 1].price + 100;

    const createOrder = {
      instrument,
      client_order_id: uuid().toUpperCase(),
      type: 'limit' as OrderType,
      quantity: 0.001,
      limit_price: limit_price,
      side: side as OrderSide,
      time_in_force: 'gtc' as OrderTimeInForce,
    };
    const order = await sdk.createOrder(createOrder);
    debug('limit order', order);
    expect(order).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        status: expect.any(String),
      }),
    );
    myLimitOrders.push(order);
  }
});

test('get orders by id', async () => {
  for (const myOrder of myLimitOrders) {
    const order = await sdk.getOrder(myOrder.id);
    expect(order.id).toEqual(myOrder.id);
  }
});

test('get open orders', async () => {
  const openOrders = await sdk.getOpenOrders();

  debug('open orders', openOrders);
  for (const order of openOrders) {
    expect(order).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        instrument_id: expect.any(String),
        exchange_id: exchange,
      }),
    );
    myOpenOrders.push(order);
  }
});

test('close my open orders', async () => {
  for (const order of myOpenOrders) {
    await sdk.cancelOrder(order.id);
  }
});

test('no open orders left', async () => {
  const openOrders = await sdk.getOpenOrders();
  debug('open orders', openOrders);
  expect(openOrders.length).toEqual(0);
});

test('get transactions history', async () => {
  const pager_limit = 5;
  const trxHistoryResponse = await sdk.getAccountTransactions({
    pager_limit,
  });

  debug('transactions history', trxHistoryResponse);

  expect(trxHistoryResponse.pager_limit).toEqual(pager_limit);

  for (const order of trxHistoryResponse.items) {
    expect(order).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        currency: expect.any(String),
        amount: expect.any(Number),
        post_balance: expect.any(Number),
      }),
    );
  }
});

test('get accounts', async () => {
  const accounts = await sdk.getAccounts();
  debug('accounts', accounts);
  for (const order of accounts) {
    expect(order).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        product: expect.any(String),
        balance: {
          trade: expect.any(Number),
          withdraw: expect.any(Number),
        },
      }),
    );
  }
});

test('get activity', async () => {
  const pager_limit = 10;
  const activity = await sdk.getActivity({
    pager_limit,
  });

  debug('activity', activity);
  expect(activity).toStrictEqual(expect.any(Array));
  for (const row of activity) {
    expect(row).toEqual(
      expect.objectContaining({
        entity_type: expect.any(String),
      }),
    );
  }
  expect(activity.length).toEqual(pager_limit);
});
