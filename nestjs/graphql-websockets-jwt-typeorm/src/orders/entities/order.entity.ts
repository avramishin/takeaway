import { v4 as uuid } from 'uuid';
import { Entity, Column, PrimaryColumn } from 'typeorm';
import { registerEnumType, ObjectType, Field, Float } from '@nestjs/graphql';

import { ColumnNumericTransformer } from '../../common/transformers/column-numeric.transformer';

export enum OrderTimeInForceEnum {
  fok = 'fok',
  ioc = 'ioc',
  gtc = 'gtc',
}
registerEnumType(OrderTimeInForceEnum, {
  name: 'OrderTimeInForceEnum',
});

export enum OrderTypeEnum {
  limit = 'limit',
  market = 'market',
}
registerEnumType(OrderTypeEnum, {
  name: 'OrderTypeEnum',
});

export enum OrderSideEnum {
  sell = 'sell',
  buy = 'buy',
}
registerEnumType(OrderSideEnum, {
  name: 'OrderSideEnum',
});

export enum OrderStatusEnum {
  new = 'new',
  trading = 'trading',
  completed = 'completed',
  cancelled = 'cancelled',
  rejected = 'rejected',
}
registerEnumType(OrderStatusEnum, {
  name: 'OrderStatusEnum',
});

@Entity({ name: 'orders' })
@ObjectType()
export class Order {
  @PrimaryColumn({ length: 36, type: 'varchar' })
  @Field({ nullable: false })
  id: string = uuid();

  @Column({ type: 'enum', enum: ['limit', 'market'], nullable: false })
  @Field(() => OrderTypeEnum)
  type: OrderTypeEnum;

  @Column({ type: 'enum', enum: ['fok', 'ioc', 'gtc'], nullable: false })
  @Field(() => OrderTimeInForceEnum)
  time_in_force: OrderTimeInForceEnum;

  @Column({ type: 'enum', enum: ['sell', 'buy'], nullable: false })
  @Field(() => OrderSideEnum)
  side: OrderSideEnum;

  @Column({
    type: 'decimal',
    precision: 26,
    scale: 8,
    unsigned: true,
    nullable: true,
    transformer: new ColumnNumericTransformer(),
  })
  @Field(() => Float)
  price: number;

  @Column({
    type: 'decimal',
    precision: 26,
    scale: 8,
    unsigned: true,
    nullable: false,
    transformer: new ColumnNumericTransformer(),
  })
  @Field(() => Float)
  quantity: number;

  @Column({
    type: 'enum',
    enum: ['new', 'trading', 'completed', 'cancelled', 'rejected'],
  })
  @Field(() => OrderStatusEnum)
  status: OrderStatusEnum = OrderStatusEnum.new;

  @Column({
    type: 'decimal',
    precision: 26,
    scale: 8,
    unsigned: true,
    nullable: false,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  @Field(() => Float)
  executed_quantity = 0;

  @Column({
    type: 'decimal',
    precision: 26,
    scale: 8,
    unsigned: true,
    nullable: false,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  @Field(() => Float)
  executed_quote_quantity = 0;

  @Column({ length: 36, nullable: false })
  @Field()
  user_id: string;

  @Column({ length: 36, nullable: false })
  @Field()
  instrument_id: string;

  @Column({ length: 36, nullable: false })
  client_base_account_id: string;

  @Column({ length: 36, nullable: false })
  client_quote_account_id: string;

  @Column({ length: 36, nullable: false })
  broker_base_account_id: string;

  @Column({ length: 36, nullable: false })
  broker_quote_account_id: string;

  @Column({ length: 36, nullable: true })
  hold_transfer_id?: string;

  @Column({ length: 36, nullable: true })
  release_transfer_id?: string;

  @Column({ length: 36, nullable: true })
  payout_transfer_id?: string;

  @Column({ length: 255, nullable: false })
  @Field({ nullable: true })
  message?: string;

  @Column({ type: 'datetime', nullable: false })
  @Field(() => Date)
  updated_at = new Date();

  @Column({ type: 'datetime', nullable: false })
  @Field(() => Date)
  created_at = new Date();

  getRemainingQty() {
    return this.quantity - this.executed_quantity;
  }

  getDescription() {
    return [
      this.instrument_id,
      this.type,
      this.side,
      this.status,
      `(q=${this.executed_quantity} qq=${this.executed_quote_quantity} of ${this.quantity})`,
      `@${this.price}`,
      `id ${this.id}`,
    ].join(' ');
  }
}
