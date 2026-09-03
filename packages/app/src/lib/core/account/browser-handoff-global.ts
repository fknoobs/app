import { fetch as appFetch } from '$core/http/fetch';
import { pocketbase } from '$core/pocketbase';

declare global {
	interface Window {
		__cohCreateHandoffForBrowser?: () => Promise<string>;
	}
}

export function registerBrowserHandoffGlobal(): void {
	window.__cohCreateHandoffForBrowser = async () => {
		if (!pocketbase.authStore.isValid) {
			throw new Error('Not signed in to the desktop app.');
		}

		const payload = await pocketbase.send<{ code?: string }>('/api/auth/handoff', {
			method: 'POST',
			fetch: appFetch
		});

		if (!payload.code?.startsWith('signed-v1.')) {
			throw new Error('Could not create a browser login link.');
		}

		return payload.code;
	};
}
