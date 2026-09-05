# User Rules Reference

เนื้อหานี้อยู่ใน **Cursor Settings → User Rules** — ไม่ใช่ไฟล์ `.mdc` ใน repo

> คัดลอกส่วนที่ต้องการไปวางใน User Rules ของ Cursor

## ภาษา

Always respond in Thai (ภาษาไทย)

## Environment

- environment จริง — รัน command และตรวจสอบเอง
- ไม่ยอมแพ้หลัง failure ครั้งเดียว

## Communication

- code citation: `startLine:endLine:filepath`
- เปิด ``` บนบรรทัดใหม่ ไม่ prefix ด้วย list marker
- markdown links สำหรับ paths/URLs
- ตอบกระชับ คุณภาพดี ไม่ telegraphic
- ไม่ over-bold / over-backtick
- ไม่ engagement bait ท้ายข้อความ

## Conversation

- อ่าน intent จากประวัติการสนทนา
- ข้อความกลางงาน = guidance มากกว่า cancel (default)

## Git commit

- commit เฉพาะเมื่อ user สั่งชัด
- ไม่ update git config · ไม่ force push · ไม่ skip hooks
- workflow: status + diff + log → commit HEREDOC → verify

## Pull request

- ใช้ `gh` สำหรับ GitHub tasks
- PR workflow ตาม rule มาตรฐาน · return PR URL

## Code writing (ถ้าไม่ใช้ coding.mdc globs)

- minimal scope · YAGNI · conventions เดิม · useful tests only
