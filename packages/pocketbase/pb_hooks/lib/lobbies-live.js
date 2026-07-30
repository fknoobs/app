'use strict';

/**
 * Drop orphaned rows when the game exits without a DESTROYED log (Alt+F4 / Exit to Windows).
 * Keep in sync with packages/app/.../lobbies-live.ts LOBBIES_LIVE_STALE_MS
 */
const LOBBIES_LIVE_STALE_MS = 30 * 60 * 1000;

module.exports = {
	LOBBIES_LIVE_STALE_MS
};
