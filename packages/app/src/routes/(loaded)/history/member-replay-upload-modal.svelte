<script lang="ts">
	import {
		UploadForm as ReplayUploadForm,
		PlayerSteamLinks,
		type ReplaySteamLinkPlayer
	} from '@company-of-heroes/ui/replay';
	import { formatDurationSeconds } from '@company-of-heroes/ui/replay/utils';
	import { isValidSteamId } from '@company-of-heroes/api';
	import { api, unwrapApi } from '$core/api';
	import { useI18n } from '$lib/i18n';
	import { app } from '$core/app/context';
	import { getFactionFlagFromRace } from '$lib/utils';
	import { parseReplayAsync } from '$lib/utils/parse-replay-async';
	import { tick } from 'svelte';

	type ReplayPlayerRow = {
		name?: string;
		faction?: string;
		steamId?: string | null;
		id?: number;
	};

	type Props = {
		onDone: (id: string) => void;
		onCancel: () => void;
	};

	let { onDone, onCancel }: Props = $props();
	const { t } = useI18n();

	let title = $state('');
	let description = $state('');
	let fileName = $state<string | null>(null);
	let file = $state<File | null>(null);
	let preview = $state<{
		mapName: string;
		durationLabel: string;
		playerCount: number;
		isRanked: boolean;
	} | null>(null);
	let meta = $state<{
		mapName: string;
		mapFilename: string;
		durationInSeconds: number;
		gameDate: string;
		isRanked: boolean;
		isVpGame: boolean;
		isRandomStart: boolean;
		isHighResources: boolean;
		vpCount: number;
		players: ReplayPlayerRow[];
		messages: unknown;
	} | null>(null);
	let linkedLabels = $state.raw<Record<string, string>>({});
	let error = $state<string | null>(null);
	let busy = $state(false);

	const steamLinkPlayers = $derived.by((): ReplaySteamLinkPlayer[] => {
		const players = meta?.players ?? [];
		return players.map((player, index) => {
			const steamId = player.steamId ? String(player.steamId) : null;
			return {
				key: String(index),
				name: player.name || `Player ${index + 1}`,
				faction: player.faction,
				steamId,
				linkedLabel: steamId ? (linkedLabels[steamId] ?? null) : null
			};
		});
	});

	function raceFromFaction(faction: string) {
		const value = faction.toLowerCase();
		if (value.includes('commonwealth')) {
			return 2;
		}
		if (value.includes('panzer')) {
			return 3;
		}
		if (value.startsWith('axis')) {
			return 1;
		}
		return 0;
	}

	function linkPlayerSteam(key: string, steamId: string | null, label?: string | null) {
		if (!meta) {
			return;
		}

		const index = Number(key);
		if (!Number.isInteger(index) || index < 0 || index >= meta.players.length) {
			return;
		}

		const previous = meta.players[index]?.steamId
			? String(meta.players[index]?.steamId)
			: null;
		const nextPlayers = meta.players.map((player, playerIndex) => {
			if (playerIndex !== index) {
				return player;
			}

			if (!steamId) {
				return { ...player, steamId: undefined };
			}

			return { ...player, steamId: String(steamId) };
		});

		meta = { ...meta, players: nextPlayers };

		if (steamId && label?.trim()) {
			linkedLabels = { ...linkedLabels, [String(steamId)]: label.trim() };
			return;
		}

		if (!steamId && previous) {
			const nextLabels = { ...linkedLabels };
			delete nextLabels[previous];
			linkedLabels = nextLabels;
		}
	}

	async function searchPlayers(query: string) {
		const q = query.trim();
		if (!q) {
			return [];
		}

		try {
			const players = await unwrapApi(api.players.search(q, { requireMatches: true }));
			if (players.length > 0) {
				return players.map((player) => ({
					value: player.steamId,
					label: player.alias || player.steamId,
					avatarUrl: player.avatarUrl || null,
					country: player.country ?? null,
					profileId: player.profileId || null
				}));
			}
		} catch {
			// fall through to raw steam id
		}

		if (isValidSteamId(q)) {
			return [{ value: q, label: q, avatarUrl: null, country: null, profileId: null }];
		}

		return [];
	}

	function resolvePlayerHref(steamId: string, profileId?: number | null) {
		const id = profileId && profileId > 0 ? String(profileId) : steamId;
		return `/players/${id}`;
	}

	function flagImageUrl(country: string | null | undefined): string | null {
		if (!country) {
			return null;
		}

		const region = String(country).trim().toUpperCase();
		if (!/^[A-Z]{2}$/.test(region)) {
			return null;
		}

		return `https://flagsapi.com/${region}/shiny/64.png`;
	}

	function resolveAvatarUrl(url: string): string {
		return url;
	}

	async function onFileChange(next: File | null) {
		error = null;
		preview = null;
		meta = null;
		linkedLabels = {};
		file = next;
		fileName = next?.name ?? null;
		if (!next) {
			return;
		}

		try {
			const buffer = await next.arrayBuffer();
			await tick();
			const { replay: parsed } = await parseReplayAsync(buffer);
			const replay = parsed as {
				duration?: number;
				gameDate?: string;
				highResources?: boolean;
				randomStart?: boolean;
				mapFileName?: string;
				mapName?: string;
				matchType?: string;
				vpGame?: boolean;
				vpCount?: number;
				players?: ReplayPlayerRow[];
				messages?: unknown[];
				playerCount?: number;
				replayName?: string;
			};
			const ranked = replay.matchType?.toLowerCase().includes('automatch') ?? false;
			if (!Array.isArray(replay.players) || replay.players.length === 0) {
				throw new Error('empty-players');
			}
			if (!title.trim() && replay.replayName) {
				title = replay.replayName;
			}
			preview = {
				mapName: replay.mapName || replay.mapFileName || 'Unknown',
				durationLabel: formatDurationSeconds(replay.duration),
				playerCount: replay.playerCount || replay.players?.length || 0,
				isRanked: ranked
			};
			meta = {
				mapName: replay.mapName || 'Unknown',
				mapFilename: replay.mapFileName || replay.mapName || 'Unknown',
				durationInSeconds: replay.duration || 0,
				gameDate: replay.gameDate || '',
				isRanked: ranked,
				isVpGame: Boolean(replay.vpGame),
				isRandomStart: Boolean(replay.randomStart),
				isHighResources: Boolean(replay.highResources),
				vpCount: replay.vpCount || 0,
				players: (replay.players ?? []) as ReplayPlayerRow[],
				messages: replay.messages ?? []
			};
		} catch {
			error = t('Could not parse that replay file.');
			file = null;
			fileName = null;
		}
	}

	async function onSubmit() {
		if (!file || !meta || busy) {
			return;
		}

		busy = true;
		error = null;
		try {
			const uploaded = await unwrapApi(
				api.replays.uploadMember({
					file,
					filename: file.name,
					title: title || '-',
					description,
					mapName: meta.mapName,
					mapFilename: meta.mapFilename,
					durationInSeconds: meta.durationInSeconds,
					gameDate: meta.gameDate || undefined,
					isRanked: meta.isRanked,
					isVpGame: meta.isVpGame,
					isRandomStart: meta.isRandomStart,
					isHighResources: meta.isHighResources,
					vpCount: meta.vpCount,
					players: meta.players,
					messages: meta.messages
				})
			);
			app.toast.success(t('Replay uploaded to Member replays.'));
			onDone(uploaded.id);
		} catch (err) {
			error = err instanceof Error ? err.message : t('Failed to upload replay.');
		} finally {
			busy = false;
		}
	}
