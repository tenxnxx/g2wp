import type {
  CreateSetDateInput,
  SetDate,
  UpdateSetDateInput,
} from "@/types/set-date";
import type { PaginatedResult, PaginationParams } from "@/types/pagination";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";

const BASE = "/api/set-dates";

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

export const setDatesService = {
  list(
    params: Partial<PaginationParams> = {},
  ): Promise<PaginatedResult<SetDate>> {
    const page = params.page ?? 1;
    const limit = params.limit ?? DEFAULT_PAGE_SIZE;
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    return fetch(`${BASE}?${query}`, { cache: "no-store" }).then((res) =>
      parseJson<PaginatedResult<SetDate>>(res),
    );
  },

  create(input: CreateSetDateInput): Promise<SetDate> {
    return fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((res) => parseJson<SetDate>(res));
  },

  update(id: string, input: UpdateSetDateInput): Promise<SetDate> {
    return fetch(`${BASE}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((res) => parseJson<SetDate>(res));
  },

  remove(id: string): Promise<void> {
    return fetch(`${BASE}/${id}`, { method: "DELETE" }).then(async (res) => {
      if (!res.ok) {
        await parseJson(res);
      }
    });
  },
};
