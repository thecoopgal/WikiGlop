<script lang="ts">
	import type { PageYaml } from '$lib/server/content';
	import type { ResolvedSite } from '$lib/server/sites';
	import BlockRenderer from '../BlockRenderer.svelte';

	let { site, page }: any = $props();

	const maxWidth = $derived(page.page_settings?.max_width ?? 'lg');
	const showHeader = $derived(page.page_settings?.show_header !== false);

	function maxWidthClass(v: string | undefined) {
		switch (v) {
			case 'sm':
				return 'max-w-screen-sm';
			case 'md':
				return 'max-w-screen-md';
			case 'xl':
				return 'max-w-screen-xl';
			default:
				return 'max-w-5xl';
		}
	}
</script>

<div class={`mx-auto w-full px-6 ${showHeader ? 'pt-4 pb-12' : 'pt-0 pb-12'}`}>
	<div class={`mx-auto ${maxWidthClass(maxWidth)}`}>
		{#if page.blocks && page.blocks.length}
			<div class="space-y-10">
				<BlockRenderer blocks={page.blocks} site={site} />
			</div>
		{:else}
			<p class="text-sm text-warning">No blocks defined for this page.</p>
		{/if}
	</div>
</div>

