declare module '@fknoobs/app' {
	import type { Twitch } from '$lib/modules/twitch/twitch.svelte';
	import type { Replays } from '$lib/modules/replay-manager/replays.svelte';

	interface Modules {
		twitch: typeof Twitch;
		replays: typeof Replays;
	}
}
