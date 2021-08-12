import _ from 'lodash';
import debugFactory from 'debug';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users/users.service';
import { InstrumentsService } from '../instruments/instruments.service';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';
import { AccountsService } from '../accounts/accounts.service';

import { EventEmitter2 } from '@nestjs/event-emitter';

import { getSnapshot } from '../fixtures/db.snapshot';
import { CurrenciesService } from '../currencies/currencies.service';
import { DatabaseService } from '../database/database.service';
import { databaseServiceMock } from '../database/mocks/database.service.mock';

const debug = debugFactory('OrdersServiceStressTest');

describe('OrdersService', () => {
  let ordersService: OrdersService;

  const instrumentsService = new InstrumentsService(databaseServiceMock);
  const usersService = new UsersService(databaseServiceMock);
  const accountsService = new AccountsService(databaseServiceMock);
  const currenciesService = new CurrenciesService(databaseServiceMock);

  const eventEmitter = new EventEmitter2({
    wildcard: true,
  });

  let snapshot = getSnapshot();
  const firedEvents = [];

  eventEmitter.onAny((event) => firedEvents.push(event));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: InstrumentsService,
          useValue: instrumentsService,
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: AccountsService,
          useValue: accountsService,
        },
        {
          provide: CurrenciesService,
          useValue: currenciesService,
        },
        {
          provide: DatabaseService,
          useValue: databaseServiceMock,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
      ],
    }).compile();
    await module.init();

    snapshot = getSnapshot();

    instrumentsService.repository = [];
    usersService.repository = [];
    accountsService.repository = [];
    currenciesService.repository = [];

    instrumentsService.repository.push(...snapshot.instruments);
    usersService.repository.push(...snapshot.users);
    accountsService.repository.push(...snapshot.accounts);
    currenciesService.repository.push(...snapshot.currencies);

    ordersService = module.get<OrdersService>(OrdersService);
  });

  it('post 1k trades', async () => {
    const startTime = new Date().valueOf();
    const instrument = instrumentsService.repository.find(
      (i) => i.id == 'BTCUSD',
    );

    const priceLevel = 30000;

    let attempts = 1000;
    const skips = [];
    const traders = usersService.repository.filter((u) => u.broker_id);

    do {
      const trader = traders[_.random(0, traders.length - 1)];
      const side = ['sell', 'buy'][_.random(0, 1)] as 'sell' | 'buy';
      const account = accountsService.repository.find((a) => {
        return (
          a.user_id == trader.id &&
          a.currency ==
            (side == 'sell'
              ? instrument.base_currency
              : instrument.quote_currency)
        );
      });

      const currency = currenciesService.findById(account.currency);

      const dir = [1, -1][_.random(0, 1)];
      const deviation = priceLevel * _.random(0, 0.01, true);
      const price = Number(Number(priceLevel + deviation * dir).toFixed(2));

      // lets trade 20% from our actual balance
      let quantity = 0;
      if (side == 'buy') {
        quantity = (account.balance * 0.05) / price;
      } else {
        quantity = account.balance * 0.05;
      }

      quantity = currency.precise(quantity);

      if (quantity < instrument.quantity_increment) {
        // can't trade this quantity, lets cancel our worse order
        skips.push(quantity);
        const orderToCancel = ordersService.repository
          .sort((a: Order, b: Order) => {
            return side == 'buy' ? a.price - b.price : b.price - a.price;
          })
          .find((o) => o.user_id == trader.id && o.side == side);
        if (orderToCancel) {
          ordersService.closeOrder(
            {id: orderToCancel, status: 'cancelled', message: 'manual cancellation'},
          );
        }

        continue;
      }

      const order = new Order();
      order.user_id = trader.id;
      order.instrument_id = instrument.id;
      // 30% chance of market order
      order.type = _.random(0, 100) < 30 ? 'market' : 'limit';
      order.side = side;
      order.time_in_force = 'gtc';
      if (order.type == 'limit') {
        order.price = price;
      }
      order.quantity = quantity;
      // console.log(order);

      await ordersService.openOrder(order);
    } while (--attempts);

    debug({
      skips: skips.length,
      activeOrders: ordersService.repository.length,
      activeSells: ordersService.repository.filter((o) => o.side == 'sell')
        .length,
      activeBuys: ordersService.repository.filter((o) => o.side == 'buy')
        .length,

      created: firedEvents.filter((item) => item == 'order.created').length,
      completed: firedEvents.filter((item) => item == 'order.completed').length,
      cancelled: firedEvents.filter((item) => item == 'order.cancelled').length,
      trades: firedEvents.filter((item) => item == 'order.trade').length,
      accountTransfers: firedEvents.filter((item) => item == 'account.transfer')
        .length,
      timeTaken: new Date().valueOf() - startTime,
    });
  });
});
