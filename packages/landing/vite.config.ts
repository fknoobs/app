import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import { fileURLToPath } from 'node:url';

const landingRoot = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
	plugins: [sveltekit(), tailwindcss()],
	ssr: {
		noExternal: ['bits-ui', 'layerchart', '@svelte-i18n/core', '@company-of-heroes/i18n']
	},
	server: {
		port: 5174,
		fs: {
			allow: [
				searchForWorkspaceRoot(landingRoot),
				repoRoot,
				'../app/src/lib/fonts',
				'../app/src/lib/files/maps'
			]
		}
	}
});
