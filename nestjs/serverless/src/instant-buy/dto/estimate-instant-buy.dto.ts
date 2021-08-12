import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class EstimateInstantBuy {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @ApiProperty()
  amount: number;

  @IsNotEmpty()
  @ApiProperty()
  base_product: string;

  @IsNotEmpty()
  @ApiProperty()
  quote_product: string;
}
