import { Account } from '../entities/account.entity';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';

export enum AccountEventTypeEnum {
  'AccountCreated' = 'AccountCreated',
  'AccountDeleted' = 'AccountDeleted',
  'AccountUpdated' = 'AccountUpdated',
}

registerEnumType(AccountEventTypeEnum, {
  name: 'AccountEventEnum',
});

@ObjectType()
export class AccountEvent {
  @Field(() => AccountEventTypeEnum)
  type: AccountEventTypeEnum;

  @Field(() => Account)
  account: Account;
}
