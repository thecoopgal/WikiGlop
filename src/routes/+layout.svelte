<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		if (!('serviceWorker' in navigator)) return;
		navigator.serviceWorker.register('/sw.js').catch(() => {
			// No-op: push setup will handle registration errors explicitly.
		});
	});
</script>

<svelte:head>
	<link
		rel="icon"
		href="https://imagedelivery.net/zdMtZgMUbYs7-R4-dRSl-Q/907061a8-51ae-454c-c739-83935616f900/public"
	/>
	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>
{@render children()}
