import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { Ticker } from './ticker';

export enum TickerEventTypeEnum {
  'TickerUpdated' = 'TickerUpdated',
}

registerEnumType(TickerEventTypeEnum, {
  name: 'TickerEventTypeEnum',
});

@ObjectType()
export class TickerEvent {
  @Field(() => TickerEventTypeEnum)
  type: TickerEventTypeEnum;

  @Field(() => Ticker)
  ticker: Ticker;
}
