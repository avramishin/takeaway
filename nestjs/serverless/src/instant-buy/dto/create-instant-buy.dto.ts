import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInstantBuy {
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

  @IsNotEmpty()
  @ApiProperty()
  withdraw_address: string;

  @IsNotEmpty()
  @ApiProperty()
  schema_name: string;

  @IsNotEmpty()
  @ApiProperty()
  schema_data: any;
}
