import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { AccountTransfer } from '../entities/account-transfer.entity';

export enum AccountTrasferEventTypeEnum {
  'AccountTransferCreated' = 'AccountTransferCreated',
}

registerEnumType(AccountTrasferEventTypeEnum, {
  name: 'AccountTrasferEventTypeEnum',
});

@ObjectType()
export class AccountTransferEvent {
  @Field(() => AccountTrasferEventTypeEnum)
  type: AccountTrasferEventTypeEnum;

  @Field(() => AccountTransfer)
  transfer: AccountTransfer;
}
