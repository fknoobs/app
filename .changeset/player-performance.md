---
'@company-of-heroes/app': minor
'@company-of-heroes/pocketbase': patch
---

feat; show tracked winrate by map, faction, and mode on dashboard and player profiles
feat; close to system tray so match tracking and overlays keep running
enhance; align performance tab with leaderboard and match history styling; hide skirmish from modes; combine tracked stats across all linked steam accounts; drop the elo trend chart
enhance; link recent match badges to match details with faction flag and mode tooltips
enhance; load the performance tab from indexed match stats instead of scanning lobby json on every request
fix; show the latest matches in the performance recent row, newest first
enhance; blend performance map tables into the profile widget like stats and live lobbies
feat; expand map rows inline to show matches and link each row to match history
fix; group lobby players by team and drop yellow me-row background while keeping primary name color
fix; ignore invalid country codes in player country flags instead of crashing display names
