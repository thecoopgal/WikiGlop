<script lang="ts">
	import GlopSearchFooter from '$lib/components/GlopSearchFooter.svelte';
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

<div class="px-4 py-10">
	<div class="mx-auto w-full max-w-3xl">
		<GlopSearchFooter wrapperClass="mx-auto mb-8 w-full max-w-lg" />

		{#if data.mock}
			<div class="alert alert-info mb-6 text-sm">
				<span>Showing mock data — this page is for design preview only.</span>
			</div>
		{/if}

		<header class="mb-6">
			<p class="text-sm text-base-content/60">
				<a href="/watch" class="link link-hover">Watch</a>
				<span class="mx-1">/</span>
				<a href="/watch/{data.creatorId}" class="link link-hover">{data.creatorName}</a>
				<span class="mx-1">/</span>
				{title}
			</p>
			<h1 class="mt-2 text-2xl font-bold tracking-tight">{title}</h1>
		</header>

		<StreamVideoPlayer
			streamUid={data.video.streamUid}
			{title}
			mock={data.mock}
			thumbnailUrl={data.video.thumbnailUrl}
		/>
	</div>
</div>
