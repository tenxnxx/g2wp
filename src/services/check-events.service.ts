import type {
  CheckEvent,
  CheckEventMember,
  CheckMemberStatus,
  CreateCheckEventInput,
  DecideCheckMemberInput,
  UpdateCheckEventInput,
} from "@/types/check-event";
import type { PaginatedResult, PaginationParams } from "@/types/pagination";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";

const BASE = "/api/check-events";

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

export const checkEventsService = {
  list(
    params: Partial<PaginationParams> & {
      status?: string;
      setDateId?: string;
    } = {},
  ): Promise<PaginatedResult<CheckEvent>> {
    const page = params.page ?? 1;
    const limit = params.limit ?? DEFAULT_PAGE_SIZE;
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (params.status) query.set("status", params.status);
    if (params.setDateId) query.set("setDateId", params.setDateId);

    return fetch(`${BASE}?${query}`, { cache: "no-store" }).then((res) =>
      parseJson<PaginatedResult<CheckEvent>>(res),
    );
  },

  get(id: string): Promise<CheckEvent> {
    return fetch(`${BASE}/${id}`, { cache: "no-store" }).then((res) =>
      parseJson<CheckEvent>(res),
    );
  },

  create(input: CreateCheckEventInput): Promise<CheckEvent> {
    return fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((res) => parseJson<CheckEvent>(res));
  },

  update(id: string, input: UpdateCheckEventInput): Promise<CheckEvent> {
    return fetch(`${BASE}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((res) => parseJson<CheckEvent>(res));
  },

  remove(id: string): Promise<void> {
    return fetch(`${BASE}/${id}`, { method: "DELETE" }).then(async (res) => {
      if (!res.ok) await parseJson(res);
    });
  },

  open(id: string): Promise<CheckEvent> {
    return fetch(`${BASE}/${id}/open`, { method: "POST" }).then((res) =>
      parseJson<CheckEvent>(res),
    );
  },

  close(id: string): Promise<CheckEvent> {
    return fetch(`${BASE}/${id}/close`, { method: "POST" }).then((res) =>
      parseJson<CheckEvent>(res),
    );
  },

  listMembers(
    id: string,
    params: Partial<PaginationParams> & {
      status?: CheckMemberStatus | "all";
      q?: string;
    } = {},
  ): Promise<
    PaginatedResult<CheckEventMember> & { eventStatus: CheckEvent["status"] }
  > {
    const page = params.page ?? 1;
    const limit = params.limit ?? DEFAULT_PAGE_SIZE;
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (params.status && params.status !== "all") {
      query.set("status", params.status);
    }
    if (params.q?.trim()) query.set("q", params.q.trim());

    return fetch(`${BASE}/${id}/members?${query}`, { cache: "no-store" }).then(
      (res) =>
        parseJson<
          PaginatedResult<CheckEventMember> & {
            eventStatus: CheckEvent["status"];
          }
        >(res),
    );
  },

  decide(
    id: string,
    memberId: string,
    input: DecideCheckMemberInput,
  ): Promise<{ member: CheckEventMember; event: CheckEvent }> {
    return fetch(`${BASE}/${id}/members/${memberId}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((res) =>
      parseJson<{ member: CheckEventMember; event: CheckEvent }>(res),
    );
  },
};
