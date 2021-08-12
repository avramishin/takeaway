export type OrderType =
  | 'custom'
  | 'market'
  | 'limit'
  | 'stop'
  | 'stop_limit'
  | 'peg_to_market'
  | 'peg_to_midpoint'
  | 'peg_to_primary'
  | 'market_on_close'
  | 'limit_on_close'
  | 'limit_or_better'
  | 'previously_quoted';
