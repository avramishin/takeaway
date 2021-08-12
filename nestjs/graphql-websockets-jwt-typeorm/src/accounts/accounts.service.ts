import { default as debugFactory } from 'debug';
import { Repository } from 'typeorm';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

import { Account } from './entities/account.entity';
import { AccountEvent, AccountEventTypeEnum } from './events/account.event';
import { UserEvent, UserEventTypeEnum } from '../users/user.event';
import { CurrenciesService } from '../currencies/currencies.service';

@Injectable()
export class AccountsService implements OnModuleInit {
  private debug = debugFactory(AccountsService.name);
  constructor(
    private eventEmiter: EventEmitter2,
    private currenciesService: CurrenciesService,
    @InjectRepository(Account) private accounts: Repository<Account>,
  ) {}

  onModuleInit() {
    setInterval(() => {
      const event = new AccountEvent();
      event.type = AccountEventTypeEnum.AccountCreated;
      event.account = new Account();
      return this.eventEmiter.emitAsync(AccountEvent.name, event);
    }, 2000);
  }

  /**
   * Automatically create accounts on user creation
   */
  @OnEvent(UserEvent.name)
  async createAccountsForUser(payload: UserEvent) {
    if (payload.type == UserEventTypeEnum.UserCreated) {
      const currencies = await this.currenciesService.findAll();
      this.debug(
        `Going to create accounts for ${currencies.length} currencies, user ${payload.user.username}`,
      );
      for (const currency of currencies) {
        const account = new Account();
        account.currency = currency.id;
        account.user_id = payload.user.id;
        account.balance = 0;
        await this.createAccount(account);
      }
    }
  }

  /**
   * Insert account
   */
  async createAccount(account: Account) {
    this.debug(
      `Creating ${account.currency} account for user ${account.user_id}`,
    );

    await this.accounts.insert(account);

    const event = new AccountEvent();
    event.type = AccountEventTypeEnum.AccountCreated;
    event.account = account;

    return this.eventEmiter.emitAsync(AccountEvent.name, event);
  }

  /**
   * Delete account
   */
  async deleteAccount(account: Account) {
    this.debug(
      `Deleting ${account.currency} account for user ${account.user_id}`,
    );

    await this.accounts.delete(account);

    const event = new AccountEvent();
    event.type = AccountEventTypeEnum.AccountDeleted;
    event.account = account;

    return this.eventEmiter.emitAsync(AccountEvent.name, event);
  }

  async findByUserIdCurrency(userId: string, currency: string) {
    return await this.accounts.findOne({
      user_id: userId,
      currency,
    });
  }

  async findByUserId(userId: string) {
    return await this.accounts.find({
      user_id: userId,
    });
  }

  async findById(id: string) {
    return await this.accounts.findOne(id);
  }

  async findByIdOrFail(id: string) {
    return await this.accounts.findOneOrFail(id);
  }
}
