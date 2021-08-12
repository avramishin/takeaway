import { IsNotEmpty, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { Key } from 'aws-sdk/clients/dynamodb';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class MarketOrderQcPagedFilter {
  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({ required: false, enum: ['asc', 'desc'], default: 'desc' })
  sort_direction: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @ApiProperty({ required: false, default: 50 })
  pager_limit = 50;

  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({ required: false })
  filter_date_from?: string;

  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({ required: false })
  filter_date_to?: string;

  @IsOptional()
  @ApiProperty({ required: false })
  exclusive_start_key?: Key;
}
