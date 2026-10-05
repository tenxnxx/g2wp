"use client";

import { BossSectionNav } from "@/components/bosses/boss-section-nav";
import { NameUseManager } from "@/components/catalog/name-use-manager";
import { serversService } from "@/services/servers.service";

export default function ServersPage() {
  return (
    <div className="space-y-6">
      <BossSectionNav />
      <NameUseManager
      title="เซิร์ฟเวอร์"
      addLabel="เพิ่มเซิร์ฟเวอร์"
      listTitle="รายการเซิร์ฟเวอร์"
      nameLabel="ชื่อเซิร์ฟเวอร์"
      namePlaceholder="เช่น Server 1"
      searchPlaceholder="ค้นหาชื่อเซิร์ฟเวอร์..."
      emptyTitle="ไม่มีเซิร์ฟเวอร์"
      emptyDescription="กดเพิ่มเซิร์ฟเวอร์เพื่อเริ่มใช้งาน"
      queryKey="servers"
      service={{
        list: async (params) => {
          const result = await serversService.list(params);
          return {
            ...result,
            data: result.data.map((row) => ({
              id: row.id,
              name: row.serverName,
              isUse: row.isUse,
              bossCount: row.bossCount,
            })),
          };
        },
        create: async ({ name, isUse }) => {
          const row = await serversService.create({ serverName: name, isUse });
          return {
            id: row.id,
            name: row.serverName,
            isUse: row.isUse,
            bossCount: row.bossCount,
          };
        },
        update: async (id, { name, isUse }) => {
          const row = await serversService.update(id, { serverName: name, isUse });
          return {
            id: row.id,
            name: row.serverName,
            isUse: row.isUse,
            bossCount: row.bossCount,
          };
        },
        remove: serversService.remove,
      }}
    />
    </div>
  );
}
