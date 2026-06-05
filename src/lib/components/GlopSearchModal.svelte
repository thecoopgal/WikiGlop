<script lang="ts">
	import { browser } from '$app/environment';
	import { goto, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { fetchGlopSearchQuery } from '$lib/glop-search-client';
	import { glopResultDisplay, groupGlopsByCanonical, topGlopByGloopCount } from '$lib/glop-search-ui';
	import { getOrCreateBrowserClientId } from '$lib/client/gloop-browser-glop-limit';
	import { GLOOPGLOP_DEFAULT_LOGO_URL } from '$lib/glop-link-image';
	import {
		GLOOPGLOP_SEARCH_PAGE_FOCUS_HREF,
		gloopglopSearchPageHref
	} from '$lib/gloopglop-search-nav';
	import AddGlopForm from '$lib/components/AddGlopForm.svelte';
	import LoadingGloop from '$lib/components/LoadingGloop.svelte';
	import IconMagnify from '~icons/mdi/magnify';
	import type { GlopSearchQueryPayload } from '$lib/server/glop-search-page';

	type Props = {
		open: boolean;
		initialQuery?: string;
		onclose?: () => void;
		onsuccess?: () => void | Promise<void>;
	};

	let { open = $bindable(false), initialQuery = '', onclose, onsuccess }: Props = $props();

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

	function goToSearchPage() {
		urlSynced = false;
		open = false;
		onclose?.();
		if (!browser) return;
		void goto(GLOOPGLOP_SEARCH_PAGE_FOCUS_HREF);
	}

	function openFullSearchPage() {
		const q = (results?.query ?? query).trim();
		urlSynced = false;
		open = false;
		onclose?.();
		if (!browser) return;
		void goto(gloopglopSearchPageHref(q));
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
		await onsuccess?.();
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
					<button
						type="button"
						class="shrink-0"
						onclick={goToSearchPage}
						aria-label="Open GloopGlop search"
					>
						<LoadingGloop spinning={loading} size="sm" alt="" />
					</button>
					{#if results && !loading}
						<button
							type="button"
							class="input input-bordered flex h-12 min-w-0 flex-1 cursor-pointer items-center gap-2 text-left transition-colors hover:border-primary/40 hover:bg-base-200/50"
							onclick={openFullSearchPage}
							aria-label="Edit search on full search page"
						>
							<IconMagnify class="h-5 w-5 shrink-0 text-base-content/60" aria-hidden="true" />
							<span class="min-w-0 flex-1 truncate font-medium">{results.query}</span>
						</button>
					{:else}
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
					{/if}
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
				{:else if results}
					{#if results.dbUnavailable}
						<div role="alert" class="alert alert-warning mb-4 text-sm">
							<span>Community search is temporarily unavailable.</span>
						</div>
					{/if}
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
									class="h-9 w-9 rounded-lg object-cover"
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
							<button
								type="button"
								class="min-w-0 flex-1 rounded-md text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
								onclick={openFullSearchPage}
								aria-label="Edit search on full search page"
							>
								<span class="block text-sm font-medium leading-snug">{results.query}</span>
								<span class="block text-xs font-normal text-base-content/65">
									Most glopped answer · tap to edit search
								</span>
							</button>
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
										class="h-9 w-9 rounded-lg object-cover"
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
							No gloops yet for
							<button
								type="button"
								class="font-medium text-primary underline-offset-2 hover:underline"
								onclick={openFullSearchPage}
							>
								“{results.query}”
							</button>. Add the first link below.
						</div>
					{/if}

					<AddGlopForm
						class="mt-5"
						bind:gloopUrl
						submitState={gloopSubmit}
						errorMessage={gloopError}
						onsubmit={submitGloop}
					/>
				{/if}
			</div>

			<div class="flex flex-wrap items-center justify-between gap-2 border-t border-base-300 px-4 py-3 sm:px-5">
				{#if results?.query}
					<a
						href={gloopglopSearchPageHref(results.query)}
						class="link link-primary text-sm no-underline hover:underline"
					>
						Open full search page
					</a>
				{:else}
					<a
						href={gloopglopSearchPageHref()}
						class="link link-primary text-sm no-underline hover:underline"
					>
						Open search page
					</a>
				{/if}
				<button type="button" class="btn btn-ghost btn-sm" onclick={close}>Close</button>
			</div>
		</div>
	</div>
{/if}
