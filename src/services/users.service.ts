import type { AppUser, AppUserRole } from "@/types/app-user";
import type { PaginatedResult, PaginationParams } from "@/types/pagination";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";

const BASE = "/api/users";

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

export const usersService = {
  list(
    params: Partial<PaginationParams> & { q?: string } = {},
  ): Promise<PaginatedResult<AppUser>> {
    const page = params.page ?? 1;
    const limit = params.limit ?? DEFAULT_PAGE_SIZE;
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (params.q?.trim()) query.set("q", params.q.trim());

    return fetch(`${BASE}?${query}`, { cache: "no-store" }).then((res) =>
      parseJson<PaginatedResult<AppUser>>(res),
    );
  },

  create(input: {
    email: string;
    password: string;
    role: AppUserRole;
    isUse: boolean;
    memberId: string | null;
  }): Promise<AppUser> {
    return fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((res) => parseJson<AppUser>(res));
  },

  update(
    id: string,
    input: { role: AppUserRole; isUse: boolean; memberId: string | null },
  ): Promise<AppUser> {
    return fetch(`${BASE}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((res) => parseJson<AppUser>(res));
  },
};
