<script lang="ts">
	import { browser } from '$app/environment';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { fetchGlopSearchQuery } from '$lib/glop-search-client';
	import { glopResultDisplay, groupGlopsByCanonical, topGlopByGloopCount } from '$lib/glop-search-ui';
	import { getOrCreateBrowserClientId } from '$lib/client/gloop-browser-glop-limit';
	import { GLOOPGLOP_DEFAULT_LOGO_URL } from '$lib/glop-link-image';
	import LoadingGloop from '$lib/components/LoadingGloop.svelte';
	import IconMagnify from '~icons/mdi/magnify';
	import type { GlopSearchQueryPayload } from '$lib/server/glop-search-page';

	type Props = {
		open: boolean;
		initialQuery?: string;
		onclose?: () => void;
	};

	let { open = $bindable(false), initialQuery = '', onclose }: Props = $props();

	const gloopglopLogoUrl = GLOOPGLOP_DEFAULT_LOGO_URL;

	let query = $state('');
	let loading = $state(false);
	let errorMessage = $state('');
	let results = $state<GlopSearchQueryPayload | null>(null);
	let gloopUrl = $state('');
	let gloopSubmit = $state<'idle' | 'loading' | 'error'>('idle');
	let gloopError = $state('');
	let searchInputEl = $state<HTMLInputElement | null>(null);
	let returnUrlOnOpen = $state('');
	let urlSynced = $state(false);

	const groupedGlops = $derived.by(() => {
		if (!results) return [];
		return groupGlopsByCanonical({
			answers: results.answers,
			canonicalHrefByAnswerUrl: results.canonicalHrefByAnswerUrl,
			glopCountByAnswerUrl: results.glopCountByAnswerUrl
		});
	});

	const topGlop = $derived(topGlopByGloopCount(groupedGlops));

	$effect(() => {
		if (!open) return;
		if (browser) {
			returnUrlOnOpen = `${page.url.pathname}${page.url.search}`;
		}
		urlSynced = false;
		query = initialQuery.trim();
		results = null;
		errorMessage = '';
		gloopUrl = '';
		gloopSubmit = 'idle';
		gloopError = '';
		if (query.length >= 2) {
			void runSearch(query);
		}
		queueMicrotask(() => {
			searchInputEl?.focus();
			searchInputEl?.select();
		});
	});

	function syncSearchUrl(q: string) {
		if (!browser) return;
		const trimmed = q.trim();
		if (trimmed.length < 2) return;
		replaceState(`/search?q=${encodeURIComponent(trimmed)}`, {});
		urlSynced = true;
	}

	function restoreReturnUrl() {
		if (!browser || !returnUrlOnOpen || !urlSynced) return;
		replaceState(returnUrlOnOpen, {});
		urlSynced = false;
	}

	function close() {
		restoreReturnUrl();
		open = false;
		onclose?.();
	}

	async function runSearch(nextQuery: string) {
		const q = nextQuery.trim();
		if (q.length < 2) {
			errorMessage = 'Enter at least 2 characters to search.';
			results = null;
			return;
		}
		loading = true;
		errorMessage = '';
		try {
			results = await fetchGlopSearchQuery(q);
			query = results.query;
			syncSearchUrl(results.query);
		} catch (e) {
			results = null;
			errorMessage = e instanceof Error ? e.message : 'Search failed';
		} finally {
			loading = false;
		}
	}

	async function onSearchSubmit(event: SubmitEvent) {
		event.preventDefault();
		await runSearch(query);
	}

	async function submitGloop() {
		const q = query.trim();
		if (q.length < 2 || !browser) return;
		gloopSubmit = 'loading';
		gloopError = '';
		let clientKey: string;
		try {
			clientKey = getOrCreateBrowserClientId();
		} catch (e) {
			gloopSubmit = 'error';
			gloopError = e instanceof Error ? e.message : 'Could not use browser storage.';
			return;
		}
		const res = await fetch('/api/glop-search', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ query: q, url: gloopUrl, clientKey })
		});
		if (!res.ok) {
			gloopSubmit = 'error';
			try {
				const err = await res.json();
				gloopError = typeof err?.message === 'string' ? err.message : res.statusText;
			} catch {
				gloopError = res.statusText || 'Something went wrong.';
			}
			return;
		}
		gloopUrl = '';
		gloopSubmit = 'idle';
		await runSearch(q);
	}
</script>

