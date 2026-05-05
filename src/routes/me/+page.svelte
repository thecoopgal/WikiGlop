<script lang="ts">
	import {
		getCurrentBrowserSubscription,
		registerForCreatorNotifications,
		unsubscribeFromCreatorPage
	} from '$lib/push-client';
	import { onMount } from 'svelte';

	let { data } = $props();

	const themeName = $derived(
		data.site?.theme?.preset && (data.site.theme.preset === 'light' || data.site.theme.preset === 'dark')
			? data.site.theme.preset
			: data.site?.theme?.mode === 'light' || data.site?.theme?.mode === 'dark'
				? data.site.theme.mode
				: 'light'
	);
	const pageBg = $derived(
		typeof data.site?.theme?.overrides?.['base-200'] === 'string' ? data.site.theme.overrides['base-200'] : undefined
	);
	const creatorPages = $derived(Array.isArray(data.creatorPages) ? data.creatorPages : []);

	type SubState = Record<string, 'followed' | 'not_followed' | 'loading'>;
	let subState = $state<SubState>({});
	let currentEndpoint = $state('');
	let feedback = $state('');

	async function refreshSubscriptions() {
		const current = await getCurrentBrowserSubscription();
		if (!current?.endpoint) {
			currentEndpoint = '';
			subState = {};
			return;
		}
		currentEndpoint = current.endpoint;
		const res = await fetch(`/api/notifications/my-subscriptions?endpoint=${encodeURIComponent(current.endpoint)}`);
		if (!res.ok) {
			feedback = 'Could not load current subscriptions.';
			return;
		}
		const payload = (await res.json()) as {
			ok: boolean;
			subscriptions: Array<{ pagePath: string; revoked: boolean }>;
		};
		const activePaths = new Set(
			(payload.subscriptions ?? []).filter((x) => !x.revoked).map((x) => x.pagePath)
		);
		const next: SubState = {};
		for (const page of creatorPages) {
			next[page.path] = activePaths.has(page.path) ? 'followed' : 'not_followed';
		}
		subState = next;
	}

	async function followCreator(path: string, title: string) {
		subState = { ...subState, [path]: 'loading' };
		const result = await registerForCreatorNotifications({
			pagePath: path,
			creatorName: title
		});
		if (!result.ok) {
			subState = { ...subState, [path]: 'not_followed' };
			feedback = 'Could not subscribe on this device right now.';
			return;
		}
		subState = { ...subState, [path]: 'followed' };
		feedback = '';
		await refreshSubscriptions();
	}

	async function unfollowCreator(path: string) {
		subState = { ...subState, [path]: 'loading' };
		const result = await unsubscribeFromCreatorPage(path);
		subState = { ...subState, [path]: result.ok ? 'not_followed' : 'followed' };
		if (!result.ok) feedback = 'Could not update this subscription.';
	}

	onMount(async () => {
		await refreshSubscriptions();
	});
</script>

<svelte:head>
	<title>My Glops — {data.site.name ?? data.site.id}</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-base-200" data-theme={themeName} style={pageBg ? `background-color: ${pageBg};` : undefined}>
	<div class="navbar bg-base-100 shadow-sm">
		<div class="navbar-start">
			<a class="btn btn-ghost text-xl" href="/">{data.site.name ?? data.site.id}</a>
		</div>
	</div>

	<main class="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h1 class="card-title text-2xl">My Glops</h1>
				<p class="text-sm opacity-80">
					Manage which creators this device is subscribed to.
				</p>
				{#if !currentEndpoint}
					<p class="mt-2 text-sm text-warning">
						No push subscription detected yet. Follow at least one creator to set up notifications.
					</p>
				{/if}
				{#if feedback}
					<p class="mt-2 text-sm text-error">{feedback}</p>
				{/if}

				<div class="mt-4 space-y-3">
					{#each creatorPages as page}
						<div class="flex items-center justify-between rounded-box border border-base-300 p-3">
							<div>
								<p class="font-medium">{page.title}</p>
								<p class="text-xs opacity-70">{page.path}</p>
							</div>
							{#if subState[page.path] === 'followed'}
								<button
									type="button"
									class="btn btn-sm btn-outline"
									onclick={() => unfollowCreator(page.path)}
									disabled={subState[page.path] === 'loading'}
								>
									{#if subState[page.path] === 'loading'}Updating...{:else}Unfollow{/if}
								</button>
							{:else}
								<button
									type="button"
									class="btn btn-sm btn-primary"
									onclick={() => followCreator(page.path, page.title)}
									disabled={subState[page.path] === 'loading'}
								>
									{#if subState[page.path] === 'loading'}Updating...{:else}Follow{/if}
								</button>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
	</main>
</div>
