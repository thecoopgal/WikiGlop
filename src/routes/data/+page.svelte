<script lang="ts">
	import { page } from '$app/state';
	import TrendingGlopsPanel from '$lib/components/TrendingGlopsPanel.svelte';
	import UnansweredGlopsPanel from '$lib/components/UnansweredGlopsPanel.svelte';
	import IconChevronDown from '~icons/mdi/chevron-down';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let trendingOpen = $state(false);
	let unansweredOpen = $state(page.url.searchParams.has('unansweredSort'));

	$effect(() => {
		if (page.url.searchParams.has('unansweredSort')) unansweredOpen = true;
	});
</script>

<svelte:head>
	<title>Data · GloopGlop</title>
	<meta name="description" content="Trending and unanswered GloopGlop community data." />
</svelte:head>

<div class="space-y-3">
	<div>
		<button
			type="button"
			class="card w-full border border-primary/25 bg-base-100/80 text-left shadow-sm transition hover:border-primary hover:bg-primary/5"
			aria-expanded={trendingOpen}
			onclick={() => (trendingOpen = !trendingOpen)}
		>
			<div class="card-body flex flex-row items-center gap-3 p-5">
				<div class="min-w-0 flex-1">
					<h2 class="text-base font-semibold">Trending Gloops</h2>
					<p class="text-sm text-base-content/70">What people are searching and glopping right now.</p>
				</div>
				<IconChevronDown
					class="h-5 w-5 shrink-0 text-base-content/50 transition-transform duration-200{trendingOpen
						? ' rotate-180'
						: ''}"
					aria-hidden="true"
				/>
			</div>
		</button>
		{#if trendingOpen}
			<div class="mt-3">
				<TrendingGlopsPanel items={data.topGlopedQuestions} />
			</div>
		{/if}
	</div>

	<div>
		<button
			type="button"
			class="card w-full border border-warning/40 bg-base-100/80 text-left shadow-sm transition hover:border-warning hover:bg-warning/5"
			aria-expanded={unansweredOpen}
			onclick={() => (unansweredOpen = !unansweredOpen)}
		>
			<div class="card-body flex flex-row items-center gap-3 p-5">
				<div class="min-w-0 flex-1">
					<h2 class="text-base font-semibold">Unanswered Gloops</h2>
					<p class="text-sm text-base-content/70">Searches waiting for the first community link.</p>
				</div>
				<IconChevronDown
					class="h-5 w-5 shrink-0 text-base-content/50 transition-transform duration-200{unansweredOpen
						? ' rotate-180'
						: ''}"
					aria-hidden="true"
				/>
			</div>
		</button>
		{#if unansweredOpen}
			<div class="mt-3">
				<UnansweredGlopsPanel
					items={data.unansweredGlopQuestions}
					sort={data.unansweredSort}
					basePath="/data"
				/>
			</div>
		{/if}
	</div>
</div>
