/** Page requested to a paginated list: its size and where to resume. */
export interface PageRequest {
  /** Number of items per page. */
  limit: number;
  /** Cursor returned by the previous page, absent for the first one. */
  cursor?: string;
}

/** One page of a paginated list. */
export interface Page<T> {
  /** Items of the page. */
  items: Array<T>;
  /** Cursor of the next page, absent on the last one. */
  nextCursor?: string;
}
