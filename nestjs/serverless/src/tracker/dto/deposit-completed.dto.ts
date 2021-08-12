export class DepositCompletedDto {
  account: string;
  detail: Detail;
  id: string;
  'detail-type': string;
  region: string;
  resources: any[];
  source: string;
  time: string;
  version: string;
}

interface Detail {
  address: string;
  amount: string;
  amount_check: string;
  approved: number;
  client_user_id: string;
  confirmations_count: number;
  confirmations_required: number;
  created_at: string;
  details?: any;
  duplicate: number;
  event_type: string;
  exchange: string;
  exchange_id: string;
  exchange_txid: string;
  id: string;
  idm_check: string;
  iframe_url?: any;
  internal_transfer_counter_id?: any;
  is_internal_transfer: number;
  message?: any;
  product_id: string;
  psp_service_id: string;
  reusable?: any;
  revert_txid?: any;
  schema_data?: any;
  schema_name?: any;
  source: string;
  state_hash: string;
  status: string;
  tag?: any;
  timestamp: string;
  txid_hash: string;
  type: string;
  updated_at: string;
  user_id: string;
  validation?: any;
  webhook_url?: any;
}
