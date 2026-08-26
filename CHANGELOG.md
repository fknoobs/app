### v0.56.0

- enhance; drop lobby scout details so ELO, level and position scan first
- fix; stretch dashboard hero stats to the avatar square
- enhance; redesign dashboard profile hero as ranked stat grid
- fix; limit dashboard name link to the name itself
- feat; add english i18n for all ui copy
- enhance; flush the current-game map as a square block
- enhance; flush the dashboard hero avatar as a square block
- enhance; flush dashboard form as edge-to-edge blocks
- enhance; flush the history match map as a square block
- enhance; flush the player profile avatar as a square block
- enhance; flush the replay detail map as a square block
- enhance; flush map thumbnails in match list rows
- fix; poll match status on the history detail page instead of a realtime subscription
- feat; add a dedicated language dropdown for switching the app locale
- fix; keep the language select as wide as its options instead of the full page
- enhance; use a details button in live lobby rows instead of a text link
- fix; open lobby and match details with client-side navigation
- fix; keep the selected language when navigating away from settings
- fix; download replays after rename using the updated PocketBase file reference
- fix; add left padding to list map thumbnails
- fix; keep list map thumbnails at row height
- fix; make language select dropdown opaque and match the trigger width
- fix; stop setup from showing a false missing-path error next to a valid file
- feat; add spanish i18n for all ui copy
- feat; add spanish locale and language picker

### v0.55.0

- enhance; add current-game scouting stats in the existing match header and player table
- feat; add player elo history endpoint from lobby results
- feat; add elo history charts per game mode and faction on the performance tab
- enhance; show country flags and ELO on leaderboards
- feat; fill lobby results from Relic match history via cron
- enhance; clarify oppbot overlay update popup wording and use update instead of overwrite
- enhance; apply blue/green/gold elo tiers and elite glow on the oppbot overlay
- fix; color oppbot overlay streaks green when positive and red when negative
- fix; publish oppbot overlay via app fetch so FormData uploads reach PocketBase
- enhance; show elo rating change on other players performance match lists
- enhance; remove status column from match lists and use a compact details button
- enhance; mute recent-match W/L badges until hover
- enhance; show replay ID on the detail page
- feat; rename replays in the .rec file and PocketBase title, and embed Steam IDs into lobby replays when results arrive
- feat; edit, delete, and download replays from the replays list
- enhance; add admin CLI to fully reparse all stored replays after analyzer updates
- enhance; restyle toasts to match app surface panels
- fix; use opaque toast backgrounds so content no longer shows through

### v0.54.1

- enhance; align current game and live lobby pages with flush dashboard layout
- enhance; split lobby player table into allies and axis columns like replay overview
- fix; redirect to current-game from any page when a match starts
- enhance; retint elo colors as blue (low), green (mid), and premium gold (pro) with a soft glow
- enhance; give 2400+ elo an elite luminous gold treatment with stronger glow
- enhance; expand faction and mode performance rows to show matching games
- fix; show elo gained or lost next to ratings on match detail player rows
- fix; keep match history on live lobbies so the stream overlay can show elo again
- enhance; hide duplicate lobby players table on history when a replay is shown and show rank, elo, level, position, wins, losses, and streak on overview rows
- enhance; restyle replay overview player rows with clearer hierarchy and softer cpm
- enhance; link replay overview player names to their profile
- fix; matches played today find lobbies by user steamIds in players/result when lobbyPlayers is empty
- fix; stop wiping lobbyPlayers on lobby save when players fail to parse; repair empty lobbyPlayers rows

### v0.54.0

