"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { BossTimeField } from "@/components/bosses/boss-time-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/context/toast-context";
import { EMPTY_ARRAY } from "@/lib/empty";
import { bossesService } from "@/services/bosses.service";
import { citiesService } from "@/services/cities.service";
import { compareServerName } from "@/lib/servers";
import { serversService } from "@/services/servers.service";
import { typeServersService } from "@/services/type-servers.service";
import type { Boss } from "@/types/boss";
import { TYPE_SERVER_LABEL } from "@/types/type-server";

type BossFormModalProps = {
  open: boolean;
  item?: Boss | null;
  onClose: () => void;
};

export function BossFormModal({
  open,
  item = null,
  onClose,
}: BossFormModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEdit = Boolean(item);

  const [cityId, setCityId] = useState(item?.cityId ?? "");
  const [serverId, setServerId] = useState(item?.serverId ?? "");
  const [typeServerId, setTypeServerId] = useState(item?.typeServerId ?? "");
  const [hour, setHour] = useState(() => new Date().getHours());
  const [minute, setMinute] = useState(() => new Date().getMinutes());
  const [error, setError] = useState<string | null>(null);

  const citiesQuery = useQuery({
    queryKey: ["cities", "options", open],
    queryFn: () => citiesService.list({ page: 1, limit: 200, isUse: true }),
    enabled: open,
  });
  const serversQuery = useQuery({
    queryKey: ["servers", "options", open],
    queryFn: () => serversService.list({ page: 1, limit: 200, isUse: true }),
    enabled: open,
  });
  const typesQuery = useQuery({
    queryKey: ["type-servers", "options", open],
    queryFn: () =>
      typeServersService.list({ page: 1, limit: 200, isUse: true }),
    enabled: open,
  });

  const bossesQuery = useQuery({
    queryKey: ["bosses", "taken-servers", open],
    queryFn: () => bossesService.listAll(),
    enabled: open,
  });

  const cityRows = citiesQuery.data?.data ?? EMPTY_ARRAY;
  const serverRows = serversQuery.data?.data ?? EMPTY_ARRAY;
  const typeRows = typesQuery.data?.data ?? EMPTY_ARRAY;
  const selectedKind =
    typeRows.find((row) => row.id === typeServerId)?.type ??
    (item && typeServerId === item.typeServerId ? item.type : undefined);
  const takenServerIds = useMemo(() => {
    const ids = new Set<string>();
    if (!cityId || !selectedKind) return ids;
    for (const boss of bossesQuery.data ?? EMPTY_ARRAY) {
      if (item && boss.id === item.id) continue;
      if (boss.cityId === cityId && boss.type === selectedKind) {
        ids.add(boss.serverId);
      }
    }
    return ids;
  }, [bossesQuery.data, cityId, selectedKind, item]);

  const cityOptions = useMemo(() => {
    const options = cityRows.map((row) => ({
      value: row.id,
      label: row.cityName,
    }));
    if (item && !options.some((option) => option.value === item.cityId)) {
      options.unshift({
        value: item.cityId,
        label: `${item.cityName} (ปิดใช้งาน)`,
      });
    }
    return options;
  }, [cityRows, item]);

  const serverOptions = useMemo(() => {
    const options = serverRows
      .filter((row) => !takenServerIds.has(row.id))
      .map((row) => ({
        value: row.id,
        label: row.serverName,
      }));
    if (item && !options.some((option) => option.value === item.serverId)) {
      options.push({
        value: item.serverId,
        label: `${item.serverName} (ปิดใช้งาน)`,
      });
    }
    options.sort((a, b) => compareServerName(a.label, b.label));
    return options;
  }, [serverRows, item, takenServerIds]);

  if (serverId && takenServerIds.has(serverId)) {
    setServerId("");
  }

  const typeOptions = useMemo(() => {
    const options = typeRows.map((row) => ({
      value: row.id,
      label: TYPE_SERVER_LABEL[row.type],
      keywords: `${row.type} ${TYPE_SERVER_LABEL[row.type]}`,
    }));
    if (item && !options.some((option) => option.value === item.typeServerId)) {
      options.unshift({
        value: item.typeServerId,
        label: `${TYPE_SERVER_LABEL[item.type]} (ปิดใช้งาน)`,
        keywords: item.type,
      });
    }
    return options;
  }, [typeRows, item]);

  const createMutation = useMutation({
    mutationFn: bossesService.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bosses"] });
      await queryClient.invalidateQueries({ queryKey: ["cities"] });
      await queryClient.invalidateQueries({ queryKey: ["servers"] });
      await queryClient.invalidateQueries({ queryKey: ["type-servers"] });
      toast.success("เพิ่มบอสแล้ว");
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error("เพิ่มบอสไม่สำเร็จ", err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: {
      cityId: string;
      serverId: string;
      typeServerId: string;
      hour: number;
      minute: number;
    }) => bossesService.update(item!.id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bosses"] });
      toast.success("บันทึกบอสแล้ว");
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error("แก้ไขบอสไม่สำเร็จ", err.message);
    },
  });

  const pending = createMutation.isPending || updateMutation.isPending;
  const optionsLoading =
    citiesQuery.isLoading ||
    serversQuery.isLoading ||
    typesQuery.isLoading ||
    bossesQuery.isLoading;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cityId || !serverId || !typeServerId) {
      setError("เลือกเมือง เซิร์ฟเวอร์ และประเภทเซิร์ฟเวอร์");
      return;
    }
    const payload = { cityId, serverId, typeServerId, hour, minute };
    if (isEdit) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeDisabled={pending}
      title={isEdit ? "แก้ไขบอส" : "เพิ่มบอส"}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={pending}
            className="w-full sm:w-auto"
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            form="boss-form"
            disabled={pending || optionsLoading}
            className="w-full sm:w-auto sm:min-w-36"
          >
            {pending ? (
              <>
                <Spinner />
                กำลังบันทึก...
              </>
            ) : isEdit ? (
              "บันทึกการแก้ไข"
            ) : (
              "เพิ่มบอส"
            )}
          </Button>
        </div>
      }
    >
      <form id="boss-form" onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="boss-city">เมือง *</Label>
          {citiesQuery.isLoading ? (
            <div className="flex h-10 items-center gap-2 text-sm text-[var(--ink-muted)]">
              <Spinner />
              กำลังโหลดเมือง...
            </div>
          ) : cityOptions.length === 0 ? (
            <p className="rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--ink-muted)]">
              ยังไม่มีเมืองที่เปิดใช้งาน — ไปเพิ่มที่เมนูเมืองก่อน
            </p>
          ) : (
            <SearchableSelect
              id="boss-city"
              value={cityId}
              onChange={setCityId}
              options={cityOptions}
              placeholder="เลือกเมือง"
              searchPlaceholder="ค้นหาเมือง..."
              emptyMessage="ไม่พบเมือง"
            />
          )}
        </div>
        <div>
          <Label htmlFor="boss-server">เซิร์ฟเวอร์ *</Label>
          {serversQuery.isLoading || bossesQuery.isLoading ? (
            <div className="flex h-10 items-center gap-2 text-sm text-[var(--ink-muted)]">
              <Spinner />
              กำลังโหลดเซิร์ฟเวอร์...
            </div>
          ) : serverRows.length === 0 ? (
            <p className="rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--ink-muted)]">
              ยังไม่มีเซิร์ฟเวอร์ที่เปิดใช้งาน — ไปเพิ่มที่เมนูเซิร์ฟเวอร์ก่อน
            </p>
          ) : serverOptions.length === 0 ? (
            <p className="rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--ink-muted)]">
              เมืองและประเภทนี้ใช้เซิร์ฟเวอร์ที่มีอยู่ครบแล้ว
            </p>
          ) : (
            <SearchableSelect
              id="boss-server"
              value={serverId}
              onChange={setServerId}
              options={serverOptions}
              placeholder="เลือกเซิร์ฟเวอร์"
              searchPlaceholder="ค้นหาเซิร์ฟเวอร์..."
              emptyMessage="ไม่พบเซิร์ฟเวอร์"
            />
          )}
        </div>
        <div>
          <Label htmlFor="boss-type">ประเภทเซิร์ฟเวอร์ *</Label>
          {typesQuery.isLoading ? (
            <div className="flex h-10 items-center gap-2 text-sm text-[var(--ink-muted)]">
              <Spinner />
              กำลังโหลดประเภท...
            </div>
          ) : typeOptions.length === 0 ? (
            <p className="rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--ink-muted)]">
              ยังไม่มีประเภทที่เปิดใช้งาน — ไปเพิ่มที่เมนูประเภทเซิร์ฟเวอร์ก่อน
            </p>
          ) : (
            <SearchableSelect
              id="boss-type"
              value={typeServerId}
              onChange={setTypeServerId}
              options={typeOptions}
              placeholder="เลือกประเภท"
              searchPlaceholder="ค้นหา Official / Premium..."
              emptyMessage="ไม่พบประเภท"
            />
          )}
        </div>
        <BossTimeField
          hour={hour}
          minute={minute}
          onHourChange={setHour}
          onMinuteChange={setMinute}
        />
        {error ? (
          <p
            className="rounded-xl border border-[var(--danger)]/30 bg-[color-mix(in_oklab,var(--danger)_14%,var(--surface))] px-3 py-2 text-sm text-[var(--danger)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
