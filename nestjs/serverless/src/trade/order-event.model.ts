import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class OrderEvent {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  account: string;

  @Expose()
  @Type(() => Number)
  @ApiProperty()
  commission: number;

  @Expose()
  @ApiProperty()
  commission_currency: string;

  @Expose()
  @Type(() => Number)
  @ApiProperty()
  cumulative_quantity: number;

  @Expose()
  @Type(() => Number)
  @ApiProperty()
  remaining_quantity: number;

  @Expose()
  @Type(() => Number)
  @ApiProperty()
  quantity: number;

  @Expose()
  @Type(() => Number)
  @ApiProperty()
  trade_quantity?: number;

  @Expose()
  @Type(() => Number)
  @ApiProperty()
  trade_price?: number;

  @Expose()
  @ApiProperty()
  order_id: string;

  @Expose()
  @ApiProperty()
  order_status: string;

  @Expose()
  @ApiProperty()
  side: string;

  @Expose()
  @ApiProperty()
  symbol: string;

  @Expose()
  @ApiProperty()
  time_in_force: string;

  @Expose()
  @ApiProperty()
  order_type: string;

  @Expose()
  @ApiProperty()
  oms: string;

  @Expose()
  @ApiProperty()
  oms_user_id: string;

  @Expose()
  @ApiProperty()
  exchange_id: string;

  @Expose()
  @ApiProperty()
  source_id: string;

  @Expose()
  @Type(() => Number)
  @ApiProperty()
  timestamp: number;

  @Expose()
  @ApiProperty()
  type: string;
}
