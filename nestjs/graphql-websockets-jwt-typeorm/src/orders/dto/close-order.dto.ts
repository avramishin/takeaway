import { IsIn, IsNotEmpty, IsOptional, Length } from 'class-validator';
import { OrderStatusEnum } from '../entities/order.entity';

export class CloseOrderDto {
  @IsNotEmpty()
  @Length(36)
  id: string;

  @IsNotEmpty()
  @IsIn(['completed', 'cancelled', 'rejected'])
  status: OrderStatusEnum;

  @IsOptional()
  @Length(255)
  message?: string;
}
