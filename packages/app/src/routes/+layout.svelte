<script lang="ts">
	import { getI18n, provideI18n } from '$lib/i18n';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	provideI18n(() => data.i18n ?? getI18n());
</script>

{@render children()}
