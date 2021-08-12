import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { Orderbook } from './orderbook';

export enum OrderbookEventTypeEnum {
  'OrderbookUpdated' = 'OrderbookUpdated',
}

registerEnumType(OrderbookEventTypeEnum, {
  name: 'OrderbookEventTypeEnum',
});

@ObjectType()
export class OrderbookEvent {
  @Field(() => OrderbookEventTypeEnum)
  type: OrderbookEventTypeEnum;

  @Field(() => Orderbook)
  orderbook: Orderbook;
}
