<script lang="ts">
	import WidgetDashboardHero from '$lib/components/widgets/widget-dashboard-hero.svelte';
	import WidgetLiveLobbies from '$lib/components/widgets/widget-live-lobbies.svelte';
	import WidgetLiveStreams from '$lib/components/widgets/widget-live-streams.svelte';
	import WidgetMatchHistory from '$lib/components/widgets/widget-match-history.svelte';
</script>

<div>
	<WidgetDashboardHero />
	<WidgetLiveLobbies />
	<WidgetLiveStreams />
	<WidgetMatchHistory />
</div>
