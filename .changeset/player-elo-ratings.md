---
'@company-of-heroes/app': patch
'@company-of-heroes/pocketbase': minor
---

feat; harvest match-history ELO ratings for known players via cron
fix; upsert all match-history ELO ratings into player_ratings
fix; restore match-history API helpers after harvest rewrite
enhance; fill missing player ELO from PocketBase matches and teammate Relic history
enhance; make the leaderboard ELO column sortable
fix; read and merge player_ratings elo via SQL fallback when PocketBase json field returns empty
