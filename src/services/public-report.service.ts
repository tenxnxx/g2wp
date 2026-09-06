import type {
  CreatePublicReportInput,
  PublicReportPlayerOption,
} from "@/types/behavior-report";

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

export const publicReportService = {
  listPlayers(): Promise<{ players: PublicReportPlayerOption[] }> {
    return fetch("/api/public/report-options", { cache: "no-store" }).then(
      (res) => parseJson(res),
    );
  },

  create(input: CreatePublicReportInput): Promise<{ id: string }> {
    return fetch("/api/public/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((res) => parseJson(res));
  },
};
