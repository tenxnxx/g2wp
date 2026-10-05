import type { City } from "@/types/city";

export function serializeCity(row: {
  id: string;
  cityName: string;
  isUse: boolean;
  _count?: { bosses: number };
}): City {
  return {
    id: row.id,
    cityName: row.cityName,
    isUse: row.isUse,
    ...(row._count ? { bossCount: row._count.bosses } : {}),
  };
}
