# Cursor Rules — SSOT

แหล่งความจริง (Single Source of Truth) สำหรับ Cursor Rules ในโปรเจกต์นี้

## โครงสร้าง

```text
cursor-rules/
├── global/              → deploy ไป ~/.cursor/rules/
│   ├── core.mdc
│   ├── obsidian-work-log.mdc
│   ├── coding.mdc
│   ├── architecture.mdc
│   ├── security.mdc
│   ├── security-lab.mdc
│   └── skill-routing.mdc
├── project/
│   ├── supersix-monorepo/   → deploy ไป .cursor/rules/
│   │   └── multi-skill-router.mdc
│   └── reverse/             → ไม่ติดตั้งใน supersix (ใช้กับ ~/Desktop/reverse)
│       └── reverse-skill.mdc
├── USER-RULES-REFERENCE.md
└── README.md

.cursor/skills/          → project skills (REGISTRY, CAPABILITIES, SKILL.md)
docs/ai-skills/          → Obsidian mirror + Ai skill-rule.md
```

## ติดตั้ง

```bash
bash scripts/install-cursor-rules.sh
```

- **default:** global → `~/.cursor/rules/`, project → `.cursor/rules/`
- **`--local-all`:** ทุก global rule ไป `.cursor/rules/` ด้วย (เมื่อไม่ใช้ global)

## ห้าม

- แก้แค่ `~/.cursor/rules/` หรือ `.cursor/rules/` โดยไม่ sync กลับ `cursor-rules/`
- สร้าง `user-*.mdc` — ใช้ Cursor Settings → User Rules แทน
- copy project rules เป็น global โดยอัตโนมัติ

## เอกสาร

- `docs/ai-skills/Ai skill-rule.md` — architecture + inventory
- `docs/multi-skill.md` — multi-skill framework
- `AGENTS.md` — คู่มือสั้นสำหรับ AI
