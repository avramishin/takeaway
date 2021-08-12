import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { Account } from './entities/account.entity';
import { AccountTransfer } from './entities/account-transfer.entity';
import { Currency } from '../currencies/currency.entity';
import { CurrenciesModule } from '../currencies/currencies.module';
import { PubSubService } from '../pubsub.service';
import { AccountsResolver } from './accounts.resolver';
import { AccountsTransfersResolver } from './accounts-transfers.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, AccountTransfer, Currency]),
    CurrenciesModule,
  ],
  providers: [
    AccountsService,
    PubSubService,
    AccountsResolver,
    AccountsTransfersResolver,
  ],
  exports: [AccountsService],
})
export class AccountsModule {}
