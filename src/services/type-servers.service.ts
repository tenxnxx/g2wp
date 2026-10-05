import type { PaginatedResult, PaginationParams } from "@/types/pagination";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import type {
  CreateTypeServerInput,
  TypeServer,
  UpdateTypeServerInput,
} from "@/types/type-server";

const BASE = "/api/type-servers";

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

export const typeServersService = {
  list(
    params: Partial<PaginationParams> & {
      q?: string;
      isUse?: boolean;
    } = {},
  ): Promise<PaginatedResult<TypeServer>> {
    const page = params.page ?? 1;
    const limit = params.limit ?? DEFAULT_PAGE_SIZE;
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (params.q?.trim()) query.set("q", params.q.trim());
    if (params.isUse !== undefined) query.set("isUse", String(params.isUse));

    return fetch(`${BASE}?${query}`, { cache: "no-store" }).then((res) =>
      parseJson<PaginatedResult<TypeServer>>(res),
    );
  },

  create(input: CreateTypeServerInput): Promise<TypeServer> {
    return fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((res) => parseJson<TypeServer>(res));
  },

  update(id: string, input: UpdateTypeServerInput): Promise<TypeServer> {
    return fetch(`${BASE}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((res) => parseJson<TypeServer>(res));
  },

  remove(id: string): Promise<void> {
    return fetch(`${BASE}/${id}`, { method: "DELETE" }).then(async (res) => {
      if (!res.ok) {
        await parseJson(res);
      }
    });
  },
};