</script>

<ReplayUploadForm
	bind:title
	bind:description
	{fileName}
	{preview}
	{busy}
	{error}
	onTitleChange={(value) => (title = value)}
	onDescriptionChange={(value) => (description = value)}
	onFileChange={(next) => void onFileChange(next)}
	{onSubmit}
	{onCancel}
	titleLabel={t('Title')}
	descriptionLabel={t('Description')}
	fileLabel={t('Replay file')}
	dropLabel={t('Drop a .rec file here')}
	browseLabel={t('or click to browse')}
	changeFileLabel={t('Change file')}
	submitLabel={t('Upload')}
	cancelLabel={t('Cancel')}
	mapLabel={t('Map')}
	durationLabel={t('Duration')}
	playersLabel={t('Players')}
	rankedLabel={t('Ranked')}
	hint={t('Upload a Company of Heroes .rec file to share it in Member replays.')}
>
	{#snippet afterDescription()}
		{#if steamLinkPlayers.length > 0}
			<PlayerSteamLinks
				players={steamLinkPlayers}
				onLink={linkPlayerSteam}
				onSearchPlayers={searchPlayers}
				resolveFactionFlag={getFactionFlagFromRace}
				{raceFromFaction}
				{resolveAvatarUrl}
				{flagImageUrl}
				{resolvePlayerHref}
				playersLabel={t('Players')}
				hint={t(
					'Link a Steam account when the replay has no Steam ID so ratings and flags can load.'
				)}
				searchPlaceholder={t('Search player...')}
				linkedLabel={t('Linked')}
				clearLabel={t('Clear')}
				viewProfileLabel={t('View profile')}
				noResultsLabel={t('No results found.')}
				searchingLabel={t('Searching...')}
				class="border-secondary-800 rounded-md border"
			/>
		{/if}
	{/snippet}
</ReplayUploadForm>
