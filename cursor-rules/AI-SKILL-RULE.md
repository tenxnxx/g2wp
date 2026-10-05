# AI Skill Rule

**SSOT bundle:** `cursor-rules/` + `docs/ai-skills/Ai skill-rule.md`  
**Obsidian primary (Mac):** `/Users/ildiamante/Documents/Obsidian Vault/AI Skills/Ai skill-rule.md`  
**Repo fallback:** `docs/ai-skills/Ai skill-rule.md`

อัปเดตทั้งสองที่เมื่อ config เปลี่ยน

## Purpose

ระบบ Cursor Rules นี้จัดให้ AI Agent ทำงานถูกต้องตามประเภทงาน โดย:

- โหลดเฉพาะ Rule ที่เกี่ยวข้อง (scope + globs)
- แยก Core / Coding / Architecture / Security / Documentation / Routing ชัดเจน
- ไม่สร้าง `user-*.mdc` — User preferences อยู่ที่ **Cursor Settings → User Rules**
- รักษา Multi-Skill Framework v1.2 สำหรับโปรเจกต์ `supersix-monorepo`

## Rule Architecture

```text
cursor-rules/ (SSOT)
├── global/                    → ~/.cursor/rules/
│   ├── core.mdc               [alwaysApply]
│   ├── obsidian-work-log.mdc  [alwaysApply]
│   ├── coding.mdc             [globs: source/test]
│   ├── architecture.mdc       [globs: modules, adr, …]
│   ├── security.mdc           [globs: auth, security, .env]
│   ├── security-lab.mdc       [globs: security-ai-training-lab/**]
│   └── skill-routing.mdc      [on-demand]
└── project/supersix-monorepo/
    └── multi-skill-router.mdc [alwaysApply ในโปรเจกต์นี้]

.cursor/skills/                → REGISTRY, CAPABILITIES, SKILL.md (10 skills)
docs/multi-skill*.md           → framework tests & audit

User Preferences (ไม่ใช่ไฟล์ .mdc)
└── Cursor Settings → User Rules
   (ดู cursor-rules/USER-RULES-REFERENCE.md)

Project-only (ไม่ติดตั้งใน supersix)
└── cursor-rules/project/reverse/reverse-skill.mdc
```

## Rule Inventory

| Rule | Scope | Trigger | Always Apply | Purpose |
| ---- | ----- | ------- | ------------ | ------- |
| core | Global | ทุก session | yes | understand, verify, rule index, ไม่เดา |
| obsidian-work-log | Documentation | agent/skills/setup | yes | บันทึก Work Log |
| coding | Code | globs `*.{ts,tsx,…}`, tests | no | standards, testing, error handling |
| architecture | Architecture | globs modules, adr, domain | no | DDD, Clean Arch, boundaries |
| security | Security | globs auth/security/.env | no | secure coding, secrets, injection |
| security-lab | Security Lab | globs `security-ai-training-lab/**` | no | Lab isolation, TRAINING_ONLY |
| skill-routing | AI Routing | งานมีสาระ / เลือก workflow | no | smallest sufficient skill, tool risk |
| multi-skill-router | Project supersix | workspace นี้ | yes | REGISTRY → skills → CAPABILITIES |
| reverse-skill | Reverse | ~/Desktop/reverse workspace | no | reverse/CTF/pentest ที่มี auth |

## Scope Strategy

| Scope | ทำงานเมื่อ | กลไก |
| ----- | ---------- | ---- |
| Global / Always | ทุกงานที่จำเป็นจริง | `alwaysApply: true` — เฉพาะ core, obsidian-work-log |
| Code | แก้ source/test | globs ใน `coding.mdc` |
| Architecture | ออกแบบโครงสร้าง | globs + agent request |
| Security | งาน sensitive | globs auth/security/.env |
| Security Lab | Lab workspace | globs lab path |
| Documentation | บันทึกงาน | obsidian-work-log |
| Reverse | reverse pack | project rule ที่ `cursor-rules/project/reverse/` |
| AI Routing | เลือก skill/tool | skill-routing + multi-skill-router |

## Rule Priority

เมื่อ Rules หลายตัวเกี่ยวข้อง:

1. **Platform safety** (Cursor policy)
2. **core.mdc** — verify, ไม่เดา, minimal scope
3. **Domain-specific** — security > coding (security) · architecture > coding (layers)
4. **security-lab** — ชนะ security เรื่อง Lab isolation
5. **reverse-skill** — เฉพาะ reverse workspace
6. **multi-skill-router** — ใน supersix เท่านั้น
7. **User Rules** (Cursor Settings) — ภาษา, git, communication

