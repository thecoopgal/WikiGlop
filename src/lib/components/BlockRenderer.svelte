<script lang="ts">
	import type { PageBlock } from '$lib/server/content';
	import HeroBlock from './blocks/HeroBlock.svelte';
	import MarkdownBlock from './blocks/MarkdownBlock.svelte';
	import HeadingBlock from './blocks/HeadingBlock.svelte';
	import LinksBlock from './blocks/LinksBlock.svelte';
	import SectionBlock from './blocks/SectionBlock.svelte';
	import CalloutBlock from './blocks/CalloutBlock.svelte';
	import DocumentHeaderBlock from './blocks/DocumentHeaderBlock.svelte';
	import PublicationHeaderBlock from './blocks/PublicationHeaderBlock.svelte';
	import GalleryBlock from './blocks/GalleryBlock.svelte';
	import PeopleBlock from './blocks/PeopleBlock.svelte';
	import CreatorProfileBlock from './blocks/CreatorProfileBlock.svelte';
	import QuoteBlock from './blocks/QuoteBlock.svelte';
	import SearchCtaBlock from './blocks/SearchCtaBlock.svelte';
	import BlockRenderer from './BlockRenderer.svelte';

let { blocks, block, site }: any = $props();

	const blockType = $derived((block as any)?.type as string | undefined);
</script>

{#if blocks}
	{#each blocks as b, i (b.id ?? `${b.type}-${i}`)}
		<BlockRenderer block={b} site={site} />
	{/each}
{:else if blockType === 'hero'}
	{#if (block as any)?.id}
		<div id={(block as any).id}>
			<HeroBlock {...(block as any)} />
		</div>
	{:else}
		<HeroBlock {...(block as any)} />
	{/if}
{:else if blockType === 'markdown'}
	{#if (block as any)?.id}
		<div id={(block as any).id}>
			<MarkdownBlock {...(block as any)} />
		</div>
	{:else}
		<MarkdownBlock {...(block as any)} />
	{/if}
{:else if blockType === 'heading'}
	<HeadingBlock {...(block as any)} />
{:else if blockType === 'links'}
	{#if (block as any)?.id}
		<div id={(block as any).id}>
			<LinksBlock {...(block as any)} />
		</div>
	{:else}
		<LinksBlock {...(block as any)} />
	{/if}
{:else if blockType === 'section'}
	{#if (block as any)?.id}
		<div id={(block as any).id}>
			<SectionBlock {...(block as any)} site={site} />
		</div>
	{:else}
		<SectionBlock {...(block as any)} site={site} />
	{/if}
{:else if blockType === 'callout'}
	{#if (block as any)?.id}
		<div id={(block as any).id}>
			<CalloutBlock {...(block as any)} />
		</div>
	{:else}
		<CalloutBlock {...(block as any)} />
	{/if}
{:else if blockType === 'document_header'}
	{#if (block as any)?.id}
		<div id={(block as any).id}>
			<DocumentHeaderBlock {...(block as any)} />
		</div>
	{:else}
		<DocumentHeaderBlock {...(block as any)} />
	{/if}
{:else if blockType === 'publication_header'}
	{#if (block as any)?.id}
		<div id={(block as any).id}>
			<PublicationHeaderBlock {...(block as any)} />
		</div>
	{:else}
		<PublicationHeaderBlock {...(block as any)} />
	{/if}
{:else if blockType === 'gallery'}
	{#if (block as any)?.id}
		<div id={(block as any).id}>
			<GalleryBlock {...(block as any)} />
		</div>
	{:else}
		<GalleryBlock {...(block as any)} />
	{/if}
{:else if blockType === 'people'}
	{#if (block as any)?.id}
		<div id={(block as any).id}>
			<PeopleBlock {...(block as any)} />
		</div>
	{:else}
		<PeopleBlock {...(block as any)} />
	{/if}
{:else if blockType === 'creator_profile'}
	{#if (block as any)?.id}
		<div id={(block as any).id}>
			<CreatorProfileBlock {...(block as any)} site={site} />
		</div>
	{:else}
		<CreatorProfileBlock {...(block as any)} site={site} />
	{/if}
{:else if blockType === 'quote'}
	{#if (block as any)?.id}
		<div id={(block as any).id}>
			<QuoteBlock {...(block as any)} />
		</div>
	{:else}
		<QuoteBlock {...(block as any)} />
	{/if}
{:else if blockType === 'search_cta'}
	{#if (block as any)?.id}
		<div id={(block as any).id}>
			<SearchCtaBlock {...(block as any)} />
		</div>
	{:else}
		<SearchCtaBlock {...(block as any)} />
	{/if}
{:else}
	{#if block?.id}
		<div id={(block as any).id} class="rounded-box border border-dashed border-warning/50 p-4">
			<p class="text-sm text-warning">Unknown block type: {blockType}</p>
		</div>
	{:else}
		<div class="rounded-box border border-dashed border-warning/50 p-4">
			<p class="text-sm text-warning">Unknown block type: {blockType}</p>
		</div>
	{/if}
{/if}

