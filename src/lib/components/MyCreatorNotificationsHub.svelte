<script lang="ts">
	import { getCurrentBrowserSubscription } from '$lib/push-client';
	import { onMount } from 'svelte';
	import type { GlobalCreatorPageSummary } from '$lib/server/content';
	import type { ResolvedSite } from '$lib/server/sites';

	type Props = {
		site: ResolvedSite;
		creatorPages: GlobalCreatorPageSummary[];
	};

	let { site, creatorPages }: Props = $props();

	const themeName = $derived(
		site?.theme?.preset && (site.theme.preset === 'light' || site.theme.preset === 'dark')
			? site.theme.preset
			: site?.theme?.mode === 'light' || site?.theme?.mode === 'dark'
				? site.theme.mode
				: 'light'
	);
	const pageBg = $derived(
		typeof site?.theme?.overrides?.['base-200'] === 'string' ? site.theme.overrides['base-200'] : undefined
	);

	const creatorMap = $derived.by(() => {
		const m = new Map<string, { title: string; siteName: string; path: string }>();
		for (const page of creatorPages) {
			m.set(`${page.siteId}:${page.path}`, {
				title: page.title,
				siteName: page.siteName,
				path: page.path
			});
		}
		return m;
	});

	let loading = $state(true);
	let feedback = $state('');
	let activeSubscriptions = $state<Array<{ siteId: string; pagePath: string; creatorName: string | null }>>([]);

	onMount(async () => {
		try {
			const current = await getCurrentBrowserSubscription();
			if (!current?.endpoint) {
				feedback = 'No push subscription found on this device yet.';
				activeSubscriptions = [];
				return;
			}
			const res = await fetch(`/api/notifications/my-subscriptions?endpoint=${encodeURIComponent(current.endpoint)}`);
			if (!res.ok) {
				feedback = 'Could not load your subscriptions.';
				activeSubscriptions = [];
				return;
			}
			const body = (await res.json()) as {
				ok: boolean;
				subscriptions: Array<{
					siteId: string;
					pagePath: string;
					creatorName: string | null;
					revoked: boolean;
				}>;
			};
			activeSubscriptions = (body.subscriptions ?? []).filter((s) => !s.revoked);
		} finally {
			loading = false;
		}
	});
</script>

<div
	class="flex min-h-screen flex-col bg-base-200"
	data-theme={themeName}
	style={pageBg ? `background-color: ${pageBg};` : undefined}
>
	<div class="navbar bg-base-100 shadow-sm">
		<div class="navbar-start">
			<a class="btn btn-ghost text-xl" href="/">GloopGlop</a>
		</div>
	</div>

	<main class="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h1 class="card-title text-2xl">My Creator Notifications</h1>
				<p class="text-sm opacity-80">Creators you are currently subscribed to across GloopGlop.</p>

				{#if loading}
					<p class="mt-4 text-sm opacity-70">Loading subscriptions...</p>
				{:else if feedback}
					<p class="mt-4 text-sm text-warning">{feedback}</p>
				{:else if activeSubscriptions.length === 0}
					<p class="mt-4 text-sm opacity-70">You are not following any creators yet.</p>
				{:else}
					<div class="mt-4 space-y-3">
						{#each activeSubscriptions as sub}
							{@const meta = creatorMap.get(`${sub.siteId}:${sub.pagePath}`)}
							<div class="rounded-box border border-base-300 p-3">
								<p class="font-medium">{sub.creatorName ?? meta?.title ?? sub.pagePath}</p>
								<p class="text-xs opacity-70">
									{meta?.siteName ?? sub.siteId} · {meta?.path ?? sub.pagePath}
								</p>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</main>
</div>
