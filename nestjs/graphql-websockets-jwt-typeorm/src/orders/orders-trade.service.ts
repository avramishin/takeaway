import { default as debugFactory } from 'debug';
import { Connection, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

import { AccountTransfer } from '../accounts/entities/account-transfer.entity';
import { AccountsService } from '../accounts/accounts.service';
import { ThruLock } from '../common/lock.decorator';
import { InstrumentsService } from '../instruments/instruments.service';
import { UsersService } from '../users/users.service';
import { OrderTrade } from './entities/order-trade.entity';
import {
  Order,
  OrderSideEnum,
  OrderStatusEnum,
  OrderTimeInForceEnum,
} from './entities/order.entity';
import { OrderEvent, OrderEventTypeEnum } from './order.event';
import {
  AccountEvent,
  AccountEventTypeEnum,
} from '../accounts/events/account.event';

import {
  AccountTransferEvent,
  AccountTrasferEventTypeEnum,
} from '../accounts/events/account-transfer.event';
import { OrdersService } from './orders.service';

@Injectable()
export class OrdersTradeService {
  private debug = debugFactory(OrdersTradeService.name);

  constructor(
    private usersService: UsersService,
    private accountsService: AccountsService,
    private instrumentsService: InstrumentsService,
    private ordersService: OrdersService,
    private eventEmitter: EventEmitter2,
    private connection: Connection,
    @InjectRepository(Order) private openOrdersRepo: Repository<Order>,
  ) {}

  @OnEvent(OrderEvent.name)
  async onOrderOpenedHandler(event: OrderEvent) {
    // trade recently open order
    if (event.type == OrderEventTypeEnum.OrderOpened) {
      await this.trade(event.order.id);
      await this.findAndCloseOrders();
    }
  }

  @ThruLock('master')
  async trade(orderId: string) {
    const order = await this.openOrdersRepo.findOne(orderId);

    if (!order) {
      this.debug(
        `Trade order ${orderId}. No order found! Must be already closed?`,
      );
      return;
    }

    const matchingOrders = await this.findMatchingOrders(order);

    let requiredQty = order.getRemainingQty();

    if (requiredQty <= 0) {
      this.debug(
        `Trade order ${order.getDescription()}. All quantity executed yet.`,
      );
      return;
    }

    const sumMatchingQty = matchingOrders.reduce(
      (sum, o) => sum + o.getRemainingQty(),
      0,
    );

    if (order.time_in_force == 'fok') {
      if (order.getRemainingQty() > sumMatchingQty) {
        // not possible to fill order completely
        // reject fok orders in this case
        this.debug(
          `Trade order ${order.getDescription()} found not enough qty for FOK. Reject!`,
        );
        this.ordersService.closeOrder({
          id: order.id,
          status: OrderStatusEnum.rejected,
          message: 'not enough liquidity for FOK',
        });
        return;
      }
    }

    if (matchingOrders.length == 0) {
      this.debug(`Trade order ${order.getDescription()} no matching orders`);
      return;
    }

    const instrument = await this.instrumentsService.findById(
      order.instrument_id,
    );

    const eventsAfterCommit = [];
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      for (const counterOrder of matchingOrders) {
        if (requiredQty < instrument.quantity_increment) {
          // can't trade anymore, complete order
          this.debug(
            `Trade order ${order.getDescription()}, required quantity less than instrument increment` +
              `${requiredQty} < ${instrument.quantity_increment}`,
          );
          break;
        }

        const counterQty = counterOrder.getRemainingQty();

        const trade = new OrderTrade();
        trade.quantity = counterQty <= requiredQty ? counterQty : requiredQty;
        trade.price = counterOrder.price;
        trade.buy_order_id =
          order.side == OrderSideEnum.buy ? order.id : counterOrder.id;
        trade.sell_order_id =
          order.side == OrderSideEnum.sell ? order.id : counterOrder.id;

        await queryRunner.manager.save(trade);

        order.status = OrderStatusEnum.trading;
        order.executed_quantity += trade.quantity;
        order.executed_quote_quantity += trade.quantity * trade.price;

        counterOrder.status = OrderStatusEnum.trading;
        counterOrder.executed_quantity += trade.quantity;
        counterOrder.executed_quote_quantity += trade.quantity * trade.price;

        this.debug(
          `Going to trade ${trade.quantity} ${instrument.base_currency} at ${trade.price}` +
            ` for ` +
            `BUY ${trade.buy_order_id} vs. SELL ${trade.sell_order_id}`,
        );

        this.debug(
          `Order TRADE quantity ${
            trade.quantity
          } for ${order.getDescription()}`,
        );

        this.debug(
          `Order TRADE quantity ${
            trade.quantity
          } for ${counterOrder.getDescription()}`,
        );

        const sellOrderTradeEvent = new OrderEvent();
        sellOrderTradeEvent.type = OrderEventTypeEnum.OrderTraded;
        sellOrderTradeEvent.order = order;
        eventsAfterCommit.push(sellOrderTradeEvent);

        const buyOrderTradeEvent = new OrderEvent();
        buyOrderTradeEvent.type = OrderEventTypeEnum.OrderTraded;
        buyOrderTradeEvent.order = counterOrder;
        eventsAfterCommit.push(buyOrderTradeEvent);

        const sellerTraderUser = await this.usersService.findById(
          order.side == OrderSideEnum.sell
            ? order.user_id
            : counterOrder.user_id,
        );

        const buyerTraderUser = await this.usersService.findById(
          order.side == OrderSideEnum.buy
            ? order.user_id
            : counterOrder.user_id,
        );

        if (sellerTraderUser.broker_id != buyerTraderUser.broker_id) {
          // moving funds between seller's and buyer's brokers does make sense
          // only if they are different users
          const sellerBrokerQA = await this.accountsService.findById(
            order.side == OrderSideEnum.sell
              ? order.broker_quote_account_id
              : counterOrder.broker_quote_account_id,
          );

          const buyerBrokerQA = await this.accountsService.findById(
            order.side == OrderSideEnum.buy
              ? order.broker_quote_account_id
              : counterOrder.broker_quote_account_id,
          );

          const buyerBrokerBA = await this.accountsService.findById(
            order.side == OrderSideEnum.buy
              ? order.broker_base_account_id
              : counterOrder.broker_base_account_id,
          );

          const sellerBrokerBA = await this.accountsService.findById(
            order.side == OrderSideEnum.sell
              ? order.broker_base_account_id
              : counterOrder.broker_base_account_id,
          );

          // quote accounts transfer
          const bb2sb = new AccountTransfer();
          bb2sb.src_account_id = buyerBrokerQA.id;
          bb2sb.src_account_balance_before = buyerBrokerQA.balance;
          bb2sb.dst_account_id = sellerBrokerQA.id;
          bb2sb.dst_account_balance_before = sellerBrokerQA.balance;
          bb2sb.amount = trade.quantity * trade.price;
          bb2sb.description =
            `trade ${trade.id} ${trade.quantity}@${trade.price} ` +
            'buyer broker quote account > seller broker quote account';

          await queryRunner.manager.save(bb2sb);

          const bb2sbCreatedEvent = new AccountTransferEvent();
          bb2sbCreatedEvent.type =
            AccountTrasferEventTypeEnum.AccountTransferCreated;
          bb2sbCreatedEvent.transfer = bb2sb;

          eventsAfterCommit.push(bb2sbCreatedEvent);

          sellerBrokerQA.balance += bb2sb.amount;
          buyerBrokerQA.balance -= bb2sb.amount;

          // quote account update events
          const sellerBrokerQAUpdateEvent = new AccountEvent();
          sellerBrokerQAUpdateEvent.type = AccountEventTypeEnum.AccountUpdated;
          sellerBrokerQAUpdateEvent.account = sellerBrokerQA;
          eventsAfterCommit.push(sellerBrokerQAUpdateEvent);

          const buyerBrokerQAUpdateEvent = new AccountEvent();
          buyerBrokerQAUpdateEvent.type = AccountEventTypeEnum.AccountUpdated;
          buyerBrokerQAUpdateEvent.account = buyerBrokerQA;
          eventsAfterCommit.push(buyerBrokerQAUpdateEvent);

          await queryRunner.manager.save(sellerBrokerQA);
          await queryRunner.manager.save(buyerBrokerQA);

          // base accounts transfer
          const sb2bb = new AccountTransfer();
          sb2bb.src_account_id = sellerBrokerBA.id;
          sb2bb.src_account_balance_before = sellerBrokerBA.balance;
          sb2bb.dst_account_id = buyerBrokerBA.id;
          sb2bb.dst_account_balance_before = buyerBrokerBA.balance;
          sb2bb.amount = trade.quantity;
          sb2bb.description =
            `trade ${trade.id} ${trade.quantity}@${trade.price} ` +
            `seller broker base account  > buyer broker base account`;

          await queryRunner.manager.save(sb2bb);
          const sb2bbCreatedEvent = new AccountTransferEvent();
          sb2bbCreatedEvent.type =
            AccountTrasferEventTypeEnum.AccountTransferCreated;
          sb2bbCreatedEvent.transfer = sb2bb;
          eventsAfterCommit.push(sb2bbCreatedEvent);

          buyerBrokerBA.balance += sb2bb.amount;
          sellerBrokerBA.balance -= sb2bb.amount;

          // base account update events
          const buyerBrokerBAUpdateEvent = new AccountEvent();
          buyerBrokerBAUpdateEvent.type = AccountEventTypeEnum.AccountUpdated;
          buyerBrokerBAUpdateEvent.account = buyerBrokerBA;
          eventsAfterCommit.push(buyerBrokerBAUpdateEvent);

          const sellerBrokerBAUpdateEvent = new AccountEvent();
          sellerBrokerBAUpdateEvent.type = AccountEventTypeEnum.AccountUpdated;
          sellerBrokerBAUpdateEvent.account = sellerBrokerBA;
          eventsAfterCommit.push(sellerBrokerBAUpdateEvent);

          await queryRunner.manager.save(buyerBrokerBA);
          await queryRunner.manager.save(sellerBrokerBA);
        }

        await queryRunner.manager.save(order);
        await queryRunner.manager.save(counterOrder);

        requiredQty -= counterQty;
      }

      await queryRunner.commitTransaction();
      eventsAfterCommit.forEach((event) =>
        this.eventEmitter.emitAsync(event.constructor.name, event),
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  async findMatchingOrders(order: Order) {
    const query = this.openOrdersRepo
      .createQueryBuilder('order')
      .andWhere('order.side = :side', {
        side:
          order.side == OrderSideEnum.sell
            ? OrderSideEnum.buy
            : OrderSideEnum.sell,
      })
      .andWhere('order.instrument_id = :instrument_id', {
        instrument_id: order.instrument_id,
      })
      .andWhere('order.user_id != :user_id', {
        user_id: order.user_id,
      })
      .andWhere('order.executed_quantity < order.quantity');

    if (order.side == OrderSideEnum.sell) {
      query.andWhere('order.price >= :price', { price: order.price });
    } else {
      query.andWhere('order.price <= :price', { price: order.price });
    }

    query.orderBy(
      'order.price',
      order.side == OrderSideEnum.buy ? 'ASC' : 'DESC',
    );

    const counterOrders = await query.getMany();

    // Lets find orders to cover required quantity
    let requiredQty = order.quantity - order.executed_quantity;
    const matchingOrders: Order[] = [];
    for (const counterOrder of counterOrders) {
      if (requiredQty > 0) {
        matchingOrders.push(counterOrder);
        requiredQty -= counterOrder.getRemainingQty();
      } else {
        break;
      }
    }

    return matchingOrders;
  }

  /**
   * Find and close orders with IOC or when fully executed
   */
  async findAndCloseOrders() {
    const orders = await this.openOrdersRepo
      .createQueryBuilder('order')
      .where('order.time_in_force = :time_in_force', {
        time_in_force: OrderTimeInForceEnum.ioc,
      })
      .orWhere('order.executed_quantity >= order.quantity')
      .getMany();

    for (const order of orders) {
      if (order.executed_quantity < order.quantity) {
        order.status = OrderStatusEnum.cancelled;
        order.message = 'partially filled ioc';
      } else {
        order.status = OrderStatusEnum.completed;
        order.message = 'completely filled';
      }
      await this.ordersService.closeOrder({
        id: order.id,
        status: order.status,
        message: order.message,
      });
    }
  }
}
