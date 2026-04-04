<script lang="ts">
	import type { PageYaml } from '$lib/server/content';
	import type { ResolvedSite } from '$lib/server/sites';
	import BlockRenderer from '../BlockRenderer.svelte';

	let { site, page }: { site: ResolvedSite; page: PageYaml } = $props();

	const maxWidth = $derived(page.page_settings?.max_width ?? 'sm');

	function containerClass(v: string) {
		switch (v) {
			case 'sm':
				return 'mx-auto max-w-screen-sm px-6';
			case 'md':
				return 'mx-auto max-w-screen-md px-6';
			case 'xl':
				return 'mx-auto max-w-screen-xl px-6';
			default:
				return 'mx-auto max-w-2xl px-6';
		}
	}
</script>

<div class="py-10">
	<div class={containerClass(String(maxWidth))}>
		<p class="mb-6 text-center text-xs font-medium uppercase tracking-wide text-base-content/50">
			{site.name ?? site.id}
		</p>
		{#if page.blocks && page.blocks.length}
			<div class="space-y-10">
				<BlockRenderer blocks={page.blocks} />
			</div>
		{:else}
			<p class="text-sm text-warning">No blocks configured for this profile.</p>
		{/if}
	</div>
</div>
