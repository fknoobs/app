// Tauri doesn't have a Node.js server to do proper SSR
// so we will use adapter-static to prerender the app (SSG)

import { browser } from '$app/environment';
import { app } from '$lib/state/app.svelte.js';
import { Command } from '@tauri-apps/plugin-shell';

// See: https://v2.tauri.app/start/frontend/sveltekit/ for more info
export const prerender = true;
export const ssr = false;

export const load = async ({ fetch }) => {
	if (!browser) {
		return;
	}

	await app.boot();
	Command.sidecar('binaries/fknoobs').execute();

	const ws = new WebSocket('ws://localhost:55123');

	ws.addEventListener('open', () => {
		console.log('WebSocket connection opened');
	});
};