- fix; batch steam profile lookups so match lists no longer flood the api with failing requests
- enhance; replace page titles with breadcrumbs and align routes with the flush dashboard layout
- fix; lay out history and replay filter toolbars in a single horizontal strip
- fix; align performance tables with dashboard padding and match-list column rhythm
- fix; lay out replay filters like the history toolbar
- fix; share DataTable chrome across match lists, performance, and recent games
- enhance; use p-4 padding on dashboard sections and tables
- fix; tighten performance stat column spacing
- enhance; move tracked performance summary into dashboard profile header alongside steam id and created date
- enhance; align player profile page layout with dashboard profile widget
- enhance; redesign keybindings page with compact key caps and chord recorder fields
- fix; allow saving, cancelling, and restoring keybinding recordings
- enhance; align leaderboards page with flush layout and inline podium stats
- enhance; align players search page with flush dashboard layout
- enhance; restore global back button in header to return with page snapshot state
- enhance; align match history detail page with flush dashboard layout
- fix; remove stacked borders between match detail sections
- enhance; align replay detail page with flush dashboard layout
- enhance; redesign replay overview player grid with team headers and compact rows
- enhance; highlight replay CPM values with prominent gold badges
- enhance; align match history detail player list and replay tabs with dashboard layout
- fix; pair detail metadata in one grid so labels align across columns
- enhance; move download replay button below match detail metadata
- enhance; align replay chat tab with flush dashboard layout
- enhance; add subtle background to replay chat message area
- enhance; align replay timeline tab with flush dashboard layout
- enhance; align twitch settings page with flush dashboard layout
- enhance; align personal voices settings with flush dashboard layout
- enhance; highlight the logged-in player in gold across lobby and match player lists
- enhance; show a larger map thumbnail on match history detail
- enhance; show a larger profile avatar on the dashboard hero and player profile page
- enhance; split performance tab into collapsible colored sections for maps, factions, and modes
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
- improvement; player profile loading skeleton matches layout with shimmer animation
- improvement; dashboard profile widget uses matching profile skeleton while loading
- fix; show session id on Relic match history cards, not the history table
- enhance; stop storing opponent match history inside saved lobbies, which shrinks the database and speeds up every match query
- enhance; aggregate the performance tab entirely in the match index so it no longer scans the lobby table
- fix; keep backfill progress across restarts so the batch jobs finish instead of restarting from the first page
- fix; spread the batch jobs over separate minutes so they no longer all write in the same minute
- enhance; only load the performance tab once its panel is opened
- enhance; show live lobby start time instead of last update
- fix; fire `game.lobby.joined` and `game.lobby.started` only once per match
- fix; matches played today resolve participation from the logged-in user steamIds via lobby_player_index

### v0.53.2

- feat; update overlay to reflect ELO changes

### v0.53.1

- fix; apply ELO rating colors on match history detail page
- enhance; store ELO for match-history opponents from Relic history
- feat; link player match history to saved matches with view details
- enhance; show session id next to the date on match history

### v0.53.0

- feat; extend player card
- enhance; treat 2400+ ELO as legendary
- feat; color ELO ratings by skill tier in stats and oppbot overlay
- feat; highlight smurf accounts next to player names

### v0.52.11

- feat; add 'oppbot has a new version' modal. For devs or players that changed the oppbot code, just bump the version to a high number so that the dialog will not appear anymore
- fix; oppbot overlay had visual bugs in certain conditions

### v0.52.10

- feat; add faction filter to filter by faction in match history
- fix; some live lobby matches were stale
- fix; matched played today showed incorrect results
- improvement; swap ELO and Ranking in oppbot overlay

### v0.52.9

- fix; previous version broke the 'matches played today' widget

### v0.52.8

- fix; matches played today only showed matches that were created by logged in user, making some matches not showing up in the widget
- fix; some replays causing out of bounds error
- feat; add live lobby details page, to view more details about a live lobby
- fix; some minor issues we observed throughout the app
- fix; live lobbies only created for lobby owner, causing oppbot overlay to not work for the other players in the lobby

### v0.52.7

- fix; missing import causing app to not load properly on fresh installs
- fix; window lagging while dragging on certain windows versions

### v0.52.6

- fix; bring back the websocket events, that were removed in a previous version

### v0.52.5

- feat; add markdown support in notification popup
- fix; clicking 'view details' from match history widget results into a crash

### v0.52.4

- enhance; edited the default oppbot overlay design a bit

### v0.52.3

- fix; some minor UI tweaks throughout the app
- fix; some minor issues in the oppbot overlay
- fix; show player ELO, rank icon and position in live lobbies widget
- fix; increase performance on history page
- fix; automatically publish oppbot overlay to remote server

### v0.52.2

- feat; add opponent bot route

### v0.52.1

- feat; oppbot overlay will now use a remote server, this will make it more reliable. Make sure the app is running when using the overlay!
- fix; fixed some cors errors

### v0.52.0

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

### v0.51.1

> If you have two apps installed after this update, just delete the old one, called Company of Heroes - Companion app

- fix; rename app again, since Company of Heroes is trademarked in the microsoft store

### v0.51.0

- change app name to be compliant with microsoft store rules
- Publish new websocket topic game.lobby.joined, can be used to do things when loading into a game
- fix; make it possible to remap arrow keys
- Disable the hotkeys when chatting and resume when chat closed
- Fix error where app would hang while trying to view a replay
- Increase perfomance of the history page
- Tweak keybindings page UI
- Fix some annoyances and issues

### v0.50.2

> In the next release the app will be available to download from the microsoft store!

