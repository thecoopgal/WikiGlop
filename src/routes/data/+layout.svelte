<script lang="ts">
	import GlopSearchFooter from '$lib/components/GlopSearchFooter.svelte';
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';

	let { children } = $props();
</script>

<div class="gloopglop-data flex min-h-screen flex-col bg-base-200">
	<div class="flex-1 px-4 py-10">
		<div class="mx-auto w-full max-w-xl space-y-8">
			<GlopSearchFooter wrapperClass="mx-auto w-full max-w-lg" />
			{@render children()}
		</div>
	</div>

	<Icons8BoogerAttribution />
</div>

<style>
	.gloopglop-data {
		--color-primary: oklch(62% 0.18 155);
		--color-primary-content: oklch(98% 0.01 155);
	}
</style>
