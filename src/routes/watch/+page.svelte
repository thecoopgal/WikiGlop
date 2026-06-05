<script lang="ts">
	import GlopSearchFooter from '$lib/components/GlopSearchFooter.svelte';
	import WatchVideoCard from '$lib/components/WatchVideoCard.svelte';
	import type { PageData } from './$types';

	const { data } = $props<{ data: PageData }>();
</script>

<svelte:head>
	<title>Watch · GloopGlop</title>
	<meta name="description" content="Approved videos from GloopGlop creators." />
</svelte:head>

<div class="px-4 py-10">
	<div class="mx-auto w-full max-w-5xl">
		<GlopSearchFooter wrapperClass="mx-auto mb-8 w-full max-w-lg" />

		{#if data.mock}
			<div class="alert alert-info mb-6 text-sm">
				<span>Showing mock data — videos are placeholders while Watch is unavailable.</span>
			</div>
		{/if}

		{#if data.videos.length === 0}
			<div class="rounded-xl bg-base-200 px-6 py-10 text-center text-base-content/70">
				No approved videos yet. Check back after uploads are approved.
			</div>
		{:else}
			<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.videos as video (video.id)}
					<li>
						<WatchVideoCard
							href="/watch/{video.creatorId}/{video.id}"
							filename={video.filename}
							streamUid={video.streamUid}
							thumbnailUrl={video.thumbnailUrl}
							createdAt={video.createdAt}
							approvedAt={video.approvedAt}
							creatorName={video.creatorName}
						/>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
