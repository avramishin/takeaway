export interface PagedItemsResponse<T> {
  items: T[];
  limit: number;
  offset: number;
  total: number;
}
