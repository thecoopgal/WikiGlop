<script lang="ts">
	import { browser } from '$app/environment';
	import { applyGloopglopTheme } from '$lib/client/gloopglop-theme';
	import { initThemePreference, subscribeThemePreference } from '$lib/client/theme-preference';
	import { isGloopglopSite } from '$lib/daisy-theme-colors';
	import type { ResolvedSite } from '$lib/server/sites';
	import { onMount } from 'svelte';

	type Props = {
		site: ResolvedSite | null | undefined;
	};

	let { site }: Props = $props();

	const gloopglop = $derived(isGloopglopSite(site));

	$effect(() => {
		if (!browser) return;
		applyGloopglopTheme(gloopglop);
	});

	$effect(() => {
		if (!browser || !gloopglop) return;
		return subscribeThemePreference(() => applyGloopglopTheme(true));
	});

	onMount(() => {
		if (!browser) return () => {};
		return initThemePreference();
	});
</script>
