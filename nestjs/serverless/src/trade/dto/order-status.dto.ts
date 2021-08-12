export type OrderStatus =
  | 'new'
  | 'rejected'
  | 'canceled'
  | 'replaced'
  | 'partially_filled'
  | 'completely_filled'
  | 'expired'
  | 'pending_new'
  | 'pending_cancel'
  | 'pending_replace'
  | 'suspended';
