<script lang="ts">
	import type { PageBlock, PageYaml } from '$lib/server/content';
	import type { ResolvedSite } from '$lib/server/sites';
	import BlockRenderer from '../BlockRenderer.svelte';

	let { site, page }: { site: ResolvedSite; page: PageYaml } = $props();

	const maxWidth = $derived(page.page_settings?.max_width ?? 'prose');
	const showHeader = $derived(page.page_settings?.show_header !== false);

	/** Same width as creator_links layout (`CreatorLinksPage` sm). */
	const creatorProfileContainerClass = 'mx-auto max-w-[500px] px-6';

	type BlockSegment =
		| { kind: 'creator_profile'; blocks: PageBlock[] }
		| { kind: 'content'; blocks: PageBlock[] };

	const blockSegments = $derived.by(() => {
		const blocks = page.blocks ?? [];
		const segments: BlockSegment[] = [];
		for (const block of blocks) {
			const kind = block.type === 'creator_profile' ? 'creator_profile' : 'content';
			const last = segments[segments.length - 1];
			if (last?.kind === kind) {
				last.blocks.push(block);
			} else {
				segments.push({ kind, blocks: [block] });
			}
		}
		return segments;
	});

	function containerClass(v: string) {
		if (v === 'prose') return 'prose prose-lg mx-auto max-w-none px-6';
		if (v === 'xl') return 'mx-auto max-w-screen-xl px-6';
		if (v === 'lg') return 'mx-auto max-w-screen-lg px-6';
		if (v === 'sm') return 'mx-auto max-w-screen-sm px-6';
		if (v === 'md') return 'mx-auto max-w-screen-md px-6';
		return 'mx-auto max-w-5xl px-6';
	}
</script>

<div class={showHeader ? 'pt-3.5 pb-10' : 'pt-0 pb-10'}>
	{#if blockSegments.length}
		<div class="space-y-10">
			{#each blockSegments as segment (segment.kind + segment.blocks.map((b) => b.id ?? b.type).join(','))}
				{#if segment.kind === 'creator_profile'}
					<div class={creatorProfileContainerClass}>
						<BlockRenderer blocks={segment.blocks} {site} />
					</div>
				{:else}
					<div class={`wiki-document-content ${containerClass(String(maxWidth))}`}>
						<BlockRenderer blocks={segment.blocks} {site} />
					</div>
				{/if}
			{/each}
		</div>
	{:else}
		<div class={containerClass(String(maxWidth))}>
			<p class="text-sm text-warning">No document blocks found.</p>
		</div>
	{/if}
</div>

<style>
	.wiki-document-content :global(h2:not(:first-of-type)) {
		margin-top: 2.5rem;
		padding-top: 2rem;
		border-top: 1px solid color-mix(in oklab, var(--color-base-content) 18%, transparent);
	}

	.wiki-document-content :global(h2 + *) {
		margin-top: 0.75rem;
	}
</style>
