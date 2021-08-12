import { Order } from '../order.model';
import { ApiProperty } from '@nestjs/swagger';

export class OrderPagedResponse {
  @ApiProperty({ type: [Order] })
  items: Order[];

  @ApiProperty()
  pager_limit: number;

  @ApiProperty()
  pager_offset: number;

  @ApiProperty()
  pager_total_rows: number;
}
