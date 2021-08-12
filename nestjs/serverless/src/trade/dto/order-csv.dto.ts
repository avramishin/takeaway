import { capitalize } from 'lodash';
import { Transform } from 'class-transformer';

function convertIfNotEmpty(value: string) {
  return value && capitalize(value).replace('_', '');
}

function typeTransformer(type: string): any {
  switch (type) {
    case 'limit':
      return 'Limit';
    case 'market':
      return 'Market';
    case 'stop':
      return 'Stop';
    case 'stop_limit':
      return 'Stop_limit';
    case 'peg_to_market':
      return 'Peg to market';
    case 'peg_to_midpoint':
      return 'Peg to midpoint';
    case 'peg_to_primary':
      return 'Peg to primary';
    case 'market_on_close':
      return 'Market on close';
    case 'limit_on_close':
      return 'Limit on close';
    case 'limit_or_better':
      return 'Limit or better';
    case 'previously_quoted':
      return 'Previously quoted';
    default:
      return convertIfNotEmpty(type);
  }
}

function sideTransformer(side: string): any {
  switch (side) {
    case 'sell':
      return 'Sell';
    case 'buy':
      return 'Buy';
    default:
      return convertIfNotEmpty(side);
  }
}

function statusTransformer(status: string): any {
  switch (status) {
    case 'canceled':
      return 'Canceled';
    case 'completely_filled':
      return 'Completely filled';
    case 'expired':
      return 'Expired';
    case 'new':
      return 'New';
    case 'partially_filled':
      return 'Partially filled';
    case 'pending_cancel':
      return 'Pending cancel';
    case 'pending_replace':
      return 'Pending replace';
    case 'suspended':
      return 'Suspended';
    default:
      return convertIfNotEmpty(status);
  }
}

export class OrderCsv {
  id: string;
  exchange_id: string;
  instrument_id: string;
  @Transform(({ value }) => typeTransformer(value))
  type: string;
  @Transform(({ value }) => sideTransformer(value))
  side: string;
  @Transform(({ value }) => statusTransformer(value))
  status: string;
  quantity: number;
  executed_quantity: number;
  remaining_quantity: number;
  limit_price?: number;
  stop_price?: number;
  average_price: number;
  time_in_force: string;
  client_order_id: string;
  client_user_id: string;
  message: string;
  expire_time: Date;
  open_time: Date;
  close_time: Date;
  trading_commission: number;
  comission_product: string;
}
