# @company-of-heroes/api

## 0.2.0

- feat; management overview to browse, hide, and delete fair-play screenshots
- feat; add member replay uploads with compose preview, ladder-stats snapshots, and per-player Steam ID linking when missing from the .rec
- feat; owners can edit member replay title, description, and Steam links, and soft-delete uploads (hidden from public; retained for staff)
- enhance; drag-and-drop .rec file picker on member replay upload
- fix; parse .rec files in a worker and return slim results (no action dump) so the UI stays responsive
- fix; show personal match history under the replays My matches tab
- fix; speed up replay list filtering and make replay detail navigation feel instant
- feat; share PocketBase and API client logic in @company-of-heroes/api
- fix; detect skirmish (match type 14) for overlay and live lobbies, including cpu race updates
- fix; detect family-share smurfs via Steam only without cohstats
- feat; add Steam OpenID login on the website with PocketBase account find-or-create
