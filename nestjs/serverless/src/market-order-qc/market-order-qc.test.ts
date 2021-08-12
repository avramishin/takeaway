import axios, { AxiosRequestConfig } from 'axios';
import debugFactory from 'debug';
import { SDKv2 } from '@shiftforex/client-sdkv2';

const debug = debugFactory('MAQC');

// const serviceUrl = 'http://localhost:3000';
const serviceUrl = 'https://trade-service-sls.cryptosrvc.com';
const username = 'rfq.broker3@mailinator.com';
const password = 'Password_1';
const exchange = 'DEMO';
const instrument = 'BTCUSD';
const environment = 'production';

let headers: any;

const sdk = new SDKv2(exchange, environment);

beforeAll(async () => {
  const tokens = await sdk.login(username, password);
  sdk.accessToken = tokens.client_access_token;
  // debug('tokens', tokens);
  headers = {
    authorization: `Bearer ${sdk.accessToken}`,
  };
});

test('sdk has access token', async () => {
  expect(sdk.accessToken).toBeTruthy();
});

test('place order', async () => {
  const request = {
    method: 'POST',
    url: `${serviceUrl}/v1/market-order-qc`,
    headers,
    data: {
      instrument,
      side: 'sell',
      quantity: 200,
    },
  } as AxiosRequestConfig;
  const response = await axios(request);
  const order = response.data;
  debug('limit order', order);
});
