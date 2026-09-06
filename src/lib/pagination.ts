import {
  DEFAULT_PAGE_SIZE,
  type PaginationMeta,
  type PaginationParams,
} from "@/types/pagination";
import { SEARCH_Q_MAX } from "@/lib/field-limits";

export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaultLimit = DEFAULT_PAGE_SIZE,
): PaginationParams {
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const rawLimit = Number(searchParams.get("limit") ?? defaultLimit) || defaultLimit;
  const limit = Math.min(200, Math.max(1, rawLimit));
  return { page, limit };
}

export function parseSearchQuery(searchParams: URLSearchParams): string | undefined {
  const raw = searchParams.get("q")?.trim();
  if (!raw) return undefined;
  return raw.slice(0, SEARCH_Q_MAX);
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);

  return {
    page: safePage,
    limit,
    total,
    totalPages,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
  };
}

export function getSkip(page: number, limit: number) {
  return (page - 1) * limit;
}
