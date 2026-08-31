import { env } from '$env/dynamic/private';
import { API_URL } from '$lib/urls';
import type { CommunityMatchDetail } from '$lib/replays';
import { matchFileUrl } from '$lib/replays';
import { allowReplayFileRequest } from '$lib/rate-limit';
import type { RequestHandler } from './$types';

function tooMany(retryAfter: number): Response {
	return new Response('Too many download requests. Try again in a moment.', {
		status: 429,
		headers: {
			'Retry-After': String(retryAfter),
			'Cache-Control': 'no-store'
		}
	});
}

export const GET: RequestHandler = async ({ fetch, params, getClientAddress }) => {
	const clientIp = getClientAddress();
	const limited = allowReplayFileRequest(clientIp);
	if (!limited.ok) return tooMany(limited.retryAfter);

	const response = await fetch(`${API_URL}/api/match/${params.id}`);
	if (response.status === 404) {
		return new Response('Replay not found', { status: 404 });
	}
	if (!response.ok) {
		return new Response('Failed to load replay', { status: 502 });
	}
	const match = (await response.json()) as CommunityMatchDetail;
	const fileUrl = matchFileUrl(match);
	if (!fileUrl) {
		return new Response('Replay not found', { status: 404 });
	}
	const fileHeaders: Record<string, string> = {
		'X-Client-IP': clientIp
	};
	const secret = env.REPLAY_PROXY_SECRET;
	if (secret) fileHeaders['X-Replay-Proxy'] = secret;
	const file = await fetch(fileUrl, { headers: fileHeaders });
	if (file.status === 429) {
		return tooMany(Number(file.headers.get('Retry-After')) || 30);
	}
	if (!file.ok || !file.body) {
		return new Response('Failed to download replay', { status: file.status === 404 ? 404 : 502 });
	}
	const filename = match.replay || `${match.id}.rec`;
	return new Response(file.body, {
		headers: {
			'Content-Type': file.headers.get('Content-Type') ?? 'application/octet-stream',
			'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
