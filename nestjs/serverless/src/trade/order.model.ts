import { OrderSide } from './dto/order-side.dto';
import { OrderTimeInForce } from './dto/order-time-in-force.dto';
import { OrderStatus } from './dto/order-status.dto';
import { OrderType } from './dto/order-type.dto';

import { AccountTransaction } from './account-transaction.model';
import { OrderEvent } from './order-event.model';
import { Type, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

import { reasonTransformer } from '../helpers/order-reason.transformer';

export class Order {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  exchange_id: string;

  @Expose()
  @ApiProperty()
  instrument_id: string;

  @Expose()
  @ApiProperty()
  type: OrderType;

  @Expose()
  @ApiProperty()
  side: OrderSide;

  @Expose()
  @ApiProperty()
  status: OrderStatus;

  @Expose()
  @Type(() => Number)
  @ApiProperty()
  quantity: number;

  @Expose()
  @Type(() => Number)
  @ApiProperty()
  executed_quantity: number;

  @Expose()
  @Type(() => Number)
  @ApiProperty()
  limit_price: number;

  @Expose()
  @Type(() => Number)
  @ApiProperty({ required: false })
  stop_price: number;

  @Expose()
  @Type(() => Number)
  @ApiProperty()
  average_price: number;

  @Expose()
  @ApiProperty()
  time_in_force: OrderTimeInForce;

  @Expose()
  @ApiProperty()
  client_order_id: string;

  @Expose()
  @ApiProperty()
  client_user_id: string;

  @Expose()
  @ApiProperty()
  reason?: string;

  @Expose({ name: 'reason_code' })
  @ApiProperty({ required: false })
  getReasonCode() {
    return reasonTransformer(this.reason);
  }

  @Expose()
  @Type(() => Number)
  @ApiProperty({ required: false })
  open_time: number;

  @Expose()
  @Type(() => Number)
  @ApiProperty({ required: false })
  close_time?: number;

  @Expose()
  @Type(() => Number)
  @ApiProperty({ required: false })
  expire_time?: number;

  @Expose()
  @ApiProperty({ required: false })
  transactions: {
    [key: string]: AccountTransaction;
  };

  @Expose()
  @ApiProperty({ required: false })
  events: {
    [key: string]: OrderEvent;
  };

  @Expose()
  @ApiProperty()
  trading_commission?: number;

  @Expose()
  @ApiProperty()
  commission_product?: string;
}
