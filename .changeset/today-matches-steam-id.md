---
'@company-of-heroes/app': patch
'@company-of-heroes/pocketbase': patch
---

fix; matches played today find lobbies by user steamIds in players/result when lobbyPlayers is empty
fix; stop wiping lobbyPlayers on lobby save when players fail to parse; repair empty lobbyPlayers rows
