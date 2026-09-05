import type {
  CreateMemberInput,
  Member,
  MemberDetail,
  UpdateMemberInput,
} from "@/types/member";
import type { PaginatedResult, PaginationParams } from "@/types/pagination";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";

const BASE = "/api/members";

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

export const membersService = {
  list(
    params: Partial<PaginationParams> & { q?: string } = {},
  ): Promise<PaginatedResult<Member>> {
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
      parseJson<PaginatedResult<Member>>(res),
    );
  },

  getDetail(id: string): Promise<MemberDetail> {
    return fetch(`${BASE}/${id}?detail=1`, { cache: "no-store" }).then((res) =>
      parseJson<MemberDetail>(res),
    );
  },

  create(input: CreateMemberInput): Promise<Member> {
    return fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((res) => parseJson<Member>(res));
  },

  update(id: string, input: UpdateMemberInput): Promise<Member> {
    return fetch(`${BASE}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((res) => parseJson<Member>(res));
  },

  remove(id: string): Promise<void> {
    return fetch(`${BASE}/${id}`, { method: "DELETE" }).then(async (res) => {
      if (!res.ok) {
        await parseJson(res);
      }
    });
  },
};
