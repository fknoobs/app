<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import type { TransformedMatch } from '@fknoobs/app';
	import type { MatchExpanded } from '$core/app/database/matches';
	import {
		Overview,
		type CommunityMatchDetail,
		type CommunityPlayer,
		type ReplayData,
		type ReplayPlayer
	} from '@company-of-heroes/ui/replay';
	import type { LiveLobbyPlayer } from '@company-of-heroes/ui/live-lobby';
	import { useReplay } from '.';
	import * as PlayerUi from '$lib/components/player';
	import DoctrineAir from '$lib/files/ct_branchbanner_top_allied_airborne.png?url';
	import DoctrineArmored from '$lib/files/ct_branchbanner_top_allied_armor.png?url';
	import DoctrineInfantry from '$lib/files/ct_branchbanner_top_allied_infantry.png?url';
	import DoctrineBlitz from '$lib/files/ct_branchbanner_top_axis_blitz.png?url';
	import DoctrineTerror from '$lib/files/ct_branchbanner_top_axis_terror.png?url';
	import DoctrineDefense from '$lib/files/ct_branchbanner_top_axis_defense.png?url';
	import DoctrineCwAir from '$lib/files/ct_branchbanner_top_cmnw_airborne.png?url';
	import DoctrineCwArmor from '$lib/files/ct_branchbanner_top_cmnw_armor.png?url';
	import DoctrineCwInfantry from '$lib/files/ct_branchbanner_top_cmnw_infantry.png?url';
	import DoctrineLuft from '$lib/files/ct_branchbanner_top_pnze_00.png?url';
	import DoctrineSector from '$lib/files/ct_branchbanner_top_pnze_01.png?url';
	import DoctrineTank from '$lib/files/ct_branchbanner_top_pnze_02.png?url';
	import { cn, getFactionFlagFromRace, getRankImage } from '$lib/utils';
	import { isMeReplayAlias } from '$lib/utils/player-me';
	import { getLeaderboardStatsForPlayerByMatchType, getPlayerEloFromMatchHistory } from '$lib/utils/game';
	import {
		getLiveLobbyMatchType,
		getPlayerAlias,
		getPlayerProfileId
	} from '$lib/components/widgets/dashboard-utils';
	import { getCountryDisplayName } from '$lib/components/leaderboard/leaderboard-utils';
	import { loadCheaterSteamIds } from '$core/pocketbase/anti-cheat';
	import {
		likeCountForSteamId,
		preloadPlayerLikeCounts
	} from '$core/pocketbase/player-vote-cache.svelte';
	import { resource } from 'runed';
	import { useI18n } from '$lib/i18n';
	import { formatStreak } from '@company-of-heroes/ui/variants';

	type Props = {} & HTMLAttributes<HTMLDivElement> & {
		flush?: boolean;
		match?: MatchExpanded | null;
	};

	let { flush = false, match = null, class: className, ...restProps }: Props = $props();
	const { t } = useI18n();
	const replay = $derived(useReplay());

	const result = $derived((match?.result as TransformedMatch | null | undefined) ?? null);
	const matchType = $derived(
		result?.matchtype_id ?? getLiveLobbyMatchType(match?.players ?? [], match?.isRanked ?? false)
	);
	const cheaters = resource(
		() => (match?.players ?? []).map((player) => player.steamId).filter(Boolean).join(','),
		(key) => loadCheaterSteamIds(key ? key.split(',') : [])
	);

	$effect(() => {
		const ids = (match?.players ?? []).map((player) => player.steamId).filter(Boolean) as string[];
		if (ids.length > 0) {
			preloadPlayerLikeCounts(ids);
		}
	});

	const overviewMatch = $derived.by((): CommunityMatchDetail => {
		const players: CommunityPlayer[] = (match?.players ?? []).map((player) => {
			const profileId = getPlayerProfileId(player) ?? 0;
			return {
				playerId: player.playerId ?? null,
				steamId: player.steamId ?? null,
				race: player.race ?? null,
				likeCount: likeCountForSteamId(player.steamId) ?? undefined,
				profile: {
					profile_id: profileId,
					alias: getPlayerAlias(player)
				}
			};
		});

		return {
			id: match?.id ?? '',
			map: match?.map ?? '',
			isRanked: !!match?.isRanked,
			createdAt: match?.created ?? '',
			durationSeconds: null,
			likeCount: match?.likeCount ?? 0,
			downloadCount: match?.downloadCount ?? 0,
			players,
			result: result ?? null
		};
	});

	const livePlayers = $derived.by((): LiveLobbyPlayer[] => {
		return (match?.players ?? []).map((player, index) => {
			const profileId = getPlayerProfileId(player) ?? null;
			const statsRow = getLeaderboardStatsForPlayerByMatchType(matchType, player);
			const country = player.profile?.country || null;
			const elo = getPlayerEloFromMatchHistory(matchType, player);
			return {
				index: player.index ?? index,
				playerId: player.playerId,
				type: player.type,
				race: player.race,
				alias: getPlayerAlias(player),
				profileId: profileId != null && profileId > 0 ? profileId : null,
				steamId: player.steamId ?? null,
				country,
				likeCount: likeCountForSteamId(player.steamId) ?? undefined,
				stats:
					statsRow || elo != null
						? {
								elo,
								wins: statsRow?.wins ?? 0,
								losses: statsRow?.losses ?? 0,
								streak: statsRow?.streak ?? 0,
								rank: statsRow?.rank ?? 0,
								rankLevel: statsRow?.ranklevel ?? 0
							}
						: null
			};
		});
	});

	const replayData = $derived(replay as unknown as ReplayData);

	function doctrineBannerUrl(player: ReplayPlayer & { doctrine?: number }): string | null {
		const doctrine = player.doctrine;
		if (doctrine == null) return null;
		if (player.faction.startsWith('allies')) {
			switch (doctrine) {
				case 2:
					return DoctrineAir;
				case 9:
					return DoctrineArmored;
				case 17:
					return DoctrineInfantry;
				case 316:
					return DoctrineCwInfantry;
				case 323:
					return DoctrineCwAir;
				case 330:
					return DoctrineCwArmor;
				default:
					return null;
			}
		}

		switch (doctrine) {
			case 186:
				return DoctrineBlitz;
			case 194:
				return DoctrineDefense;
			case 265:
				return DoctrineTerror;
			case 295:
				return DoctrineLuft;
			case 302:
				return DoctrineSector;
			case 309:
				return DoctrineTank;
			default:
				return null;
		}
	}

	function raceFromReplayFaction(faction: string): number {
		const value = faction.toLowerCase();
		if (value.includes('commonwealth')) return 2;
		if (value.includes('panzer')) return 3;
		if (value.startsWith('axis')) return 1;
		return 0;
	}

	function resolveFactionFlag(raceId: number): string {
		return getFactionFlagFromRace(raceId);
	}

	function flagImageUrl(country: string | null | undefined): string | null {
		if (!country) return null;
		const region = String(country).trim().toUpperCase();
		if (!/^[A-Z]{2}$/.test(region)) return null;
		return `https://flagsapi.com/${region}/shiny/64.png`;
	}

	function playerHref(player: CommunityPlayer): string | null {
		const id = player.profile.profile_id;
		return id > 0 ? `/players/${id}` : null;
	}

	function playerCpm(data: ReplayData, playerId: number | null): string {
		if (playerId == null) return '0';
		const durationMinutes = data.duration / 60;
		if (durationMinutes <= 0) return '0';
		const actions = data.actions.filter((action) => action.playerID === playerId);
		const takeoverIndex = actions.findIndex((action) => action.command?.type === 'AI_TAKEOVER') + 1;
		const counted = takeoverIndex > 0 ? actions.slice(0, takeoverIndex) : actions;
		return (counted.length / durationMinutes).toFixed(0);
	}
