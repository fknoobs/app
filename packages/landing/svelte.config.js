import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			platformProxy: {
				configPath: 'wrangler.emulate.toml',
				persist: false
			}
		}),
		prerender: {
			entries: ['/', '/privacy']
		},
		alias: {
			'@assets': '../shared-assets',
			'@tt-mussels': '../app/src/lib/fonts/TT Mussels',
			'@maps': '../app/src/lib/files/maps'
		}
	}
};

export default config;
