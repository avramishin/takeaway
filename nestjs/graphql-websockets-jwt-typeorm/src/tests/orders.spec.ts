import { Repository } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../app.module';
import { ValidationPipe } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';

import { User } from '../users/entities/user.entity';
import { Currency } from '../currencies/currency.entity';
import { Instrument } from '../instruments/entities/instrument.entity';
import { Account } from '../accounts/entities/account.entity';
import {
  Order,
  OrderSideEnum,
  OrderStatusEnum,
  OrderTimeInForceEnum,
  OrderTypeEnum,
} from '../orders/entities/order.entity';

import { getSnapshot } from '../fixtures/db.snapshot';
import { OrdersService } from '../orders/orders.service';
import { AccountTransfer } from '../accounts/entities/account-transfer.entity';
import { OrderTrade } from '../orders/entities/order-trade.entity';
import { ClosedOrder } from '../orders/entities/closed-order.entity';
import { waitFor } from '../common/wait-for.helper';

import { EventEmitter2 } from '@nestjs/event-emitter';

describe('Create 2 orders', () => {
  let app: INestApplication;

  let users: Repository<User>;
  let currencies: Repository<Currency>;
  let instruments: Repository<Instrument>;
  let accounts: Repository<Account>;
  let accountTransfers: Repository<AccountTransfer>;
  let orderTrades: Repository<OrderTrade>;
  let closedOrders: Repository<ClosedOrder>;
  let orders: Repository<Order>;

  let ordersService: OrdersService;

  const snapshot = getSnapshot();

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.enableCors();
    app.useWebSocketAdapter(new WsAdapter(app));
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
      }),
    );

    users = module.get('UserRepository');
    currencies = module.get('CurrencyRepository');
    instruments = module.get('InstrumentRepository');
    accounts = module.get('AccountRepository');
    accountTransfers = module.get('AccountTransferRepository');
    orderTrades = module.get('OrderTradeRepository');
    orders = module.get('OrderRepository');
    closedOrders = module.get('ClosedOrderRepository');

    const repositories = [
      { table: 'users', repo: users },
      { table: 'currencies', repo: currencies },
      { table: 'instruments', repo: instruments },
      { table: 'accounts', repo: accounts },
      { table: 'accounts_transfers', repo: accountTransfers },
      { table: 'orders_trades', repo: orderTrades },
      { table: 'closed_orders', repo: closedOrders },
      { table: 'orders', repo: orders },
    ];

    for (const item of repositories) {
      await item.repo.clear();
      if (snapshot[item.table]) {
        for (const record of snapshot[item.table]) {
          // console.log(record);
          await item.repo.insert(record);
        }
      }
    }

    await app.init();

    ordersService = module.get(OrdersService);
    const eventEmmiter = module.get(EventEmitter2);
    eventEmmiter.onAny((event, payload) => console.log(event, payload));
  });

  afterAll(async () => {
    await app.close();
  });

  it('Lets go', async () => {
    const instrument = await instruments.findOneOrFail({ id: 'BTCUSD' });
    const seller = await users.findOneOrFail({ username: 'trader_1' });
    const buyer = await users.findOneOrFail({ username: 'trader_3' });

    const buyOrder = await ordersService.openOrder(buyer.id, {
      instrument_id: instrument.id,
      type: OrderTypeEnum.limit,
      side: OrderSideEnum.buy,
      time_in_force: OrderTimeInForceEnum.gtc,
      price: 30000,
      quantity: 0.01,
    });

    expect(ordersService.openOrdersLocal.length).toEqual(1);
    await waitFor(100);

    const sellOrder = await ordersService.openOrder(seller.id, {
      instrument_id: instrument.id,
      type: OrderTypeEnum.limit,
      side: OrderSideEnum.sell,
      time_in_force: OrderTimeInForceEnum.gtc,
      price: 29000,
      quantity: 0.05,
    });

    expect(ordersService.openOrdersLocal.length).toEqual(2);
    await waitFor(100);

    await ordersService.closeOrder({
      id: sellOrder.id,
      status: OrderStatusEnum.cancelled,
      message: 'manually cancelled',
    });

    expect(ordersService.openOrdersLocal.length).toEqual(0);

    const buyerTraderBaseAccount = await accounts.findOne({
      currency: instrument.base_currency,
      user_id: buyer.id,
    });

    expect(buyerTraderBaseAccount.balance).toEqual(10.01);

    await waitFor(1000);
  });
});