- fix; change app name to be compliant with microsoft store rules

### v0.50.1

- fix; make it possible to remap arrow keys

### v0.50.0

> This release is a full rewrite of the app's internals. The UI stays the same, the foundation is new.

- feat; **setup wizard**: the app now guides you through selecting your `warnings.log` and Company of Heroes installation folder on first start (with auto-detection) and blocks until both are valid — no more silently broken installs
- feat; **automatic external backups**: your settings _and account_ are continuously backed up to `Documents\FKnoobs CoH\backups`. Updating the app — even when choosing "remove all data" — no longer loses your account; the app restores it automatically
- feat; **comments on matches**: leave comments, reply and like/dislike on any match detail page
- feat; settings import/export rewritten: exports are versioned, imports are validated first and applied instantly (no restart), and a safety backup is written before every import
- feat; settings are migrated automatically from the old format; nothing is lost on update
- enhance; game log watching rewritten: only new log lines are read, and restarting the game (which truncates warnings.log) is now detected correctly
- enhance; Twitch connection lifecycle rewritten: reconnecting or changing tokens can no longer cause duplicated chat/TTS messages
- enhance; match result fetching only polls while results are actually pending (with backoff) instead of every 5 seconds forever
- enhance; local websocket connection now reconnects automatically
- remove; the Chat section has been removed
- chore; the new core logic is covered by an automated test suite

### v0.45.0

- feat; add new _freevoices feature_ for TTS. When enabled, viewers can choose out of a list of free TTS voices, that do not need channel points.
  Two new chat commands are added for this feature, `!freevoices` and `!setfreevoice`
- feat; publish new websocket topic `game.lobby.joined`, can be used to do things when loading into a game
- fix; selection modal rendering outside viewport when inside another model / dialog
- fix; when closing the game, stop analyzing log file

### v0.44.0

- feat; disable the hotkeys when chatting and resume when chat closed
- fix; app hanging / crashing while trying to view a replay
- enhance; increase perfomance of the history page
- enhance; keybindings page UI

### v0.43.4

- fix; current game page not properly updating data when a new game started
- feat; redirect to match history record after finishing lobby
- fix; a memory leak, caused by a wrong filter query
- fix; an issue where realtime data didn't propagate properly throught the component tree

### v0.43.3

- fix; reverted a change that broke the replays page

### v0.43.2

- fix; restore state after nagivating on current game page
- fix; some small overal fixes

### v0.43.1

- fix; match result not saved because of a previous change determining the playback dir

### v0.43.0

- fix; new messages not being displayed because of wrong sort order
- fix; for some players the replay was not attached to the game result
- fix; filtering by players broken because of changes in previous version
- feat; ability to restore account if app was previously installed

### v0.42.1

- enhance; warn about to not uninstall the old version if windows asks for it.

### v0.42.0

- enhance; reworked match history
- enhance; current game widget overhaul, now shows better and more info on dedicated page.
- fix; players with same name would get merged, now uses player ID instead of name
- feat; add code signing certificate! 🎉

### v0.41.0

> If this update causes issues, please downgrade, or upgrade to latest version

- feat; Enhanced replay parser to show comprehensive replay data, matching! 🎉
- feat; Reworked and simplified the core application logic
- feat; Added a command allowing Twitch subscribers to change their voice in real-time
- feat; Restricted ElevenLabs message tags to Twitch subscribers only
- feat; Show more usefull info per match in the user and community matches
- fix; Restored StreamElements TTS functionality by updating authentication to match new API requirements
- feat; Automatically fetch default username and avatar from connected Steam profile if not set
- fix; Resolved an issue where match history only displayed matches created by the user, omitting matches where they were a participant

### v0.40.1

- patch; Reduced padding in chat messages for a more compact view
- fix; Prevented the "Current Game" widget from losing state during navigation
- fix; Ensured the "Current Game" widget is cleanly destroyed when the lobby is closed

### v0.40.0

_This update addresses an issue where large Steam IDs were parsed incorrectly, preventing user profiles from loading on the dashboard._

- feat; Introduced a changelog to keep users informed about version updates
- fix; Corrected data handling in the "Current Game" widget
- fix; Fixed a bug that prevented user profiles from appearing on the dashboard

### v0.39.1

- patch; Updated ElevenLabs model to v3
- tweak; Refined minor UI elements in the ElevenLabs settings
- fix; Replaced logging plugin with standard console output for better stability

### v0.39.0

- feat; Added a new chatroom feature
- feat; Added option to launch app on system startup (with disable toggle)
- fix; Fixed an issue where navigation history was not restoring correctly
