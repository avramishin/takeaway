import { User } from './entities/user.entity';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';

export enum UserEventTypeEnum {
  'UserCreated' = 'UserCreated',
  'UserDeleted' = 'UserDeleted',
  'UserUpdated' = 'UserUpdated',
  'UserLogged' = 'UserLogged',
}

registerEnumType(UserEventTypeEnum, {
  name: 'UserEventTypeEnum',
});

@ObjectType()
export class UserEvent {
  @Field(() => UserEventTypeEnum)
  type: UserEventTypeEnum;

  @Field(() => User)
  user: User;
}
