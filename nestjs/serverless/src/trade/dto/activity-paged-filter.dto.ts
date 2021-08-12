import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ActivityPagedFilter {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000)
  @ApiProperty()
  pager_limit = 20;
}

export class ActivityPagedFilterCsv extends ActivityPagedFilter {
  @IsOptional()
  @ApiProperty()
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
