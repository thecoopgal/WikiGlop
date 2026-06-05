<script lang="ts">
	import type { GlopQuestionRow } from '$lib/server/glop-search';
	import type { UnansweredGlopSort } from '$lib/server/glop-search-resolve';
	import IconMagnify from '~icons/mdi/magnify';

	type Props = {
		items?: GlopQuestionRow[];
		sort?: UnansweredGlopSort;
		/** Path used for sort toggle links (default `/data`). */
		basePath?: string;
	};

	let { items = [], sort = 'recent', basePath = '/data' }: Props = $props();

	function sortHref(nextSort: UnansweredGlopSort): string {
		if (nextSort === 'recent') return basePath;
		return `${basePath}?unansweredSort=searches`;
	}
</script>

<section
	class="card overflow-hidden rounded-2xl border border-warning/40 bg-base-100 shadow-sm"
	aria-label="Unanswered gloops"
>
	<div class="border-b border-base-300 bg-warning/10 px-4 py-3">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="min-w-0">
				<h2 class="text-base font-semibold leading-snug">Unanswered gloops</h2>
				<p class="mt-0.5 text-sm text-base-content/65">
					Gloops people searched with no links yet. Maybe you should be the first to glop it!
				</p>
			</div>
			<div class="join shrink-0" role="group" aria-label="Sort unanswered gloops">
				<a
					href={sortHref('recent')}
					class="btn btn-xs join-item no-underline{sort === 'recent'
						? ' btn-warning'
						: ' btn-ghost border border-base-300'}"
					aria-current={sort === 'recent' ? 'true' : undefined}
				>
					Recent
				</a>
				<a
					href={sortHref('searches')}
					class="btn btn-xs join-item no-underline{sort === 'searches'
						? ' btn-warning'
						: ' btn-ghost border border-base-300'}"
					aria-current={sort === 'searches' ? 'true' : undefined}
				>
					Most searched
				</a>
			</div>
		</div>
	</div>
	{#if items.length > 0}
		<ul class="divide-y divide-base-200">
			{#each items as item (item.query_normalized)}
				<li>
					<a
						href="/search?q={encodeURIComponent(item.query_display)}"
						class="group flex items-center gap-3 px-4 py-3 no-underline transition-colors hover:bg-warning/10 focus-visible:bg-warning/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-warning"
					>
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/20 text-warning"
							aria-hidden="true"
						>
							<IconMagnify class="h-4 w-4" />
						</span>
						<span class="min-w-0 flex-1">
							<span
								class="line-clamp-2 text-sm font-medium leading-snug text-base-content group-hover:text-primary"
							>
								{item.query_display}
							</span>
						</span>
						<span class="shrink-0 text-xs text-base-content/55" title="Times searched">
							{item.ask_count} search{item.ask_count === 1 ? '' : 'es'}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="px-4 py-6 text-center text-sm text-base-content/70">
			<p>Every gloop has been glopped nice work, community. 🦾</p>
		</div>
	{/if}
</section>
