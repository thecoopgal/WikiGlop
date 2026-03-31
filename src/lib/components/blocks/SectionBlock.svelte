<script lang="ts">
	import type { PageBlock } from '$lib/server/content';
	import BlockRenderer from '../BlockRenderer.svelte';

	type Props = {
		title?: string;
		blocks?: PageBlock[];
	};

	let { title, blocks } = $props() as Props;
</script>

<section class="my-10">
	{#if title}
		<h2 class="mb-6 text-3xl font-bold">{title}</h2>
	{/if}

	{#if blocks && blocks.length}
		<div class="space-y-8">
			<BlockRenderer blocks={blocks} />
		</div>
	{:else}
		<p class="text-sm text-warning">No section blocks.</p>
	{/if}
</section>

