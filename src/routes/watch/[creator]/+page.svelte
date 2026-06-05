<script lang="ts">
	import GlopSearchFooter from '$lib/components/GlopSearchFooter.svelte';
	import WatchVideoCard from '$lib/components/WatchVideoCard.svelte';
	import type { PageData } from './$types';

	const { data } = $props<{ data: PageData }>();
</script>

<svelte:head>
	<title>{data.creatorName} · Watch · GloopGlop</title>
	<meta name="description" content="Approved videos from {data.creatorName} on GloopGlop." />
</svelte:head>

<div class="px-4 py-10">
	<div class="mx-auto w-full max-w-4xl">
		<GlopSearchFooter wrapperClass="mx-auto mb-8 w-full max-w-lg" />

		{#if data.videos.length === 0}
			<div class="rounded-xl bg-base-200 px-6 py-10 text-center text-base-content/70">
				No approved videos yet for this creator.
			</div>
		{:else}
			<ul class="grid gap-4 sm:grid-cols-2">
				{#each data.videos as video (video.id)}
					<li>
						<WatchVideoCard
							href="/watch/{data.creatorId}/{video.id}"
							filename={video.filename}
							streamUid={video.streamUid}
							thumbnailUrl={video.thumbnailUrl}
							createdAt={video.createdAt}
							approvedAt={video.approvedAt}
						/>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
