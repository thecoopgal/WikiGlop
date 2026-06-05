<script lang="ts">
	import type { PageBlock, PageYaml } from '$lib/server/content';
	import type { ResolvedSite } from '$lib/server/sites';
	import BlockRenderer from '../BlockRenderer.svelte';

	let { site, page }: { site: ResolvedSite; page: PageYaml } = $props();

	const maxWidth = $derived(page.page_settings?.max_width ?? 'prose');
	const showHeader = $derived(page.page_settings?.show_header !== false);
	const useCardLayout = $derived(page.page_settings?.document_style === 'cards');

	/** Same width as creator_links layout (`CreatorLinksPage` sm). */
	const creatorProfileContainerClass = 'mx-auto max-w-[500px] px-6';
	const documentCardsContainerClass = 'mx-auto w-full max-w-[800px] px-6';

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

	function isSpacerBlock(block: PageBlock): boolean {
		if (block.type !== 'markdown') return false;
		const content = typeof block.content === 'string' ? block.content.trim() : '';
		return !content;
	}

	function isSectionHeading(block: PageBlock): boolean {
		if (block.type !== 'heading') return false;
		const level = typeof block.level === 'number' ? block.level : Number(block.level);
		return level === 2 || Number.isNaN(level);
	}

	function groupContentIntoCards(blocks: PageBlock[]): PageBlock[][] {
		const cards: PageBlock[][] = [];
		let current: PageBlock[] = [];

		const flush = () => {
			const meaningful = current.filter((b) => !isSpacerBlock(b));
			if (meaningful.length) cards.push(meaningful);
			current = [];
		};

		for (const block of blocks) {
			if (isSectionHeading(block) && current.some((b) => !isSpacerBlock(b))) {
				flush();
			}
			if (!isSpacerBlock(block)) current.push(block);
		}
		flush();
		return cards;
	}

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
						<BlockRenderer blocks={segment.blocks} {site} pageSettings={page.page_settings} />
					</div>
				{:else if useCardLayout}
					<div class={documentCardsContainerClass}>
						<div class="wiki-document-cards space-y-4">
							{#each groupContentIntoCards(segment.blocks) as cardBlocks, i (`card-${cardBlocks.map((b) => b.id ?? b.type).join('-')}-${i}`)}
								<article
									class="card border border-primary/25 bg-base-100/80 shadow-[0px_1px_3px_rgba(0,0,0,0.15)]"
								>
									<div class="card-body gap-4 p-6">
										<div class="wiki-document-content prose prose-lg max-w-none">
											<BlockRenderer blocks={cardBlocks} {site} pageSettings={page.page_settings} />
										</div>
									</div>
								</article>
							{/each}
						</div>
					</div>
				{:else}
					<div class={`wiki-document-content ${containerClass(String(maxWidth))}`}>
						<BlockRenderer blocks={segment.blocks} {site} pageSettings={page.page_settings} />
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

	.wiki-document-cards .wiki-document-content :global(h2:not(:first-of-type)) {
		margin-top: 1.5rem;
		padding-top: 0;
		border-top: none;
	}

	.wiki-document-cards :global(header.my-10) {
		margin-top: 0;
		margin-bottom: 0.25rem;
	}

	.wiki-document-cards :global(header h1) {
		font-size: 1.875rem;
		line-height: 2.25rem;
	}
</style>
