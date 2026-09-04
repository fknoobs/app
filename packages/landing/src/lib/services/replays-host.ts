import { env } from '$env/dynamic/private';
import {
	matchFileUrl,
	type ReplaysApi,
	type ReplaysQuery
} from '@company-of-heroes/api';
import { errAsync, ok, ResultAsync } from 'neverthrow';
import { appError, fromUnknown, type AppError } from '$lib/errors/app-error';
import { allowReplayFileRequest } from '$lib/utils/rate-limit';

export type ReplayFileDownload = {
	body: ReadableStream<Uint8Array>;
	contentType: string;
	filename: string;
};

/** Landing-only wrapper: api.replays + rate-limited getFile with REPLAY_PROXY_SECRET. */
export class LandingReplaysService {
	constructor(
		private replays: ReplaysApi,
		private fetchFn: typeof fetch,
		private baseUrl: string
	) {}

	getHistory(query: ReplaysQuery, perPage?: number) {
		return this.replays.getHistory(query, perPage);
	}

	getMaps() {
		return this.replays.getMaps();
	}

	get(id: string) {
		return this.replays.get(id);
	}

	download(id: string, visitorId: string, clientIp: string) {
		const secret = env.REPLAY_PROXY_SECRET;
		return this.replays.download(id, {
			visitorId,
			clientIp,
			headers: secret ? { 'X-Replay-Proxy': secret } : undefined
		});
	}

	getFile(id: string, clientIp: string): ResultAsync<ReplayFileDownload, AppError> {
		const limited = allowReplayFileRequest(clientIp);
		if (!limited.ok) {
			return errAsync(
				appError(429, 'Too many download requests. Try again in a moment.', {
					retryAfter: limited.retryAfter
				})
			);
		}

		return this.get(id).andThen((match) => {
			const fileUrl = matchFileUrl(this.baseUrl, match);
			if (!fileUrl) {
				return errAsync(appError(404, 'Replay not found'));
			}

			const fileHeaders: Record<string, string> = {
				'X-Client-IP': clientIp
			};
			const secret = env.REPLAY_PROXY_SECRET;
			if (secret) {
				fileHeaders['X-Replay-Proxy'] = secret;
			}

			return ResultAsync.fromPromise(this.fetchFn(fileUrl, { headers: fileHeaders }), (error) =>
				fromUnknown(error, 'Failed to download replay')
			).andThen((file) => {
				if (file.status === 429) {
					return errAsync(
						appError(429, 'Too many download requests. Try again in a moment.', {
							retryAfter: Number(file.headers.get('Retry-After')) || 30
						})
					);
				}

				if (!file.ok || !file.body) {
					return errAsync(
						appError(
							file.status === 404 ? 404 : 502,
							file.status === 404 ? 'Replay not found' : 'Failed to download replay'
						)
					);
				}

				return ok({
					body: file.body,
					contentType: file.headers.get('Content-Type') ?? 'application/octet-stream',
					filename: match.replay || `${match.id}.rec`
				});
			});
		});
	}
}
