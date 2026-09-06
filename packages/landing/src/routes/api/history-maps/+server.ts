import { API_URL } from '$lib/site/urls';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const scope = url.searchParams.get('scope') === 'user' ? 'user' : 'community';
	const params = new URLSearchParams({
		scope,
		q: url.searchParams.get('q') || '',
		limit: url.searchParams.get('limit') || '100'
	});
	const userId = url.searchParams.get('userId');
	if (scope === 'user' && userId) {
		params.set('userId', userId);
	}

	const response = await fetch(`${API_URL}/api/history-maps?${params.toString()}`);
	return new Response(response.body, {
		status: response.status,
		headers: {
			'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
			'Cache-Control': scope === 'community' ? 'public, max-age=60' : 'private, max-age=30'
		}
	});
};
