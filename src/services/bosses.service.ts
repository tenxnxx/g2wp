import type { Boss, CreateBossInput, UpdateBossInput } from "@/types/boss";
import type { PaginatedResult, PaginationParams } from "@/types/pagination";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";

const BASE = "/api/bosses";

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

export const bossesService = {
  list(
    params: Partial<PaginationParams> & {
      q?: string;
      cityId?: string;
      serverId?: string;
      typeServerId?: string;
    } = {},
  ): Promise<PaginatedResult<Boss>> {
    const page = params.page ?? 1;
    const limit = params.limit ?? DEFAULT_PAGE_SIZE;
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (params.q?.trim()) query.set("q", params.q.trim());
    if (params.cityId) query.set("cityId", params.cityId);
    if (params.serverId) query.set("serverId", params.serverId);
    if (params.typeServerId) query.set("typeServerId", params.typeServerId);

    return fetch(`${BASE}?${query}`, { cache: "no-store" }).then((res) =>
      parseJson<PaginatedResult<Boss>>(res),
    );
  },

  async listAll(
    params: {
      q?: string;
      cityId?: string;
      serverId?: string;
      typeServerId?: string;
    } = {},
  ): Promise<Boss[]> {
    const query = new URLSearchParams({ board: "1" });
    if (params.q?.trim()) query.set("q", params.q.trim());
    if (params.cityId) query.set("cityId", params.cityId);
    if (params.serverId) query.set("serverId", params.serverId);
    if (params.typeServerId) query.set("typeServerId", params.typeServerId);

    const body = await fetch(`${BASE}?${query}`, { cache: "no-store" }).then((res) =>
      parseJson<PaginatedResult<Boss>>(res),
    );
    return body.data;
  },

  create(input: CreateBossInput): Promise<Boss> {
    return fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((res) => parseJson<Boss>(res));
  },

  update(id: string, input: UpdateBossInput): Promise<Boss> {
    return fetch(`${BASE}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((res) => parseJson<Boss>(res));
  },

  warnHourSoon(id: string): Promise<{ sent: boolean }> {
    return fetch(`${BASE}/${id}/hour-soon`, { method: "POST" }).then((res) =>
      parseJson<{ sent: boolean }>(res),
    );
  },

  remove(id: string): Promise<void> {
    return fetch(`${BASE}/${id}`, { method: "DELETE" }).then(async (res) => {
      if (!res.ok) {
        await parseJson(res);
      }
    });
  },
};
