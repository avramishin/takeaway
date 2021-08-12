import { ApiProperty } from '@nestjs/swagger';

class Balance {
  @ApiProperty()
  trade: number;

  @ApiProperty()
  withdraw: number;
}

export class Account {
  @ApiProperty()
  id: string;
  @ApiProperty()
  product: string;
  @ApiProperty()
  balance: Balance;
}
