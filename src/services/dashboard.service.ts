import type { DashboardResponse } from "@/types/dashboard";
import type { MemberDetail } from "@/types/member";

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

export const dashboardService = {
  getOverview(): Promise<DashboardResponse> {
    return fetch("/api/dashboard", { cache: "no-store" }).then((res) =>
      parseJson<DashboardResponse>(res),
    );
  },

  getMemberDetail(id: string): Promise<MemberDetail> {
    return fetch(`/api/members/${id}?detail=1`, { cache: "no-store" }).then(
      (res) => parseJson<MemberDetail>(res),
    );
  },
};
