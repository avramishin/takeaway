import { Type } from 'class-transformer';
import { Order } from '../trade/order.model';

export type MarketOrderQcSide = 'sell' | 'buy';
export type MarketOrderQcStatus =
  | 'new'
  | 'partially_filled'
  | 'completely_filled'
  | 'rejected';

export class MarketOrderQc {
  id: string;

  exchange_id: string;

  instrument_id: string;

  side: MarketOrderQcSide;

  status: MarketOrderQcStatus;

  client_user_id: string;

  @Type(() => Number)
  quantity: number;

  @Type(() => Number)
  executed_quantity: number;

  @Type(() => Number)
  executed_base_quantity: number;

  @Type(() => Number)
  open_time: number;

  @Type(() => Number)
  close_time?: number;

  reason?: string;

  access_token: string;

  limit_orders: {
    [key: string]: Order;
  };
}
