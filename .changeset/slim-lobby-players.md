---
'@company-of-heroes/app': patch
'@company-of-heroes/pocketbase': patch
---

enhance; stop storing opponent match history inside saved lobbies, which shrinks the database and speeds up every match query
enhance; aggregate the performance tab entirely in the match index so it no longer scans the lobby table
fix; keep backfill progress across restarts so the batch jobs finish instead of restarting from the first page
fix; spread the batch jobs over separate minutes so they no longer all write in the same minute
enhance; only load the performance tab once its panel is opened
