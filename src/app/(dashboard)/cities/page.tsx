"use client";

import { BossSectionNav } from "@/components/bosses/boss-section-nav";
import { NameUseManager } from "@/components/catalog/name-use-manager";
import { citiesService } from "@/services/cities.service";

export default function CitiesPage() {
  return (
    <div className="space-y-6">
      <BossSectionNav />
      <NameUseManager
      title="เมือง"
      addLabel="เพิ่มเมือง"
      listTitle="รายการเมือง"
      nameLabel="ชื่อเมือง"
      namePlaceholder="เช่น เมืองหลวง"
      searchPlaceholder="ค้นหาชื่อเมือง..."
      emptyTitle="ไม่มีเมือง"
      emptyDescription="กดเพิ่มเมืองเพื่อเริ่มใช้งาน"
      queryKey="cities"
      service={{
        list: async (params) => {
          const result = await citiesService.list(params);
          return {
            ...result,
            data: result.data.map((row) => ({
              id: row.id,
              name: row.cityName,
              isUse: row.isUse,
              bossCount: row.bossCount,
            })),
          };
        },
        create: async ({ name, isUse }) => {
          const row = await citiesService.create({ cityName: name, isUse });
          return {
            id: row.id,
            name: row.cityName,
            isUse: row.isUse,
            bossCount: row.bossCount,
          };
        },
        update: async (id, { name, isUse }) => {
          const row = await citiesService.update(id, { cityName: name, isUse });
          return {
            id: row.id,
            name: row.cityName,
            isUse: row.isUse,
            bossCount: row.bossCount,
          };
        },
        remove: citiesService.remove,
      }}
    />
    </div>
  );
}
