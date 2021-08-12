import { v4 as uuid } from 'uuid';
import { Instrument } from '../instruments/entities/instrument.entity';
import { User } from '../users/entities/user.entity';
import { Account } from '../accounts/entities/account.entity';
import { Currency } from '../currencies/currency.entity';

function fakeId(prefix: string) {
  return (prefix + '-' + uuid()).slice(0, 35);
}

export function getSnapshot() {
  // Currencies
  const btc = new Currency();
  btc.id = 'BTC';
  btc.type = 'crypto';
  btc.precission = 5;

  const usd = new Currency();
  usd.id = 'USD';
  usd.type = 'fiat';
  usd.precission = 2;

  const usdt = new Currency();
  usdt.id = 'USDT';
  usdt.type = 'crypto';
  usdt.precission = 2;

  const usdc = new Currency();
  usdc.id = 'USDC';
  usdc.type = 'crypto';
  usdc.precission = 2;

  const eth = new Currency();
  eth.id = 'ETH';
  eth.type = 'crypto';
  eth.precission = 8;

  const jpy = new Currency();
  jpy.id = 'JPY';
  jpy.type = 'fiat';
  jpy.precission = 2;

  const currencies = [btc, usdt, usdc, usd, eth, jpy];

  // Instruments
  const btcusd = new Instrument();
  btcusd.id = `${btc.id}${usd.id}`;
  btcusd.base_currency = btc.id;
  btcusd.quote_currency = usd.id;
  btcusd.quantity_increment = 0.0000001;

  const btcusdt = new Instrument();
  btcusdt.id = `${btc.id}${usdt.id}`;
  btcusdt.base_currency = btc.id;
  btcusdt.quote_currency = usdt.id;
  btcusdt.quantity_increment = 0.0000001;

  const btcusdc = new Instrument();
  btcusdc.id = `${btc.id}${usdc.id}`;
  btcusdc.base_currency = btc.id;
  btcusdc.quote_currency = usdc.id;
  btcusdc.quantity_increment = 0.0000001;

  const ethusd = new Instrument();
  ethusd.id = `${eth.id}${usd.id}`;
  ethusd.base_currency = eth.id;
  ethusd.quote_currency = usd.id;
  ethusd.quantity_increment = 0.0000001;

  const ethusdt = new Instrument();
  ethusdt.id = `${eth.id}${usdt.id}`;
  ethusdt.base_currency = eth.id;
  ethusdt.quote_currency = usdt.id;
  ethusdt.quantity_increment = 0.0000001;

  const ethbtc = new Instrument();
  ethbtc.id = `${eth.id}${btc.id}`;
  ethbtc.base_currency = eth.id;
  ethbtc.quote_currency = btc.id;
  ethbtc.quantity_increment = 0.0000001;

  const btcjpy = new Instrument();
  btcjpy.id = `${btc.id}${jpy.id}`;
  btcjpy.base_currency = btc.id;
  btcjpy.quote_currency = jpy.id;
  btcjpy.quantity_increment = 0.00001;

  const instruments = [
    btcusd,
    ethusd,
    ethusdt,
    btcjpy,
    btcusdt,
    btcusdc,
    ethbtc,
  ];

  // password qweqwe
  const password =
    '$2b$10$w0xO18IOXMSlPwOHxkhop.13tfxIDO8HLi2QKqKjeepf8hnbskd5i';

  // Brokers
  const broker_1 = new User();
  broker_1.id = fakeId('broker_1');
  broker_1.username = 'broker_1';
  broker_1.password_hash = password;

  const broker_2 = new User();
  broker_2.id = fakeId('broker_2');
  broker_2.username = 'broker_2';
  broker_2.password_hash = password;

  // Traders
  const trader_1 = new User();
  trader_1.id = fakeId('trader_1');
  trader_1.username = 'trader_1';
  trader_1.broker_id = broker_1.id;
  trader_1.password_hash = password;

  const trader_2 = new User();
  trader_2.id = fakeId('trader_2');
  trader_2.username = 'trader_2';
  trader_2.broker_id = broker_1.id;
  trader_2.password_hash = password;

  const trader_3 = new User();
  trader_3.id = fakeId('trader_3');
  trader_3.username = 'trader_3';
  trader_3.broker_id = broker_2.id;
  trader_3.password_hash = password;

  const trader_4 = new User();
  trader_4.id = fakeId('trader_4');
  trader_4.username = 'trader_4';
  trader_4.broker_id = broker_2.id;
  trader_4.password_hash = password;

  const users = [broker_1, broker_2, trader_1, trader_2, trader_3, trader_4];

  // Accounts
  const accounts: Account[] = [];
  currencies.forEach((currency) => {
    users.forEach((user) => {
      const account = new Account();
      account.id = fakeId(`acc-${user.username}-${currency.id}`);
      account.currency = currency.id;
      account.user_id = user.id;

      // account.balance = ['BTC', 'ETH'].includes(currency.id) ? 10 : 10000;
      account.balance = ['BTC', 'ETH'].includes(currency.id) ? 10 : 300000;
      accounts.push(account);
    });
  });

  return {
    currencies,
    instruments,
    users,
    accounts,
  };
}
