import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsIn,
  IsPositive,
  ValidateIf,
} from 'class-validator';

import {
  OrderSideEnum,
  OrderTypeEnum,
  OrderTimeInForceEnum,
} from '../entities/order.entity';

import { Field, Float, ArgsType } from '@nestjs/graphql';

@ArgsType()
export class OpenOrderArgs {
  @IsNotEmpty()
  @Field()
  instrument_id: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Field(() => Float)
  quantity: number;

  @IsNotEmpty()
  @IsIn(['limit', 'market'])
  @Field(() => OrderTypeEnum)
  type: OrderTypeEnum;

  @IsNotEmpty()
  @IsIn(['sell', 'buy'])
  @Field(() => OrderSideEnum)
  side: OrderSideEnum;

  @ValidateIf((o) => o.type == 'limit')
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Field(() => Float, { nullable: true })
  price?: number;

  @IsIn(['fok', 'ioc', 'gtc'])
  @Field(() => OrderTimeInForceEnum)
  time_in_force: OrderTimeInForceEnum;
}
