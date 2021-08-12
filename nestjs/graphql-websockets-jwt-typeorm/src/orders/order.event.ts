import { Order } from './entities/order.entity';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';

export enum OrderEventTypeEnum {
  'OrderOpened' = 'OrderOpened',
  'OrderClosed' = 'OrderClosed',
  'OrderTraded' = 'OrderTraded',
}

registerEnumType(OrderEventTypeEnum, {
  name: 'OrderEventTypeEnum',
});

@ObjectType()
export class OrderEvent {
  @Field(() => OrderEventTypeEnum)
  type: OrderEventTypeEnum;

  @Field(() => Order)
  order: Order;
}
