import { IsNotEmpty, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TransactionPagedFilter {
  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({ required: false })
  sort_direction?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000)
  @ApiProperty({ required: false })
  pager_limit? = 50;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000)
  @ApiProperty({ required: false })
  pager_offset? = 0;

  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({ required: false })
  filter_type: string;

  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({ required: false })
  filter_date_from: string;

  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({ required: false })
  filter_date_to: string;
}

export class TransactionPagedFilterCsv extends TransactionPagedFilter {
  @IsOptional()
  @ApiProperty({ required: false })
  dateFormat: string;

  @IsOptional()
  @ApiProperty()
  dateTimezone? = 'UTC';

  @Transform(({ value }) => {
    try {
      return JSON.parse(value);
    } catch (error) {
      return {};
    }
  })
  headers: { [key: string]: string };
}
