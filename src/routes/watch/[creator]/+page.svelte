<script lang="ts">
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';
	import { streamThumbnailSrc } from '$lib/stream-watch';
	import type { PageData } from './$types';

	const { data } = $props<{ data: PageData }>();

	function displayTitle(filename: string): string {
		return filename.replace(/\.[^.]+$/, '') || filename;
	}

	function thumbUrl(streamUid: string, stored: string | null): string {
		return stored?.trim() || streamThumbnailSrc(streamUid);
	}
</script>

<svelte:head>
	<title>{data.creatorName} · Watch · GloopGlop</title>
	<meta name="description" content="Approved videos from {data.creatorName} on GloopGlop." />
</svelte:head>

<main class="min-h-[70vh] px-4 py-10">
	<div class="mx-auto max-w-4xl">
		<header class="mb-8">
			<p class="text-sm text-base-content/60">
				<a href="/" class="link link-hover">GloopGlop</a>
				<span class="mx-1">/</span>
				Watch
			</p>
			<h1 class="mt-2 text-3xl font-bold tracking-tight">{data.creatorName}</h1>
		</header>

		{#if data.videos.length === 0}
			<div class="rounded-xl bg-base-200 px-6 py-10 text-center text-base-content/70">
				No approved videos yet for this creator.
			</div>
		{:else}
			<ul class="grid gap-4 sm:grid-cols-2">
				{#each data.videos as video (video.id)}
					<li>
						<a
							href="/watch/{data.creatorId}/{video.id}"
							class="card card-compact bg-base-100 shadow-md transition hover:shadow-lg"
						>
							<figure class="aspect-video bg-base-300">
								<img
									src={thumbUrl(video.streamUid, video.thumbnailUrl)}
									alt=""
									class="h-full w-full object-cover"
									loading="lazy"
								/>
							</figure>
							<div class="card-body gap-1">
								<h2 class="card-title text-base">{displayTitle(video.filename)}</h2>
								<p class="text-xs text-base-content/60">
									{new Date(video.approvedAt ?? video.createdAt).toLocaleDateString()}
								</p>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{/if}

		<p class="mt-8 text-center text-xs text-base-content/50">
			<Icons8BoogerAttribution />
		</p>
	</div>
</main>
