<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head>
	<link
		rel="icon"
		href="https://imagedelivery.net/zdMtZgMUbYs7-R4-dRSl-Q/907061a8-51ae-454c-c739-83935616f900/public"
	/>
</svelte:head>
{@render children()}
