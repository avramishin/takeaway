import debugFactory from 'debug';
import {
  InstantBuy,
  InstantBuyEstimate,
  SDKv2,
} from '@shiftforex/client-sdkv2';

const debug = debugFactory('IB');

// const serviceUrl = 'http://localhost:3000';
const username = 'rfq.broker3@mailinator.com';
const password = 'Password_1';
const exchange = 'DEMO';
const environment = 'production';

const sdk = new SDKv2(exchange, environment);

beforeAll(async () => {
  const tokens = await sdk.login(username, password);
  sdk.accessToken = tokens.client_access_token;
  // debug('tokens', tokens);
});

test('sdk has access token', async () => {
  expect(sdk.accessToken).toBeTruthy();
});

test('estimate', async () => {
  let estimate: InstantBuyEstimate;
  try {
    estimate = await sdk.estimateInstantBuy(100, 'BTC', 'USD');
  } catch (error) {
    console.error(error);
  }
  expect(estimate).toEqual(
    expect.objectContaining({
      amountAfterDeposit: expect.any(Number),
      availableQty: expect.any(Number),
    }),
  );
  debug('estimate', estimate);
});

test('create instant buy', async () => {
  let instantBuy: InstantBuy;
  try {
    instantBuy = await sdk.createInstantBuy({
      amount: 100,
      base_product: 'BTC',
      quote_product: 'USD',
      withdraw_address: 'mywithdrawaddress',
      schema_name: 'name',
      schema_data: {},
    });
  } catch (error) {
    console.error(error);
  }

  expect(instantBuy).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      exchange_id: exchange,
      instrument_id: 'BTCUSD',
    }),
  );

  console.log(instantBuy);
});
