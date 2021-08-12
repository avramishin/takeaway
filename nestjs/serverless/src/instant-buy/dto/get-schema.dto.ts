import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetSchema {
  @IsNotEmpty()
  @ApiProperty()
  product: string;

  @IsNotEmpty()
  @ApiProperty()
  type: 'deposit' | 'withdraw';
}