</script>

{#snippet nameExtra(args: { name: string; steamId: string | null; profileId: number | null })}
	{@const lobbyPlayer = (match?.players ?? []).find((player) => {
		if (args.profileId != null && getPlayerProfileId(player) === args.profileId) return true;
		if (args.steamId && player.steamId === args.steamId) return true;
		return getPlayerAlias(player).trim().toLowerCase() === args.name.trim().toLowerCase();
	})}
	{#if lobbyPlayer}
		<PlayerUi.Root player={lobbyPlayer} race={lobbyPlayer.race}>
			<PlayerUi.Labels steamId={lobbyPlayer.steamId} class="shrink-0" />
			{#if lobbyPlayer.steamId && cheaters.current?.has(lobbyPlayer.steamId)}
				<PlayerUi.CheaterAlert compact />
			{/if}
		</PlayerUi.Root>
	{/if}
{/snippet}

<div
	{...restProps}
	class={cn(flush ? undefined : 'border-secondary-800 overflow-clip rounded-lg border', className)}
>
	<Overview
		match={overviewMatch}
		replay={replayData}
		{livePlayers}
		{playerHref}
		{flagImageUrl}
		{getCountryDisplayName}
		{resolveFactionFlag}
		{raceFromReplayFaction}
		doctrineBannerUrl={doctrineBannerUrl}
		{playerCpm}
		formatStreakLabel={formatStreak}
		getRankImage={getRankImage}
		levelLabel={t('Lv')}
		alliesLabel={t('Allies')}
		axisLabel={t('Axis')}
		unknownDoctrineLabel={t('Unknown doctrine')}
		ratingLabel={t('Rating')}
		cpmLabel={t('CPM')}
		isHighlightedName={isMeReplayAlias}
		{nameExtra}
	/>
</div>
