import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AccountTransaction {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  account_id: string;

  @Expose()
  @Type(() => Number)
  @ApiProperty()
  amount: number;

  @Expose()
  @ApiProperty()
  client_user_id: string;

  @Expose()
  @ApiProperty()
  conversion_currency: string;

  @Expose()
  @Type(() => Number)
  @ApiProperty()
  conversion_price: number;

  @Expose()
  @ApiProperty()
  currency: string;

  @Expose()
  @ApiProperty()
  deal_id: string;

  @Expose()
  @ApiProperty()
  oms_user_id: string;

  @Expose()
  @ApiProperty()
  exchange_id: string;

  @Expose()
  @ApiProperty()
  is_rejected: boolean;

  @Expose()
  @Type(() => Number)
  @ApiProperty()
  post_balance: number;

  @Expose()
  @ApiProperty()
  sequence_number: number;

  @Expose()
  @Type(() => Number)
  @ApiProperty()
  timestamp: number;

  @Expose()
  @ApiProperty()
  type: string;
}
