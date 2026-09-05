"use client";

import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { displayHandle } from "@/lib/display";
import { membersService } from "@/services/members.service";

type MemberDetailModalProps = {
  open: boolean;
  memberId: string | null;
  onClose: () => void;
};

export function MemberDetailModal({
  open,
  memberId,
  onClose,
}: MemberDetailModalProps) {
  const detailQuery = useQuery({
    queryKey: ["members", "detail", memberId],
    queryFn: () => membersService.getDetail(memberId!),
    enabled: open && Boolean(memberId),
  });

  const member = detailQuery.data;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member ? `รายละเอียด: ${member.name}` : "รายละเอียดสมาชิก"}
      description={
        member
          ? `ตัวละคร ${member.playerCount} · พฤติกรรม ${member.behaviorCount}`
          : "กำลังโหลดข้อมูลสมาชิก"
      }
    >
      {detailQuery.isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-[var(--ink-muted)]">
          <Spinner />
          กำลังโหลดรายละเอียด...
        </div>
      ) : detailQuery.isError ? (
        <p className="rounded-xl border border-[var(--danger)]/30 bg-[color-mix(in_oklab,var(--danger)_14%,var(--surface))] px-3 py-2 text-sm text-[var(--danger)]">
          โหลดไม่สำเร็จ: {(detailQuery.error as Error).message}
        </p>
      ) : member ? (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="อายุ" value={String(member.age)} />
            <InfoRow
              label="สถานะ"
              value={member.isLive ? "อยู่ในแคลน" : "ไม่อยู่แล้ว"}
            />
            <InfoRow label="สร้างโดย" value={displayHandle(member.createBy)} />
            <InfoRow
              label="สร้างเมื่อ"
              value={new Date(member.createdAt).toLocaleString("th-TH")}
            />
            {member.facebookUrl ? (
              <div className="sm:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                  Facebook
                </p>
                <a
                  href={member.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-sm text-[var(--accent-strong)] underline-offset-2 hover:underline"
                >
                  เปิดลิงก์
                </a>
              </div>
            ) : null}
          </section>

          <section>
            <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--ink)]">
              ตัวละคร ({member.playerCount})
            </h3>
            {member.players.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--ink-muted)]">
                ยังไม่มีตัวละคร
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {member.players.map((player) => (
                  <li
                    key={player.id}
                    className="rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 py-2"
                  >
                    <p className="text-sm font-medium text-[var(--ink)]">
                      {player.name}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                      สร้างโดย {displayHandle(player.createBy)} ·{" "}
                      {new Date(player.createdAt).toLocaleString("th-TH")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--ink)]">
              พฤติกรรม ({member.behaviorCount})
            </h3>
            {member.behaviors.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--ink-muted)]">
                ยังไม่มีพฤติกรรม
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {member.behaviors.map((behavior) => (
                  <li
                    key={behavior.id}
                    className="rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 py-2"
                  >
                    <p className="text-sm text-[var(--ink)]">
                      {behavior.description}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">
                      ผู้เล่น {behavior.player.name} · สร้างโดย{" "}
                      {displayHandle(behavior.createBy)} ·{" "}
                      {new Date(behavior.createdAt).toLocaleString("th-TH")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm text-[var(--ink)]">{value}</p>
    </div>
  );
}
