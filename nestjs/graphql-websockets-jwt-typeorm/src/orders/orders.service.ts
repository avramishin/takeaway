import { default as debugFactory } from 'debug';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';

import { InstrumentsService } from '../instruments/instruments.service';
import { AccountsService } from '../accounts/accounts.service';
import { UsersService } from '../users/users.service';

import {
  Order,
  OrderSideEnum,
  OrderStatusEnum,
  OrderTimeInForceEnum,
  OrderTypeEnum,
} from './entities/order.entity';
import { Account } from '../accounts/entities/account.entity';
import { AccountTransfer } from '../accounts/entities/account-transfer.entity';
import { ClosedOrder } from './entities/closed-order.entity';
import { OrderException } from './order.exception';
import { ThruLock } from '../common/lock.decorator';
import { OpenOrderArgs } from './dto/open-order.args';
import { OrderEvent, OrderEventTypeEnum } from './order.event';
import {
  AccountTransferEvent,
  AccountTrasferEventTypeEnum,
} from '../accounts/events/account-transfer.event';
import {
  AccountEvent,
  AccountEventTypeEnum,
} from '../accounts/events/account.event';
import { CloseOrderDto } from './dto/close-order.dto';
import { RequestPagerArgs } from 'src/common/dto/request-pager.dto';

@Injectable()
export class OrdersService implements OnModuleInit {
  private debug = debugFactory(OrdersService.name);
  public openOrdersLocal: Order[] = [];
  constructor(
    private usersService: UsersService,
    private accountsService: AccountsService,
    private instrumentsService: InstrumentsService,
    private eventEmitter: EventEmitter2,
    private connection: Connection,
    @InjectRepository(Order) private openOrdersRepo: Repository<Order>,
    @InjectRepository(ClosedOrder)
    private closedOrdersRepo: Repository<ClosedOrder>,
  ) {}

  async onModuleInit() {
    // local orders from db to local collection
    this.openOrdersLocal = await this.openOrdersRepo.find();
    this.debug(`${this.openOrdersLocal.length} open orders loaded`);
  }

  @OnEvent(OrderEvent.name)
  onOrderTradeEventHandler(event: OrderEvent) {
    if (event.type == OrderEventTypeEnum.OrderTraded) {
      // update local order on trade event
      const localOrder = this.openOrdersLocal.find(
        (o: Order) => (o.id = event.order.id),
      );
      if (localOrder) {
        Object.assign(localOrder, event.order);
      }
    }
  }

