<script lang="ts">
	import type { PageData } from './$types';
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';

	let { data }: { data: PageData } = $props();

	const copy = $derived.by(() => {
		switch (data.status) {
			case 'expired':
				return {
					title: 'Link expired',
					body: 'That login link has expired. Request a new one.'
				};
			case 'used':
				return {
					title: 'Link already used',
					body: 'That login link was already used. Request a new one if you need to sign in again.'
				};
			default:
				return {
					title: 'Invalid link',
					body: 'That login link is not valid. Request a new one.'
				};
		}
	});
</script>

<svelte:head>
	<title>{copy.title} · GloopGlop</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-base-200">
	<main class="flex flex-1 items-center justify-center px-4 py-10">
		<div class="card w-full max-w-md bg-base-100 shadow-md">
			<div class="card-body gap-4 text-center">
				<h1 class="text-xl font-bold">{copy.title}</h1>
				<p class="text-sm opacity-70">{copy.body}</p>
				<a class="btn btn-primary" href="/login?next={encodeURIComponent(data.next)}">
					Request a new link
				</a>
			</div>
		</div>
	</main>
	<Icons8BoogerAttribution />
</div>
