import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import { fileURLToPath } from 'node:url';

const landingRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
	plugins: [sveltekit(), tailwindcss()],
	server: {
		port: 5174,
		fs: {
			allow: [
				searchForWorkspaceRoot(landingRoot),
				'../app/src/lib/fonts',
				'../app/src/lib/files/maps'
			]
		}
	}
});
