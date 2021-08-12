import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsIn,
  IsPositive,
  ValidateIf,
  IsUUID,
} from 'class-validator';

import { Type } from 'class-transformer';

import { OrderSide } from './order-side.dto';
import { OrderType } from './order-type.dto';
import { OrderTimeInForce } from './order-time-in-force.dto';

import { ApiProperty } from '@nestjs/swagger';

export class CreateOrder {
  @IsNotEmpty()
  @ApiProperty({ required: true })
  instrument: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @ApiProperty({ required: true })
  quantity: number;

  @IsUUID(4)
  @IsOptional()
  @ApiProperty({ required: false })
  client_order_id?: string;

  @IsOptional()
  @ApiProperty({ required: false })
  user_data?: string;

  @IsNotEmpty()
  @IsIn(['limit', 'market', 'stop'])
  @ApiProperty({ required: true })
  type: OrderType;

  @IsNotEmpty()
  @IsIn(['sell', 'buy'])
  @ApiProperty({ required: true })
  side: OrderSide;

  @ValidateIf(o => o.type == 'limit')
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @ApiProperty({ required: false })
  limit_price?: number;

  @ValidateIf(o => o.type == 'stop')
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @ApiProperty({ required: false })
  stop_price?: number;

  @IsIn(['ioc', 'fok', 'gtc', 'gtd', 'day', 'ato', 'atc', 'gtcrs'])
  @ApiProperty({
    required: true,
    enum: ['ioc', 'fok', 'gtc', 'gtd', 'day', 'ato', 'atc', 'gtcrs'],
  })
  time_in_force: OrderTimeInForce;

  @ValidateIf(o => o.time_in_force == 'gtd')
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @ApiProperty({ required: false })
  expire_time?: number;

  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({ required: false })
  destination = 'SHIFTFX';
}
