import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AccountsModule } from './accounts/accounts.module';
import { OrdersModule } from './orders/orders.module';
import { InstrumentsModule } from './instruments/instruments.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { TickersModule } from './tickers/tickers.module';
import { OrderbooksModule } from './orderbooks/orderbooks.module';

import { GraphQLModule } from '@nestjs/graphql';

import { typeOrmConnection } from './typeorm';

@Module({
  imports: [
    GraphQLModule.forRoot({
      playground: true,
      autoSchemaFile: true,
      debug: true,
      installSubscriptionHandlers: true,
      subscriptions: {
        onConnect: async (connParams) => {
          console.log(connParams);
          return {
            currentUser: (connParams as any).authorization,
          };
        },
      },
      context: ({ req, connection }) =>
        connection ? { req: connection.context } : { req },
    }),
    typeOrmConnection,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    AccountsModule,
    OrdersModule,
    InstrumentsModule,
    CurrenciesModule,
    OrderbooksModule,
    TickersModule,
  ],
})
export class AppModule {}
