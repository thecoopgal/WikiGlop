<script lang="ts">
	import type { PageYaml } from '$lib/server/content';
	import type { ResolvedSite } from '$lib/server/sites';
	import BlockRenderer from '../BlockRenderer.svelte';

	let { site, page }: any = $props();

	const maxWidth = $derived(page.page_settings?.max_width ?? 'xl');
	const showHeader = $derived(page.page_settings?.show_header !== false);

	function containerClass(v: string) {
		if (v === 'sm') return 'mx-auto max-w-screen-sm px-6';
		if (v === 'md') return 'mx-auto max-w-screen-md px-6';
		if (v === 'prose') return 'mx-auto max-w-none px-6 prose prose-lg';
		if (v === 'xl') return 'mx-auto max-w-screen-xl px-6';
		return 'mx-auto max-w-6xl px-6';
	}
</script>

<div class={showHeader ? 'pt-3.5 pb-10' : 'pt-0 pb-10'}>
	<div class={containerClass(String(maxWidth))}>
		{#if page.blocks && page.blocks.length}
			<div class="space-y-10">
				<BlockRenderer blocks={page.blocks} />
			</div>
		{:else}
			<p class="text-sm text-warning">No publication blocks found.</p>
		{/if}
	</div>
</div>

