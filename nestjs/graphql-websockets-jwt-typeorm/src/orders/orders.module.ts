import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { UsersModule } from '../users/users.module';
import { AccountsModule } from '../accounts/accounts.module';
import { InstrumentsModule } from '../instruments/instruments.module';
import { CurrenciesModule } from '../currencies/currencies.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Instrument } from '../instruments/entities/instrument.entity';
import { Currency } from '../currencies/currency.entity';
import { AccountTransfer } from '../accounts/entities/account-transfer.entity';
import { Account } from '../accounts/entities/account.entity';
import { OrderTrade } from './entities/order-trade.entity';
import { ClosedOrder } from './entities/closed-order.entity';
import { OrdersTradeService } from './orders-trade.service';
import { OrdersResolver } from './orders.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderTrade,
      ClosedOrder,
      User,
      Instrument,
      Currency,
      AccountTransfer,
      Account,
    ]),
    UsersModule,
    AccountsModule,
    InstrumentsModule,
    CurrenciesModule,
  ],
  providers: [OrdersService, OrdersTradeService, OrdersResolver],
  exports: [OrdersService],
})
export class OrdersModule {}
