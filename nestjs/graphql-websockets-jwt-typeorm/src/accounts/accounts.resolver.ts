import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Subscription, Args } from '@nestjs/graphql';
import { OnEvent } from '@nestjs/event-emitter';
import { AccountsService } from './accounts.service';
import { Account } from './entities/account.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import { PubSubService } from '../pubsub.service';
import { JwtGuard } from '../auth/jwt.guard';
import { AccountEvent } from './events/account.event';
import { withCancel } from '../common/with-cancel.helper';

@Resolver(() => Account)
export class AccountsResolver {
  constructor(
    private pubSubService: PubSubService,
    private accountsService: AccountsService,
  ) {}

  /**
   * Get accounts list
   * @param user
   */
  @UseGuards(JwtGuard)
  @Query(() => [Account], { description: 'List your accounts' })
  getAccounts(@CurrentUser() user: CurrentUserDto) {
    return this.accountsService.findByUserId(user.id);
  }

  /**
   * Stream account events to subscribers
   */
  @Subscription(() => AccountEvent, {
    description: 'Subscribe to user account events',
    name: AccountEvent.name,
    filter: (payload, variables, context) => {
      console.log({ payload, variables, context });
      return true;
    },
  })
  subscribeAccountEvents(@Args('user_id') user_id: string) {
    return this.pubSubService.asyncIterator(AccountEvent.name);
  }

  /**
   * Forward events from local EventEmitter2 to GraphQL pubSubService
   */
  @OnEvent(AccountEvent.name)
  publishAccountEvent(payload: AccountEvent) {
    this.pubSubService.publish(AccountEvent.name, {
      [AccountEvent.name]: payload,
    });
  }
}
