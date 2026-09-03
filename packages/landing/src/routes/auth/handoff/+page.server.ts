import { redirect } from '@sveltejs/kit';
import { API_URL } from '$lib/site/urls';
import { localizeHref, safeInternalPath } from '@company-of-heroes/i18n';
import type { PageServerLoad } from './$types';

export const prerender = false;

function decodeHandoffWire(wire: string): string {
	if (wire.startsWith('signed-v1.') || wire.includes('|')) {
		return wire;
	}

	if (/^[a-z0-9]{32}$/.test(wire)) {
		return wire;
	}

	if (wire.length > 40 && /^[A-Za-z0-9_-]+$/.test(wire)) {
		const pad = '='.repeat((4 - (wire.length % 4)) % 4);
		const base64 = wire.replace(/-/g, '+').replace(/_/g, '/') + pad;
		return Buffer.from(base64, 'base64').toString('utf8');
	}

	return wire;
}

export const load: PageServerLoad = async ({ url, locals, fetch }) => {
	const error = url.searchParams.get('error');
	if (error) {
		redirect(303, `${localizeHref('/login', locals.locale)}?error=${encodeURIComponent(error)}`);
	}

	const wireCode = url.searchParams.get('code');
	if (!wireCode) {
		redirect(303, localizeHref('/login', locals.locale));
	}

	const code = decodeHandoffWire(wireCode);

	const response = await fetch(`${API_URL}/api/auth/handoff/exchange`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ code })
	});

	if (!response.ok) {
		let message = locals.t('Invalid or expired login link.');
		try {
			const body = await response.json();
			if (typeof body?.message === 'string' && body.message.trim()) {
				message = body.message;
			}
		} catch {
			// ignore parse errors
		}

		redirect(303, `${localizeHref('/login', locals.locale)}?error=${encodeURIComponent(message)}`);
	}

	const auth = await response.json();
	locals.pocketbase.authStore.save(auth.token, auth.record);

	redirect(303, safeInternalPath(url.searchParams.get('redirect'), locals.locale));
};
