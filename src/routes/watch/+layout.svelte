<script lang="ts">
	import GlopSearchFooter from '$lib/components/GlopSearchFooter.svelte';
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';

	let { children } = $props();
</script>

<div class="flex min-h-screen flex-col bg-base-200">
	<div class="flex-1">
		{@render children()}
	</div>

	<GlopSearchFooter />
	<Icons8BoogerAttribution />
</div>
