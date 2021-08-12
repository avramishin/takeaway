import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ClosedOrder } from '../entities/closed-order.entity';

@ObjectType()
export class ClosedOrdersPaged {
  @Field(() => [ClosedOrder])
  items: ClosedOrder[];

  @Field(() => Int)
  total: number;
}
