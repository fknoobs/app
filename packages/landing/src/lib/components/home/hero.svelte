<script lang="ts">
	import { Button } from '@company-of-heroes/ui/button';
	import DiscordMenu from '$lib/components/layout/discord-menu.svelte';
	import { latestDownload } from '$lib/site/download.svelte';
	import { GITHUB_URL, TWITCH_URL } from '$lib/site/urls';
	import { cn } from '$lib/utils/cn';
	import { interactive } from '$lib/utils/variants';
	import DownloadSimpleIcon from 'phosphor-svelte/lib/DownloadSimpleIcon';
	import DiscordLogoIcon from 'phosphor-svelte/lib/DiscordLogoIcon';
	import GithubLogoIcon from 'phosphor-svelte/lib/GithubLogoIcon';
	import GlobeIcon from 'phosphor-svelte/lib/GlobeIcon';
	import ShieldCheckIcon from 'phosphor-svelte/lib/ShieldCheckIcon';
	import TwitchLogoIcon from 'phosphor-svelte/lib/TwitchLogoIcon';
	import { href, useI18n } from '$lib/i18n';

	const { t } = useI18n();
	const inlineLink = cn(
		interactive,
		'text-secondary-300 hover:text-primary underline-offset-2 hover:underline'
	);
	const iconLink = cn(
		interactive,
		'text-secondary-500 hover:text-primary inline-flex size-8 items-center justify-center rounded-md bg-gray-800/40 transition-colors'
	);
</script>

<section class="border-secondary-800 border-b">
	<div class="flex min-w-0 flex-col justify-center px-6 py-8">
		<p class="text-primary mb-2 text-xs font-medium">{t('Company of Heroes - Companion app')}</p>
		<h1 class="font-heading text-3xl font-bold text-white sm:text-4xl">
			{t('Player stats, live lobbies, and community replays')}
		</h1>
		<p class="text-secondary-400 mt-3 max-w-2xl text-sm leading-relaxed">
			{t(
				'Look up Relic ranks, browse community match history, and see which companion users are in a game — plus a free desktop companion for scouting, overlays, and fair play.'
			)}
		</p>
		<div class="mt-5 flex flex-wrap items-center gap-3">
			<Button href={latestDownload.url} download={latestDownload.fileName} variant="primary">
				<DownloadSimpleIcon size={18} weight="duotone" />
				{t('Download app')}
			</Button>
			<DiscordMenu
				class={cn(
					'inline-flex h-9 items-center justify-center gap-2 rounded-md border px-6 text-base transition-colors duration-150',
					'border-secondary-600 bg-secondary-800 hover:border-secondary-500 hover:bg-secondary-700 text-white'
				)}
			>
				<DiscordLogoIcon size={18} weight="duotone" />
				{t('Join Discord')}
			</DiscordMenu>
		</div>
		<div class="mt-6 max-w-2xl">
			<p class="text-secondary-500 flex gap-2 text-sm leading-relaxed">
				<ShieldCheckIcon class="text-primary mt-0.5 size-4 shrink-0" weight="duotone" />
				<span>
					{t(
						'We do not scan your PC or collect personal data — only game and fair-play info. More detail is in our'
					)}
					<a href={href('/privacy')} class={inlineLink}>{t('privacy policy')}</a>.
					{t('The source code is open — you can always review it yourself.')}
				</span>
			</p>
			<p class="text-secondary-500 mt-2 ps-6 text-sm leading-relaxed">
				{t('Windows installs are Authenticode-signed so you can verify the publisher.')}
			</p>
			<div class="mt-3 flex items-center gap-0.5 ps-6">
				<a
					href="https://codeit.ninja"
					class={iconLink}
					target="_blank"
					rel="noopener noreferrer"
					aria-label="codeit.ninja"
					title="codeit.ninja"
				>
					<GlobeIcon class="size-4" weight="duotone" />
				</a>
				<a
					href={GITHUB_URL}
					class={iconLink}
					target="_blank"
					rel="noopener noreferrer"
					aria-label="GitHub"
					title="github.com/fknoobs/app"
				>
					<GithubLogoIcon class="size-4" weight="duotone" />
				</a>
				<a
					href={TWITCH_URL}
					class={iconLink}
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Twitch"
					title="twitch.tv/fknoobscoh"
				>
					<TwitchLogoIcon class="size-4" weight="duotone" />
				</a>
			</div>
		</div>
	</div>
</section>
