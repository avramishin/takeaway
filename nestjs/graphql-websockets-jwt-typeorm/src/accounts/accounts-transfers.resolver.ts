import { Parent, ResolveField, Resolver, Subscription } from '@nestjs/graphql';
import { OnEvent } from '@nestjs/event-emitter';
import { AccountsService } from './accounts.service';
import { PubSubService } from '../pubsub.service';
import { AccountTransfer } from './entities/account-transfer.entity';
import { AccountTransferEvent } from './events/account-transfer.event';
import { Account } from './entities/account.entity';

@Resolver(() => AccountTransfer)
export class AccountsTransfersResolver {
  constructor(
    private pubSubService: PubSubService,
    private accountsService: AccountsService,
  ) {}

  /**
   * Stream account events to subscribers
   */
  @Subscription(() => AccountTransferEvent, {
    description: 'Subscribe to account transfers events',
    name: AccountTransferEvent.name,
  })
  subscribeAccountTransferEvents() {
    return this.pubSubService.asyncIterator(AccountTransferEvent.name);
  }

  /**
   * Forward events from local EventEmitter2 to GraphQL pubSubService
   */
  @OnEvent(AccountTransferEvent.name)
  publishAccountTransferEvent(payload: AccountTransferEvent) {
    this.pubSubService.publish(AccountTransferEvent.name, {
      [AccountTransferEvent.name]: payload,
    });
  }

  @ResolveField(() => Account, { name: 'src_account' })
  srcAccount(@Parent() transfer: AccountTransfer) {
    return this.accountsService.findById(transfer.src_account_id);
  }

  @ResolveField(() => Account, { name: 'dst_account' })
  dstAccount(@Parent() transfer: AccountTransfer) {
    return this.accountsService.findById(transfer.dst_account_id);
  }
}