## Multi-Skill Routing

```text
REGISTRY.md
→ Classify (Clear / Ambiguous / Complex / High Risk)
→ smallest sufficient skill set
→ CAPABILITIES.md (JIT verify ถ้า stale)
→ tool (project-native → local → Cursor → MCP)
→ Safety L0–L3
→ โหลดเฉพาะ SKILL.md ที่เลือก
→ Execute
→ Verify
```

**ที่ตั้ง:** `.cursor/skills/` · 10 skills · `_contract.md` · `REGISTRY.md`

## Skill Selection Principles

1. **Smallest sufficient** — ไม่โหลดทุก skill
2. มี REGISTRY ในโปรเจกต์ → อ่านก่อน global skills
3. Skill แนะนำ ≠ อนุญาต execute (L2–L3)
4. Need → Discover → Read → Use → Verify
5. ห้าม full environment scan ทุก request

## Conflict Prevention

| Conflict | Resolution |
| -------- | ---------- |
| coding vs architecture | coding = รายบรรทัด · architecture = layers |
| security vs security-lab | security = ทั่วไป · lab = isolation |
| coding § เดิม vs skill-routing | skill logic อยู่ skill-routing + multi-skill-router |
| obsidian vs core reporting | core = สั้น · obsidian = persist |
| User Rules vs core | User = preference · core = discipline |
| Global vs project | ห้าม copy project → global อัตโนมัติ |
| user-*.mdc vs User Rules | ลบ user-*.mdc · ใช้ Cursor Settings |

## Maintenance

### เพิ่ม Rule

1. กำหนด category + scope + trigger
2. สร้างใน `cursor-rules/global/` หรือ `cursor-rules/project/<name>/`
3. ตั้ง `alwaysApply` / `globs` — **ห้าม** default alwaysApply
4. `bash scripts/install-cursor-rules.sh`
5. อัปเดตไฟล์นี้ + `Work Log.md` + `Catalog.md`

### แก้ Rule

แก้ที่ `cursor-rules/` แล้วรัน install — อย่าแก้แค่ `.cursor/rules/` โดยไม่ sync

### ลบ Rule

ลบจาก SSOT + install script deprecated list + อัปเดต docs

## Verification

```bash
# SSOT
ls cursor-rules/global/
ls cursor-rules/project/supersix-monorepo/

# หลัง install
ls -la ~/.cursor/rules/
ls -la .cursor/rules/

# multi-skill
test -f .cursor/skills/REGISTRY.md && echo REGISTRY OK
find .cursor/skills -name SKILL.md | wc -l   # expect 10

bash scripts/install-cursor-rules.sh
```

**Checklist:**

- [x] ทุก Rule มี scope (frontmatter + body)
- [x] ไม่มี `user-*.mdc` ใน `.cursor/rules/`
- [x] `alwaysApply: true` เฉพาะ core + obsidian-work-log + multi-skill-router
- [x] Project rules ไม่ถูก promote เป็น global โดยอัตโนมัติ
- [x] REGISTRY ครบ 10 project skills
- [x] `install-cursor-rules.sh` พร้อมใช้

## Change Log

### 2026-08-28 — Rule + Scope system redesign (supersix-monorepo)

- **สร้าง SSOT:** `cursor-rules/global/` (7 rules) + `cursor-rules/project/supersix-monorepo/`
- **สร้าง:** `core.mdc`, `skill-routing.mdc` — ย่อ alwaysApply
- **ปรับ:** `coding.mdc` — ตัด skills ซ้ำ · globs · alwaysApply: false
- **ปรับ:** architecture, security, security-lab, obsidian-work-log — globs + Scope/Non-goals/Priority
- **ย้าย:** reverse-skill → `cursor-rules/project/reverse/` (ไม่ติดตั้งใน supersix)
- **ลบ:** `user-*.mdc` ทั้งหมดจาก project deploy
- **รวม:** `ai-skill-obsidian-work-log.mdc` → `obsidian-work-log.mdc`
- **สร้าง:** `scripts/install-cursor-rules.sh`, `AGENTS.md`
- **เอกสาร:** ไฟล์นี้ + อัปเดต Catalog, Install Guide, Work Log

### 2026-08-28 (ก่อนหน้า)

- สร้าง `.cursor/skills/` framework ครั้งแรก
- สร้าง `docs/multi-skill*.md`

## อ้างอิง

- `cursor-rules/README.md`
- `cursor-rules/USER-RULES-REFERENCE.md`
- `docs/multi-skill.md`
- `CLAUDE.md`
