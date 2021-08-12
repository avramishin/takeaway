import { WalletTransaction } from '@shiftforex/client-sdkv2';
import { Type } from 'class-transformer';
import { MarketOrderQc } from '../market-order-qc/market-order-qc.model';

export type InstantBuyStatus =
  | 'new'
  | 'init_error'
  | 'deposit_pending'
  | 'deposit_success'
  | 'deposit_error'
  | 'market_pending'
  | 'market_success'
  | 'market_error'
  | 'withdraw_pending'
  | 'withdraw_success'
  | 'withdraw_error'
  | 'success';

export class InstantBuy {
  id: string;
  exchange_id: string;
  instrument_id: string;
  status: InstantBuyStatus;
  client_user_id: string;
  deposit_product_id: string;
  @Type(() => Number)
  deposit_amount: number;
  deposit?: WalletTransaction;
  withdraw_product_id: string;
  withdraw_address: string;
  withdraw: WalletTransaction;
  market_order_qc?: MarketOrderQc;
  schema_name?: string;
  schema_data?: any = {};
  estimate: any = {};
  message?: string;
  access_token: string;
  open_time: number;
  close_time: number;
}
