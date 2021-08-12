import { Entity, Column, Index } from 'typeorm';
import { Order } from './order.entity';
import { ObjectType, Field } from '@nestjs/graphql';

@Entity('closed_orders')
@ObjectType()
export class ClosedOrder extends Order {
  @Column({ length: 36, nullable: false })
  @Index()
  @Field()
  user_id: string;

  @Column({ type: 'datetime', nullable: false })
  @Index()
  @Field(() => Date)
  updated_at = new Date();

  @Column({ type: 'datetime', nullable: false })
  @Index()
  @Field(() => Date)
  created_at = new Date();
}
