<script lang="ts">
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';
	import StreamVideoPlayer from '$lib/components/StreamVideoPlayer.svelte';
	import type { PageData } from './$types';

	const { data } = $props<{ data: PageData }>();

	const title = $derived(
		data.video.filename.replace(/\.[^.]+$/, '') || data.video.filename
	);
</script>

<svelte:head>
	<title>{title} · {data.creatorName} · GloopGlop</title>
</svelte:head>

<main class="min-h-[70vh] px-4 py-10">
	<div class="mx-auto max-w-3xl">
		<header class="mb-6">
			<p class="text-sm text-base-content/60">
				<a href="/watch/{data.creatorId}" class="link link-hover">{data.creatorName}</a>
				<span class="mx-1">/</span>
				{title}
			</p>
			<h1 class="mt-2 text-2xl font-bold tracking-tight">{title}</h1>
		</header>

		<StreamVideoPlayer streamUid={data.video.streamUid} {title} />

		<p class="mt-8 text-center text-xs text-base-content/50">
			<Icons8BoogerAttribution />
		</p>
	</div>
</main>
