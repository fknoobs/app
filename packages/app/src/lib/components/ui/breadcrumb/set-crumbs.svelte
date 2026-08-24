<script lang="ts">
	import { useBreadcrumbs, type Crumb } from './crumbs.svelte';

	type Props = {
		items: Crumb[];
	};

	let { items }: Props = $props();
	const breadcrumbs = useBreadcrumbs();

	$effect(() => {
		breadcrumbs.setExtra(items);
		return () => breadcrumbs.setExtra([]);
	});
</script>
