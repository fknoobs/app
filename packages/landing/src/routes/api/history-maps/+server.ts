import { API_URL } from '$lib/site/urls';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const params = new URLSearchParams({
		scope: 'community',
		q: url.searchParams.get('q') || '',
		limit: url.searchParams.get('limit') || '100'
	});
	const response = await fetch(`${API_URL}/api/history-maps?${params.toString()}`);
	return new Response(response.body, {
		status: response.status,
		headers: {
			'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
			'Cache-Control': 'public, max-age=60'
		}
	});
};
