import { IsNotEmpty, IsNumber, IsOptional, Max, Min } from 'class-validator';

import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from './order-status.dto';

export class OrderPagedFilter {
  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({ required: false, enum: ['asc', 'desc'], default: 'desc' })
  sort_direction?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000)
  @ApiProperty({ required: false })
  pager_limit = 50;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000)
  @ApiProperty({ required: false })
  pager_offset? = 0;

  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({
    required: false,
    enum: [
      'new',
      'rejected',
      'canceled',
      'replaced',
      'partially_filled',
      'completely_filled',
      'expired',
      'pending_new',
      'pending_cancel',
      'pending_replace',
      'suspended',
    ],
  })
  filter_status?: OrderStatus;

  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({
    description: 'get filled orders only',
    required: false,
    enum: ['yes', 'no'],
  })
  filter_filled?: 'yes' | 'no';

  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({ required: false })
  filter_date_from?: string;

  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({ required: false })
  filter_date_to?: string;
}

export class OrderPagedFilterCsv extends OrderPagedFilter {
  @IsOptional()
  @ApiProperty()
  dateFormat?: string;

  @IsOptional()
  @ApiProperty()
  dateTimezone = 'UTC';

  @IsOptional()
  @ApiProperty()
  @Transform(({ value }) => {
    try {
      return JSON.parse(value);
    } catch (error) {
      return {};
    }
  })
  headers: { [key: string]: string };
}
