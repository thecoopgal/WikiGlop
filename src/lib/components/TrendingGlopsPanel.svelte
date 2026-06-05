<script lang="ts">
	import type { TopGlopedQuestion } from '$lib/server/glop-search';

	type Props = {
		items?: TopGlopedQuestion[];
	};

	let { items = [] }: Props = $props();
</script>

<section
	class="card overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm"
	aria-label="Trending Gloops glopped right now"
>
	<div class="border-b border-base-300 px-4 py-3">
		<h2 class="text-base font-semibold leading-snug">Trending Gloops glopped right now</h2>
	</div>
	{#if items.length > 0}
		<ol class="divide-y divide-base-200">
			{#each items as item, i (item.query_normalized)}
				<li>
					<a
						href="/search?q={encodeURIComponent(item.query_display)}"
						class="group flex items-center gap-3 px-4 py-3 no-underline transition-colors hover:bg-base-200/70 focus-visible:bg-base-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
					>
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-sm font-bold text-primary"
							aria-hidden="true"
						>{i + 1}</span>
						<span class="min-w-0 flex-1">
							<span
								class="line-clamp-2 text-sm font-medium leading-snug text-base-content group-hover:text-primary"
							>
								{item.query_display}
							</span>
						</span>
						<span class="flex shrink-0 flex-col items-end gap-0.5 text-xs text-base-content/55">
							<span title="Times searched">
								{item.ask_count} search{item.ask_count === 1 ? '' : 'es'}
							</span>
							{#if item.glop_count > 0}
								<span class="font-medium text-primary" title="Links glooped for this question">
									{item.glop_count} glop{item.glop_count === 1 ? '' : 's'}
								</span>
							{/if}
						</span>
					</a>
				</li>
			{/each}
		</ol>
	{:else}
		<div class="px-4 py-6 text-center text-sm text-base-content/70">
			<p>No gloops yet. Search for something to start the list.</p>
		</div>
	{/if}
</section>
