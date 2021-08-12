import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsIn, IsPositive } from 'class-validator';
import { MarketOrderQcSide } from '../market-order-qc.model';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMarketOrderQc {
  @IsNotEmpty()
  @ApiProperty()
  instrument: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @ApiProperty()
  quantity: number;

  @IsNotEmpty()
  @IsIn(['sell', 'buy'])
  @ApiProperty()
  side: MarketOrderQcSide;
}
