<script lang="ts">
	import { Leaderboard } from '$lib/components/leaderboard';
	import { useProfile } from '.';
	import { getPlayerRating } from '$core/pocketbase/player-ratings';
	import { resource } from 'runed';

	const profile = useProfile();
	const storedRating = resource(
		() => profile.steam.steamid,
		(steamId) => getPlayerRating(steamId)
	);
</script>

<Leaderboard stats={profile.relic.leaderboardStats!} elo={storedRating.current?.elo ?? {}} />
