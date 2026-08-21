# @company-of-heroes/app

## 0.53.0

- feat; extend player card
- enhance; treat 2400+ ELO as legendary
- feat; color ELO ratings by skill tier in stats and oppbot overlay
- feat; highlight smurf accounts next to player names

## 0.52.13

- feat; color ELO ratings by skill tier in stats and oppbot overlay
- enhance; treat 2400+ ELO as legendary
- feat; highlight smurf accounts next to player names

## 0.52.12

- feat; extend player card

## 0.52.11

- feat; add 'oppbot has a new version' modal. For devs or players that changed the oppbot code, just bump the version to a high number so that the dialog will not appear anymore
- fix; oppbot overlay had visual bugs in certain conditions

## 0.52.10

- feat; add faction filter to filter by faction in match history
- fix; some live lobby matches were stale
- fix; matched played today showed incorrect results
- improvement; swap ELO and Ranking in oppbot overlay

## 0.52.9

- fix; previous version broke the 'matches played today' widget

## 0.52.8

- fix; matches played today only showed matches that were created by logged in user, making some matches not showing up in the widget
- fix; some replays causing out of bounds error
- feat; add live lobby details page, to view more details about a live lobby
- fix; some minor issues we observed throughout the app
- fix; live lobbies only created for lobby owner, causing oppbot overlay to not work for the other players in the lobby

## 0.52.7

- fix; missing import causing app to not load properly on fresh installs

## 0.52.6

- fix; bring back the websocket events, that were removed in a previous version

## 0.52.5

- feat; add markdown support in notification popup
- fix; clicking 'view details' from match history widget results into a crash

## 0.52.4

- enhance; edited the default oppbot overlay design a bit

## 0.52.3

- fix; some minor UI tweaks throughout the app
- fix; some minor issues in the oppbot overlay
- fix; show player ELO, rank icon and position in live lobbies widget
- fix; increase performance on history page
- fix; automatically publish oppbot overlay to remote server

## 0.52.2

- feat; add opponent bot route

## 0.52.1

- feat; oppbot overlay will now use a remote server, this will make it more reliable. Make sure the app is running when using the overlay!
- fix; fixed some cors errors

## 0.52.0

- feat; pagination supports now specifying a page number
- fix; reverse some changes, to prepare for Microsoft Store release
- feat; redesigned the page displaying the active game to be more consistent with rest of the app
- feat; add replay data directly to match history
- enhance; show loading indicators on replay data
- feat; add new players page, where you can search and find CoH player profiles and stats
- feat; add live lobbies, to generate better overlays and increase perfomance on some areas of the app
- feat; add notifications
- enhance; increased performance of history page
- feat; chat messages can now be translated to specified language, E.G. nl, en, ar. You can specify the language to translate in in the language box
- fix; hotkeys were still active after a when not in an active lobby
- security; fixed a leak, where users could potentially upgrade their role to administrative roles
- feat; redesigned dashboard
- fix; remove lobby on lobby destroyed event

## 0.51.1

- > If you have two apps installed after this update, just delete the old one, called Company of Heroes - Companion app
- fix; rename app again, since Company of Heroes is trademarked in the microsoft store

## 0.51.0

- change app name to be compliant with microsoft store rules
- Publish new websocket topic game.lobby.joined, can be used to do things when loading into a game
- fix; make it possible to remap arrow keys
- Disable the hotkeys when chatting and resume when chat closed
- Fix error where app would hang while trying to view a replay
- Increase perfomance of the history page
- Tweak keybindings page UI
- Fix some annoyances and issues
