import type {
  CreateBehaviorInput,
  Behavior,
  UpdateBehaviorInput,
} from "@/types/behavior";
import type { PaginatedResult, PaginationParams } from "@/types/pagination";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";

const BASE = "/api/behaviors";

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data === "object" && data && "error" in data
        ? String((data as { error: unknown }).error)
        : "Request failed";
    throw new Error(message);
  }
  return data as T;
}

export const behaviorsService = {
  list(
    params: Partial<PaginationParams> & { q?: string } = {},
  ): Promise<PaginatedResult<Behavior>> {
    const page = params.page ?? 1;
    const limit = params.limit ?? DEFAULT_PAGE_SIZE;
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (params.q?.trim()) {
      query.set("q", params.q.trim());
    }

    return fetch(`${BASE}?${query}`, { cache: "no-store" }).then((res) =>
      parseJson<PaginatedResult<Behavior>>(res),
    );
  },

  create(input: CreateBehaviorInput): Promise<Behavior> {
    return fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((res) => parseJson<Behavior>(res));
  },

  update(id: string, input: UpdateBehaviorInput): Promise<Behavior> {
    return fetch(`${BASE}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((res) => parseJson<Behavior>(res));
  },

  remove(id: string): Promise<void> {
    return fetch(`${BASE}/${id}`, { method: "DELETE" }).then(async (res) => {
      if (!res.ok) {
        await parseJson(res);
      }
    });
  },
};
