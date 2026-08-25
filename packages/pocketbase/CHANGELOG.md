# @company-of-heroes/pocketbase

## 0.4.0

- feat; add player elo history endpoint from lobby results
- feat; add elo history charts per game mode and faction on the performance tab
- feat; fill lobby results from Relic match history via cron

## 0.3.1

- enhance; expand faction and mode performance rows to show matching games
- fix; keep match history on live lobbies so the stream overlay can show elo again
- fix; matches played today find lobbies by user steamIds in players/result when lobbyPlayers is empty
- fix; stop wiping lobbyPlayers on lobby save when players fail to parse; repair empty lobbyPlayers rows

## 0.3.0

- fix; speed up local PocketBase startup
- feat; harvest match-history ELO ratings for known players via cron
- fix; upsert all match-history ELO ratings into player_ratings
- fix; restore match-history API helpers after harvest rewrite
- enhance; fill missing player ELO from PocketBase matches and teammate Relic history
- enhance; make the leaderboard ELO column sortable
- fix; read and merge player_ratings elo via SQL fallback when PocketBase json field returns empty
- feat; show tracked winrate by map, faction, and mode on dashboard and player profiles
- feat; close to system tray so match tracking and overlays keep running
- enhance; align performance tab with leaderboard and match history styling; hide skirmish from modes; combine tracked stats across all linked steam accounts; drop the elo trend chart
- enhance; link recent match badges to match details with faction flag and mode tooltips
- enhance; load the performance tab from indexed match stats instead of scanning lobby json on every request
- fix; show the latest matches in the performance recent row, newest first
- enhance; blend performance map tables into the profile widget like stats and live lobbies
- feat; expand map rows inline to show matches and link each row to match history
- fix; group lobby players by team and drop yellow me-row background while keeping primary name color
- fix; ignore invalid country codes in player country flags instead of crashing display names
- enhance; stop storing opponent match history inside saved lobbies, which shrinks the database and speeds up every match query
- enhance; aggregate the performance tab entirely in the match index so it no longer scans the lobby table
- fix; keep backfill progress across restarts so the batch jobs finish instead of restarting from the first page
- fix; spread the batch jobs over separate minutes so they no longer all write in the same minute
- enhance; only load the performance tab once its panel is opened
- fix; matches played today resolve participation from the logged-in user steamIds via lobby_player_index

## 0.2.10

- feat; update overlay to reflect ELO changes

## 0.2.9

- feat; link player match history to saved matches with view details

## 0.2.8

- feat; extend player card

## 0.2.7

- feat; add 'oppbot has a new version' modal. For devs or players that changed the oppbot code, just bump the version to a high number so that the dialog will not appear anymore
- fix; oppbot overlay had visual bugs in certain conditions

## 0.2.6

- feat; add faction filter to filter by faction in match history

## 0.2.5

- fix; previous version broke the 'matches played today' widget

## 0.2.4

- fix worker

## 0.2.3

- fix; clicking 'view details' from match history widget results into a crash

## 0.2.2

- enhance; edited the default oppbot overlay design a bit

## 0.2.1

- fix; some minor UI tweaks throughout the app
- fix; some minor issues in the oppbot overlay
- fix; increase performance on history page
- fix; panic error caused by incorrect null reference

## 0.2.0

- fix; release only on changeset version changes
- security; fixed a leak, where users could potentially upgrade their role to administrative roles
