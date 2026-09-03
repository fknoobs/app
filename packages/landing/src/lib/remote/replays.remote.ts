import { command, getRequestEvent } from '$app/server';
import * as v from 'valibot';
import { unwrapAsync } from '$lib/errors/unwrap';

const recordReplayDownloadInput = v.object({
	matchId: v.pipe(v.string(), v.minLength(1)),
	visitorId: v.pipe(v.string(), v.uuid())
});

export const recordReplayDownload = command(recordReplayDownloadInput, ({ matchId, visitorId }) => {
	const { locals, getClientAddress } = getRequestEvent();
	return unwrapAsync(locals.services.replays().download(matchId, visitorId, getClientAddress()));
});