{#if open}
	<div class="modal modal-open z-[100]">
		<button
			type="button"
			class="modal-backdrop bg-base-content/40"
			aria-label="Close search"
			onclick={close}
		></button>
		<div
			class="modal-box flex max-h-[min(90vh,720px)] w-11/12 max-w-2xl flex-col gap-0 overflow-hidden p-0"
			role="dialog"
			aria-modal="true"
			aria-label="Search"
		>
			<div class="border-b border-base-300 px-4 py-4 sm:px-5">
				<form class="flex items-center gap-2 sm:gap-3" onsubmit={onSearchSubmit}>
					<span class="shrink-0 rounded-xl ring-1 ring-base-300">
						<LoadingGloop spinning={loading} size="sm" alt="" />
					</span>
					<label class="input input-bordered flex h-12 min-w-0 flex-1 items-center gap-2">
						<IconMagnify class="h-5 w-5 shrink-0 text-base-content/60" aria-hidden="true" />
						<span class="sr-only">Search</span>
						<input
							bind:this={searchInputEl}
							type="search"
							class="min-w-0 grow"
							bind:value={query}
							placeholder="What do you want to glop?"
							autocomplete="off"
							minlength="2"
							maxlength="500"
							disabled={loading}
						/>
					</label>
				</form>
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
				{#if loading}
					<div class="flex justify-center py-10">
						<LoadingGloop spinning size="md" />
					</div>
				{:else if errorMessage}
					<div role="alert" class="alert alert-error text-sm">
						<span>{errorMessage}</span>
					</div>
				{:else if results?.dbUnavailable}
					<div role="alert" class="alert alert-warning text-sm">
						<span>Community search is temporarily unavailable.</span>
					</div>
				{:else if results}
					{#if topGlop}
						{@const seo = results.seoByUrl[topGlop.answerUrl]}
						{@const display = glopResultDisplay(topGlop.answerUrl, seo)}
						<div
							class="mb-4 flex items-center gap-3 rounded-xl border border-base-300 bg-base-200/60 px-3 py-2.5"
						>
							<div class="relative shrink-0">
								<img
									src={gloopglopLogoUrl}
									alt=""
									class="h-9 w-9 rounded-lg object-cover ring-1 ring-base-300"
									width="36"
									height="36"
									decoding="async"
								/>
								<span
									class="badge badge-sm absolute -bottom-1 -right-1 min-w-[1.25rem] justify-center border-0 bg-primary px-1.5 text-primary-content"
								>
									{topGlop.gloopCount}
								</span>
							</div>
							<p class="min-w-0 text-sm font-medium leading-snug">
								{results.query}
								<span class="block text-xs font-normal text-base-content/65">
									Most glopped answer
								</span>
							</p>
						</div>

						<div class="rounded-xl border border-base-300 bg-base-100">
							<a
								href={topGlop.answerUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="group flex items-start gap-3 px-3 py-3 no-underline transition-colors hover:bg-base-200/70"
							>
								<div class="relative shrink-0">
									<img
										src={gloopglopLogoUrl}
										alt=""
										class="h-9 w-9 rounded-lg object-cover ring-1 ring-base-300"
										width="36"
										height="36"
										decoding="async"
									/>
									<span
										class="badge badge-sm absolute -bottom-0.5 -right-0.5 min-w-[1.1rem] scale-90 justify-center border-0 bg-primary px-1 text-[10px] text-primary-content"
									>
										{topGlop.gloopCount}
									</span>
								</div>
								<div class="min-w-0 flex-1">
									{#if display.title}
										<p class="line-clamp-2 text-sm font-medium leading-snug">{display.title}</p>
									{/if}
									{#if display.description}
										<p class="mt-0.5 line-clamp-2 text-xs text-base-content/70">
											{display.description}
										</p>
									{/if}
									<p class="mt-1 break-words text-xs font-semibold text-primary group-hover:underline">
										{display.linkLabel}
									</p>
								</div>
							</a>
						</div>
					{:else}
						<div class="rounded-xl border border-base-300 bg-base-100 px-4 py-6 text-center text-sm text-base-content/75">
							No gloops yet for “{results.query}”. Add the first link below.
						</div>
					{/if}

					<div class="mt-5 space-y-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-4">
						<p class="text-sm font-medium">Add a glop for this search</p>
						<label class="form-control w-full">
							<input
								type="text"
								class="input input-bordered w-full input-sm"
								placeholder="YouTube, TikTok, Instagram, Wikipedia, Reddit, or Facebook link"
								aria-label="Paste a public link"
								bind:value={gloopUrl}
								inputmode="url"
								autocomplete="off"
								disabled={gloopSubmit === 'loading'}
							/>
						</label>
						{#if gloopSubmit === 'error' && gloopError}
							<p class="text-sm text-error">{gloopError}</p>
						{/if}
						<button
							type="button"
							class="btn btn-primary btn-sm"
							disabled={gloopSubmit === 'loading' || !gloopUrl.trim()}
							onclick={submitGloop}
						>
							{#if gloopSubmit === 'loading'}
								<span class="inline-flex items-center gap-2">
									<LoadingGloop spinning size="sm" />
									Saving…
								</span>
							{:else}
								Submit glop
							{/if}
						</button>
					</div>
				{/if}
			</div>

			<div class="flex flex-wrap items-center justify-between gap-2 border-t border-base-300 px-4 py-3 sm:px-5">
				{#if results?.query}
					<a
						href="/search?q={encodeURIComponent(results.query)}"
						class="link link-primary text-sm no-underline hover:underline"
					>
						Open full search page
					</a>
				{:else}
					<a href="/search" class="link link-primary text-sm no-underline hover:underline">
						Open search page
					</a>
				{/if}
				<button type="button" class="btn btn-ghost btn-sm" onclick={close}>Close</button>
			</div>
		</div>
	</div>
{/if}
