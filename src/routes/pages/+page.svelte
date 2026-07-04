<script lang="ts">
	import type { PageData } from './$types';
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';
	import { browser } from '$app/environment';

	let { data }: { data: PageData } = $props();

	function liveHref(siteId: string): string {
		if (!browser) return `https://${siteId}.gloopglop.com/`;
		const host = window.location.hostname;
		if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')) {
			const port = window.location.port || '8787';
			return `http://${siteId}.localhost:${port}/`;
		}
		return `https://${siteId}.gloopglop.com/`;
	}
</script>

<svelte:head>
	<title>My pages · GloopGlop</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-base-200">
	<main class="mx-auto w-full max-w-[800px] flex-1 px-4 py-6 sm:px-5">
		<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
			<div>
				<h1 class="text-xl font-bold">My pages</h1>
				<p class="text-sm opacity-70">{data.user.email}</p>
			</div>
			<a class="btn btn-primary btn-sm" href="/links/start">New page</a>
		</div>

		{#if data.sites.length === 0}
			<div class="rounded-box border border-base-300 bg-base-100 p-6 text-center">
				<p class="mb-4 text-sm opacity-80">You are not a member of any pages yet.</p>
				<a class="btn btn-primary" href="/links/start">Create a page</a>
			</div>
		{:else}
			<ul class="flex flex-col gap-3">
				{#each data.sites as item (item.id)}
					<li class="rounded-box border border-base-300 bg-base-100 p-4">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<div class="min-w-0">
								<p class="truncate font-semibold">{item.name ?? item.id}</p>
								<p class="truncate text-sm opacity-70">{item.id}</p>
								<p class="mt-1 text-xs opacity-50">
									Role: {item.role}
									{#if item.status !== 'published'}
										· {item.status}
									{/if}
								</p>
							</div>
							<div class="flex flex-wrap gap-2">
								<a class="btn btn-primary btn-sm" href="/pages/{item.id}/edit">Edit</a>
								<a
									class="btn btn-outline btn-sm"
									href={liveHref(item.id)}
									target="_blank"
									rel="noopener noreferrer"
								>
									Open
								</a>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		<p class="mt-8 text-center text-xs opacity-50">
			<a class="link link-hover" href="/">Home</a>
			·
			<a class="link link-hover" href="/links">Links</a>
		</p>
	</main>
	<Icons8BoogerAttribution />
</div>