  /**
   * Create new order
   * @param order
   */
  @ThruLock('master')
  async openOrder(userId: string, openOrderDto: OpenOrderArgs) {
    const order = new Order();
    order.user_id = userId;
    order.instrument_id = openOrderDto.instrument_id;
    order.quantity = openOrderDto.quantity;
    order.type = openOrderDto.type;
    order.time_in_force = openOrderDto.time_in_force;
    order.side = openOrderDto.side;
    order.price = openOrderDto.price;

    const clientUser = await this.usersService.findByIdOrFail(order.user_id);
    const brokerUser = await this.usersService.findByIdOrFail(
      clientUser.broker_id,
    );
    const instrument = await this.instrumentsService.findByIdOrFail(
      order.instrument_id,
    );

    if (!instrument.isValidQuantity(order.quantity)) {
      throw new OrderException('INVALID_QUANTITY', {
        quantity: order.quantity,
        quantity_increment: instrument.quantity_increment,
      });
    }

    // Find participating client's accounts
    const clientBaseAccount = await this.accountsService.findByUserIdCurrency(
      clientUser.id,
      instrument.base_currency,
    );

    if (!clientBaseAccount) {
      throw new OrderException('TRADER_BASE_ACCOUNT_NOT_FOUND', {
        user_id: order.user_id,
        currency: instrument.base_currency,
      });
    } else {
      order.client_base_account_id = clientBaseAccount.id;
    }

    const clientQuoteAccount = await this.accountsService.findByUserIdCurrency(
      clientUser.id,
      instrument.quote_currency,
    );

    if (!clientQuoteAccount) {
      throw new OrderException('TRADER_QUOTE_ACCOUNT_NOT_FOUND', {
        user_id: order.user_id,
        currency: instrument.quote_currency,
      });
    } else {
      order.client_quote_account_id = clientQuoteAccount.id;
    }

    // Find participating broker's accounts
    const brokerBaseAccount = await this.accountsService.findByUserIdCurrency(
      brokerUser.id,
      instrument.base_currency,
    );

    if (!brokerBaseAccount) {
      throw new OrderException('BROKER_BASE_ACCOUNT_NOT_FOUND', {
        user_id: brokerUser.id,
        currency: instrument.base_currency,
      });
    } else {
      order.broker_base_account_id = brokerBaseAccount.id;
    }

    const brokerQuoteAccount = await this.accountsService.findByUserIdCurrency(
      brokerUser.id,
      instrument.quote_currency,
    );

    if (!brokerQuoteAccount) {
      throw new OrderException('BROKER_QUOTE_ACCOUNT_NOT_FOUND', {
        user_id: brokerUser.id,
        currency: instrument.quote_currency,
      });
    } else {
      order.broker_quote_account_id = brokerQuoteAccount.id;
    }

    // market order conditions
    if (order.type == OrderTypeEnum.market) {
      const allowTIFTypes = [
        OrderTimeInForceEnum.fok,
        OrderTimeInForceEnum.ioc,
      ];
      if (!allowTIFTypes.includes(order.time_in_force)) {
        throw new OrderException('MARKET_ORDER_FOK_AND_IOC_ONLY', {
          order,
        });
      }
      const vwap = this.getVWAP({
        instrument_id: order.instrument_id,
        side: order.side,
        volume: order.quantity,
        excludeUsers: [order.user_id],
      });
      order.price = vwap.price;
    }

    order.status = OrderStatusEnum.new;

    const eventsAfterCommit = [];

    const orderOpenedEvent = new OrderEvent();
    orderOpenedEvent.type = OrderEventTypeEnum.OrderOpened;
    orderOpenedEvent.order = order;
    eventsAfterCommit.push(orderOpenedEvent);

    // HOLD funds necessary for this order by moving them from trader to broker accounts
    // see also RELEASE
    let holdSrcAccount: Account;
    let holdDstAccount: Account;
    let holdAmount: number;
    switch (order.side) {
      case OrderSideEnum.sell:
        holdSrcAccount = clientBaseAccount;
        holdDstAccount = brokerBaseAccount;
        holdAmount = order.quantity;
        break;

      case OrderSideEnum.buy:
        holdSrcAccount = clientQuoteAccount;
        holdDstAccount = brokerQuoteAccount;
        holdAmount = order.quantity * order.price;
        break;
    }

    const holdTransfer = new AccountTransfer();
    holdTransfer.src_account_id = holdSrcAccount.id;
    holdTransfer.src_account_balance_before = holdSrcAccount.balance;
    holdTransfer.dst_account_id = holdDstAccount.id;
    holdTransfer.dst_account_balance_before = holdDstAccount.balance;
    holdTransfer.amount = holdAmount;
    holdTransfer.description = `hold for order ${order.id}`;

    if (holdSrcAccount.balance < holdAmount) {
      throw new OrderException('NOT_ENOUGH_BALANCE', {
        account_id: holdSrcAccount.id,
        user_id: holdSrcAccount.user_id,
        available_balance: holdSrcAccount.balance,
        required_balance: holdAmount,
      });
    }

    holdSrcAccount.balance -= holdAmount;
    holdDstAccount.balance += holdAmount;

    order.hold_transfer_id = holdTransfer.id;

    const holdSrcAccountUpdatedEvent = new AccountEvent();
    holdSrcAccountUpdatedEvent.type = AccountEventTypeEnum.AccountUpdated;
    holdSrcAccountUpdatedEvent.account = holdSrcAccount;
    eventsAfterCommit.push(holdSrcAccountUpdatedEvent);

    const holdDstAccountUpdatedEvent = new AccountEvent();
    holdDstAccountUpdatedEvent.type = AccountEventTypeEnum.AccountUpdated;
    holdDstAccountUpdatedEvent.account = holdDstAccount;
    eventsAfterCommit.push(holdDstAccountUpdatedEvent);

    const holdTransferCreatedEvent = new AccountTransferEvent();
    holdTransferCreatedEvent.type =
      AccountTrasferEventTypeEnum.AccountTransferCreated;
    holdTransferCreatedEvent.transfer = holdTransfer;

    eventsAfterCommit.push(holdTransferCreatedEvent);

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      await queryRunner.manager.save(order);
      await queryRunner.manager.save(holdSrcAccount);
      await queryRunner.manager.save(holdDstAccount);
      await queryRunner.manager.save(holdTransfer);
      await queryRunner.commitTransaction();

      // push new order to local collection
      this.openOrdersLocal.push(order);

      // fire enqued events
      eventsAfterCommit.forEach((event) =>
        this.eventEmitter.emitAsync(event.constructor.name, event),
      );

      this.debug(`Order OPENED ${order.getDescription()}`);
      this.debug(`Number of open orders: ${this.openOrdersLocal.length}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }

    return order;
  }

  @ThruLock('master')
  async closeOrder({ id, status, message }: CloseOrderDto) {
    const order = await this.openOrdersRepo.findOne(id);

    if (!order) {
      this.debug(
        `It was going to close order, but no order ${id} found to close with ${status} / ${message}`,
      );
      throw new OrderException('ORDER_NOT_FOUND');
    }

    // RELEASE funds previousy held by hold operation moving them from broker to trader accounts
    let releaseSrcAccount: Account;
    let releaseDstAccount: Account;
    let releaseAmount: number;

    // PAYOUT funds for this order by moving them from broker to trader accounts
    let payoutSrcAccount: Account;
    let payoutDstAccount: Account;
    let payoutAmount: number;

    const afterCommitEvents = [];

    switch (order.side) {
      case 'sell':
        releaseSrcAccount = await this.accountsService.findByIdOrFail(
          order.broker_base_account_id,
        );
        releaseDstAccount = await this.accountsService.findByIdOrFail(
          order.client_base_account_id,
        );
        releaseAmount = order.quantity - order.executed_quantity;

        payoutSrcAccount = await this.accountsService.findByIdOrFail(
          order.broker_quote_account_id,
        );
        payoutDstAccount = await this.accountsService.findByIdOrFail(
          order.client_quote_account_id,
        );
        payoutAmount = order.executed_quote_quantity;
        break;

      case 'buy':
        releaseSrcAccount = await this.accountsService.findByIdOrFail(
          order.broker_quote_account_id,
        );
        releaseDstAccount = await this.accountsService.findByIdOrFail(
          order.client_quote_account_id,
        );
        releaseAmount =
          order.quantity * order.price - order.executed_quote_quantity;

        payoutSrcAccount = await this.accountsService.findByIdOrFail(
          order.broker_base_account_id,
        );

        payoutDstAccount = await this.accountsService.findByIdOrFail(
          order.client_base_account_id,
        );
        payoutAmount = order.executed_quantity;
        break;
    }

    const releaseTransfer = new AccountTransfer();
    releaseTransfer.src_account_id = releaseSrcAccount.id;
    releaseTransfer.src_account_balance_before = releaseSrcAccount.balance;
    releaseTransfer.dst_account_id = releaseDstAccount.id;
    releaseTransfer.dst_account_balance_before = releaseDstAccount.balance;
    releaseTransfer.amount = releaseAmount;
    releaseTransfer.description = `release for order ${order.id}`;

    order.release_transfer_id = releaseTransfer.id;

    const releaseTransferCreatedEvent = new AccountTransferEvent();
    releaseTransferCreatedEvent.type =
      AccountTrasferEventTypeEnum.AccountTransferCreated;
    releaseTransferCreatedEvent.transfer = releaseTransfer;

    afterCommitEvents.push(releaseTransferCreatedEvent);

    order.status = status;
    order.message = message;

    if (releaseSrcAccount.balance < releaseTransfer.amount) {
      throw new OrderException('NOT_ENOUGH_BALANCE', {
        account_id: releaseSrcAccount.id,
        user_id: releaseSrcAccount.user_id,
        available_balance: releaseSrcAccount.balance,
        required_balance: releaseTransfer.amount,
      });
    }

    releaseSrcAccount.balance -= releaseTransfer.amount;
    releaseDstAccount.balance += releaseTransfer.amount;

    const releaseSrcAccountUpdatedEvent = new AccountEvent();
    releaseSrcAccountUpdatedEvent.type = AccountEventTypeEnum.AccountUpdated;
    releaseSrcAccountUpdatedEvent.account = releaseSrcAccount;
    afterCommitEvents.push(releaseSrcAccountUpdatedEvent);

    const releaseDstAccountUpdatedEvent = new AccountEvent();
    releaseDstAccountUpdatedEvent.type = AccountEventTypeEnum.AccountUpdated;
    releaseDstAccountUpdatedEvent.account = releaseDstAccount;
    afterCommitEvents.push(releaseDstAccountUpdatedEvent);

    const payoutTransfer = new AccountTransfer();
    payoutTransfer.src_account_id = payoutSrcAccount.id;
    payoutTransfer.src_account_balance_before = payoutSrcAccount.balance;
    payoutTransfer.dst_account_id = payoutDstAccount.id;
    payoutTransfer.dst_account_balance_before = payoutDstAccount.balance;
    payoutTransfer.amount = payoutAmount;
    payoutTransfer.description = `payout for order ${order.id}`;

    order.payout_transfer_id = payoutTransfer.id;

    const payoutTransferCreatedEvent = new AccountTransferEvent();
    payoutTransferCreatedEvent.type =
      AccountTrasferEventTypeEnum.AccountTransferCreated;
    payoutTransferCreatedEvent.transfer = payoutTransfer;

    afterCommitEvents.push(payoutTransferCreatedEvent);

    if (payoutSrcAccount.balance < payoutTransfer.amount) {
      throw new OrderException('NOT_ENOUGH_BALANCE', {
        account_id: payoutSrcAccount.id,
        user_id: payoutSrcAccount.user_id,
        available_balance: payoutSrcAccount.balance,
        required_balance: payoutTransfer.amount,
      });
    }

    payoutSrcAccount.balance -= payoutTransfer.amount;
    payoutDstAccount.balance += payoutTransfer.amount;

    const payoutSrcAccountUpdatedEvent = new AccountEvent();
    payoutSrcAccountUpdatedEvent.type = AccountEventTypeEnum.AccountUpdated;
    payoutSrcAccountUpdatedEvent.account = payoutSrcAccount;
    afterCommitEvents.push(payoutSrcAccountUpdatedEvent);

    const payoutDstAccountUpdatedEvent = new AccountEvent();
    payoutDstAccountUpdatedEvent.type = AccountEventTypeEnum.AccountUpdated;
    payoutDstAccountUpdatedEvent.account = payoutDstAccount;
    afterCommitEvents.push(payoutDstAccountUpdatedEvent);

    const orderClosedEvent = new OrderEvent();
    orderClosedEvent.type = OrderEventTypeEnum.OrderClosed;
    orderClosedEvent.order = order;

    afterCommitEvents.push(orderClosedEvent);

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');
    try {
      const closedOrder = Object.assign(new ClosedOrder(), { ...order });

      await queryRunner.manager.save(closedOrder);
      await queryRunner.manager.remove(order);

      await queryRunner.manager.save(releaseTransfer);
      await queryRunner.manager.save(releaseSrcAccount);
      await queryRunner.manager.save(releaseDstAccount);

      await queryRunner.manager.save(payoutTransfer);
      await queryRunner.manager.save(payoutSrcAccount);
      await queryRunner.manager.save(payoutDstAccount);

      await queryRunner.commitTransaction();

      // remove order from local collection
      const loIdx = this.openOrdersLocal.findIndex(
        (o) => o.id == closedOrder.id,
      );
      if (loIdx > -1) {
        this.openOrdersLocal.splice(loIdx, 1);
      } else {
        throw new OrderException(`NO_ORDER_IN_LOCAL_REPO`, {
          id: closedOrder.id,
        });
      }

      // fire enqueued events
      afterCommitEvents.forEach((event) =>
        this.eventEmitter.emitAsync(event.constructor.name, event),
      );

      this.debug(`Order CLOSED ${order.getDescription()}`);
      this.debug(`Number of open orders: ${this.openOrdersLocal.length}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * volume weighted average price
   * @param side
   * @param volume
   */
  getVWAP({
    instrument_id,
    side,
    volume,
    excludeUsers = [],
  }: {
    instrument_id: string;
    side: OrderSideEnum;
    volume: number;
    excludeUsers?: string[];
  }) {
    if (volume <= 0) {
      throw new OrderException('POSITIVE_VOLUME_EXPECTED', {
        instrument_id,
        side,
        volume,
      });
    }

    const orders = this.openOrdersLocal
      .filter(
        (order) =>
          order.instrument_id == instrument_id &&
          order.side ==
            (side == OrderSideEnum.sell
              ? OrderSideEnum.buy
              : OrderSideEnum.sell) &&
          !excludeUsers.includes(order.user_id),
      )
      .sort((a: Order, b: Order) => {
        return side == OrderSideEnum.buy
          ? a.price - b.price
          : b.price - a.price;
      });

    let sumVolume = 0;
    const selectedOrders: Order[] = [];

    for (let i = 0; i < orders.length; i++) {
      const order = { ...orders[i] };
      if (sumVolume >= volume) {
        break;
      }

      if (order.quantity + sumVolume <= volume) {
        sumVolume += order.quantity;
        selectedOrders.push(order as Order);
      } else {
        order.quantity = volume - sumVolume;
        sumVolume += order.quantity;
        selectedOrders.push(order as Order);
      }
    }

    if (sumVolume == 0) {
      return { price: 0, volume: 0 };
    }

    const vSum = selectedOrders.reduce((sum: number, row: Order) => {
      return sum + row.price * row.quantity;
    }, 0);

    return {
      price: vSum / sumVolume,
      volume: sumVolume,
    };
  }

  findByIdOrFail(id: string) {
    return this.openOrdersRepo.findOneOrFail(id);
  }

  findByUserId(userId: string) {
    return this.openOrdersRepo.find({
      user_id: userId,
    });
  }

  async findClosedOrders(userId: string, pager: RequestPagerArgs) {
    const query = this.closedOrdersRepo
      .createQueryBuilder()
      .where('user_id = :user_id', {
        user_id: userId,
      });

    query.skip(pager.offset).take(pager.limit).orderBy('created_at', 'DESC');
    return await query.getManyAndCount();
  }
}
