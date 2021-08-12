export class ClosedOrderDto {
  version: string;
  id: string;
  'detail-type': string;
  source: string;
  account: string;
  time: string;
  region: string;
  resources: any[];
  detail: Detail;
}

class Detail {
  id: string;
  exchange_id: string;
  oms_user_id: string;
  oms: string;
  client_user_id: string;
  close_time: number;
  open_time: number;
  instrument_id: string;
  type: string;
  side: string;
  status: string;
  limit_price: number;
  quantity: number;
  executed_quantity: number;
  time_in_force: string;
  reason: string;
  client_user_id_filled: string;
  client_user_id_status: string;
}
