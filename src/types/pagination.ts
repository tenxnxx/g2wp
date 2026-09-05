export type PaginationParams = {
  page: number;
  limit: number;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

export type PaginatedResult<T> = {
  data: T[];
  meta: PaginationMeta;
};

export const DEFAULT_PAGE_SIZE = 10;
