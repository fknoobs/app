import { env } from '$env/dynamic/private';
import type PocketBase from 'pocketbase';
import { errAsync, ok, ResultAsync } from 'neverthrow';
import { appError, fromUnknown, type AppError } from '$lib/errors/app-error';
import { fetchJson } from '$lib/errors/fetch-json';
import { allowReplayFileRequest } from '$lib/utils/rate-limit';
import {
	buildMatchHistoryUrl,
	matchFileUrl,
	type CommunityMatchDetail,
	type CommunityMatchList,
	type HistoryMapOption,
	type ReplaysQuery
} from '$lib/replays';
import { API_URL } from '$lib/site/urls';

export type ReplayFileDownload = {
	body: ReadableStream<Uint8Array>;
	contentType: string;
	filename: string;
};

export class ReplaysService {
	constructor(
		private fetchFn: typeof fetch,
		private pocketbase?: PocketBase
	) {}

	private authHeaders(): Record<string, string> {
		const token = this.pocketbase?.authStore.token;
		if (!token) {
			return {};
		}

		return { Authorization: token };
	}

	getHistory(query: ReplaysQuery, perPage?: number) {
		return fetchJson<CommunityMatchList>(this.fetchFn, buildMatchHistoryUrl(query, perPage), {
			fallback: 'Failed to load community replays. Please try again later.'
		});
	}

	getMaps(): ResultAsync<HistoryMapOption[], AppError> {
		return fetchJson<{ items?: HistoryMapOption[] }>(
			this.fetchFn,
			`${API_URL}/api/history-maps?scope=community&limit=100`,
			{ fallback: 'Failed to load maps.' }
		)
			.map((data) => data.items ?? [])
			.orElse(() => ok([] as HistoryMapOption[]));
	}

	get(id: string) {
		return fetchJson<CommunityMatchDetail>(this.fetchFn, `${API_URL}/api/match/${id}`, {
			fallback: 'Failed to load this replay. Please try again later.',
			init: {
				headers: this.authHeaders()
			},
			onStatus: (status) => {
				if (status === 404) {
					return appError(404, 'That replay is not available.');
				}
			}
		}).andThen((match) => {
			const hasReplay = match.hasReplay ?? Boolean(match.replay);
			const inProgress = match.needsResult === true;
			if (!hasReplay && !inProgress) {
				return errAsync(appError(404, 'That replay is not available.'));
			}

			return ok({
				...match,
				hasReplay,
				needsResult: inProgress
			});
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
			const fileUrl = matchFileUrl(match);
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

	download(id: string, visitorId: string, clientIp: string) {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			'X-Download-Visitor': visitorId,
			'X-Client-IP': clientIp
		};
		const secret = env.REPLAY_PROXY_SECRET;
		if (secret) {
			headers['X-Replay-Proxy'] = secret;
		}

		return fetchJson<{ counted?: boolean }>(this.fetchFn, `${API_URL}/api/match/${id}/download`, {
			fallback: 'Failed to record replay download.',
			init: {
				method: 'POST',
				headers
			}
		}).map((data) => ({ counted: Boolean(data.counted) }));
	}
}
