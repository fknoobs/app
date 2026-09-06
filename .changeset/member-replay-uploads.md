---
'@company-of-heroes/app': minor
'@company-of-heroes/landing': minor
'@company-of-heroes/ui': minor
'@company-of-heroes/api': minor
'@company-of-heroes/pocketbase': minor
'@company-of-heroes/i18n': patch
---

feat; add member replay uploads with compose preview, ladder-stats snapshots, and per-player Steam ID linking when missing from the .rec
feat; owners can edit member replay title, description, and Steam links, and soft-delete uploads (hidden from public; retained for staff)
enhance; drag-and-drop .rec file picker on member replay upload
fix; parse .rec files in a worker and return slim results (no action dump) so the UI stays responsive
