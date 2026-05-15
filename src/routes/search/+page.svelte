<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { navigating } from '$app/state';
	import { browser } from '$app/environment';
	import type { PageData } from './$types';
	import type { GlopAnswerRow } from '$lib/server/glop-search';
	import {
		getOrCreateBrowserClientId
	} from '$lib/client/gloop-browser-glop-limit';
	import { GLOOPGLOP_DEFAULT_LOGO_URL } from '$lib/glop-link-image';
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';
	import IconMagnify from '~icons/mdi/magnify';
	import IconChevronDown from '~icons/mdi/chevron-down';
	import { page } from '$app/state';

	/** Header and all glop result card thumbnails */
	const gloopglopLogoUrl = GLOOPGLOP_DEFAULT_LOGO_URL;

	let { data }: { data: PageData } = $props();

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

	let gloopModalOpen = $state(false);
	let gloopUrl = $state('');
	let gloopSubmit = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let gloopError = $state('');
	let searchInputEl = $state<HTMLInputElement | null>(null);
	/** True while this page’s search is refetching (form submit, client nav to /search, or invalidate after gloop). */
	let searchResultsLoading = $state(false);

	const spinHeaderLogo = $derived(
		searchResultsLoading ||
			(navigating.to != null && navigating.to.url.pathname === '/search')
	);

	function focusSearchInput() {
		const el = searchInputEl;
		if (!el) return;
		el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		queueMicrotask(() => {
			el.focus();
			el.select();
		});
	}

	type GroupedGlop = { answerUrl: string; gloopCount: number };

	/**
	 * One card per canonical URL. Badge = total `glop_answers` rows for stored URLs in that group
	 * (community “upvotes”), falling back to 1 when unknown.
	 */
	const groupedGlops = $derived.by(() => {
		const rows = (data.answers ?? []) as GlopAnswerRow[];
		const canon = data.canonicalHrefByAnswerUrl ?? {};
		const globalMap = data.glopGlobalCountByAnswerUrl ?? {};

		const rawByCanonical = new Map<string, Set<string>>();
		const order: string[] = [];
		const map = new Map<string, GroupedGlop>();

		for (const row of rows) {
			const c = canon[row.answer_url] ?? row.answer_url;
			if (!map.has(c)) {
				map.set(c, { answerUrl: c, gloopCount: 0 });
				order.push(c);
			}
			if (!rawByCanonical.has(c)) rawByCanonical.set(c, new Set());
			rawByCanonical.get(c)!.add(row.answer_url);
		}

		for (const c of order) {
			let sum = 0;
			for (const raw of rawByCanonical.get(c) ?? []) {
				const n = globalMap[raw];
				sum += typeof n === 'number' && n > 0 ? n : 1;
			}
			map.get(c)!.gloopCount = sum;
		}

		return order.map((u) => map.get(u)!);
	});

	/** Sum of per-link glop totals (matches the badges). */
	const totalGloopCount = $derived(groupedGlops.reduce((acc, g) => acc + g.gloopCount, 0));

	const creatorUi = $derived(data.creatorSearchUi);

	const profileGlopGroup = $derived.by(() => {
		const ui = creatorUi;
		if (!ui) return null;
		return groupedGlops.find((g) => g.answerUrl === ui.profileCanonicalUrl) ?? null;
	});

	const creatorBundleCanonSet = $derived(
		creatorUi ? new Set(creatorUi.bundleCanonicalUrls) : null
	);

	/** Canonical groups from this creator’s index (excluding the profile card itself). */
	const nestedCreatorGlopGroups = $derived.by(() => {
		const ui = creatorUi;
		const bundle = creatorBundleCanonSet;
		if (!ui || !bundle) return [] as GroupedGlop[];
		const prof = ui.profileCanonicalUrl;
		return groupedGlops.filter((g) => bundle.has(g.answerUrl) && g.answerUrl !== prof);
	});

	/** Everything not on the creator’s bundled page list. */
	const standaloneGlopGroups = $derived.by(() => {
		const bundle = creatorBundleCanonSet;
		if (!bundle) return groupedGlops;
		return groupedGlops.filter((g) => !bundle.has(g.answerUrl));
	});

	const useCreatorStackLayout = $derived(!!creatorUi && !!profileGlopGroup);

	const isLocalDevHost = $derived.by(() => {
		const h = page.url.hostname.toLowerCase();
		return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost');
	});

	type GlopSeo = { title?: string | null; description?: string | null };

	function isTikTokUrl(answerUrl: string): boolean {
		try {
			const h = new URL(answerUrl).hostname.toLowerCase().replace(/^www\./, '');
			return h === 'tiktok.com' || h.endsWith('.tiktok.com');
		} catch {
			return false;
		}
	}

	/** Always show the URL; use SEO title/description only when they add context (not on TikTok). */
	function glopResultDisplay(answerUrl: string, seo: GlopSeo | undefined) {
		const linkLabel = answerUrl;
		const skipSeo = isTikTokUrl(answerUrl);
		const rawTitle = seo?.title?.trim() ?? '';
		const title =
			skipSeo || !rawTitle || rawTitle === linkLabel ? null : rawTitle;
		const rawDesc = seo?.description?.trim() ?? '';
		const description = skipSeo || !rawDesc ? null : rawDesc;
		return { linkLabel, title, description };
	}

	function openGloopModal() {
		gloopUrl = '';
		gloopSubmit = 'idle';
		gloopError = '';
		gloopModalOpen = true;
	}

	function closeGloopModal() {
		gloopModalOpen = false;
	}

	async function submitGloop() {
		if (!data.query.trim()) return;
		if (!browser) return;
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
			body: JSON.stringify({ query: data.query, url: gloopUrl, clientKey })
		});
		if (!res.ok) {
			gloopSubmit = 'error';
			try {
				const err = await res.json();
				const msg = typeof err?.message === 'string' ? err.message : res.statusText;
				gloopError = msg;
			} catch {
				gloopError = res.statusText || 'Something went wrong.';
			}
			return;
		}
		gloopSubmit = 'success';
		closeGloopModal();
		searchResultsLoading = true;
		try {
			await invalidateAll();
		} finally {
			searchResultsLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Search — {data.site?.name ?? 'GloopGlop'}</title>
	<meta name="description" content="Search community answers on GloopGlop." />
</svelte:head>

<div
	class="gloopglop-search flex min-h-screen flex-col bg-base-200"
	data-theme={themeName}
	style={pageBg ? `background-color: ${pageBg};` : undefined}
>
	<main class="flex flex-1 flex-col px-4 pb-16 pt-10">
		<div class="mx-auto w-full max-w-xl space-y-8">
			<div class="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
				<a
					href="/"
					class="shrink-0 rounded-2xl ring-1 ring-base-300 transition-opacity hover:opacity-90"
					aria-label="GloopGlop home"
				>
					<img
						src={gloopglopLogoUrl}
						alt="GloopGlop"
						class={`h-11 w-11 rounded-2xl object-cover motion-safe:transition-transform motion-safe:duration-500 sm:h-12 sm:w-12${spinHeaderLogo ? ' motion-safe:animate-spin' : ''}`}
						width="48"
						height="48"
						decoding="async"
					/>
				</a>
				<form
					method="get"
					action="/search"
					class="flex w-full min-w-0 flex-row items-stretch gap-2 sm:flex-1 sm:gap-3"
				>
					<label class="input input-bordered flex min-w-0 flex-1 items-center gap-2">
						<IconMagnify class="h-5 w-5 shrink-0 text-base-content/60" aria-hidden="true" />
						<span class="sr-only">Search</span>
						<input
							bind:this={searchInputEl}
							id="glop-search-query-input"
							type="search"
							name="q"
							value={data.query}
							placeholder="What do you want to glop?"
							class="min-w-0 grow"
							autocomplete="off"
							minlength="2"
							maxlength="500"
						/>
					</label>
					<button type="submit" class="btn btn-primary shrink-0">Search</button>
				</form>
			</div>

			{#if data.dbUnavailable}
				<div role="alert" class="alert alert-warning text-sm">
					<span>
						{#if isLocalDevHost}
							Community search needs D1 locally: run <code class="text-xs">npm run db:migrate:local</code>, then
							<code class="text-xs">npm run cf:dev</code> (plain <code class="text-xs">vite dev</code> has no D1).
						{:else}
							Community search could not reach the database. Redeploy with <code class="text-xs">npm run deploy</code>
							after confirming the Worker has a D1 binding named <code class="text-xs">DB</code> (database
							<code class="text-xs">gloopglop</code>), then run
							<code class="text-xs">npm run db:migrate:remote</code>.
						{/if}
					</span>
				</div>
			{/if}

			{#if data.searched && data.query.length >= 2 && !data.dbUnavailable}
				<section class="space-y-6" aria-label="Search results">
					{#if groupedGlops.length > 0}
						<div
							class="card overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm"
							aria-label="{totalGloopCount} community gloops for these links"
						>
							<div class="card-body gap-0 p-0">
								<div
									class="flex items-center gap-4 border-b border-base-300 bg-base-100/80 px-4 py-4"
								>
									<button
										type="button"
										class="group flex min-w-0 flex-1 items-center gap-2 rounded-lg py-0.5 pl-1 pr-2 text-left transition-colors hover:bg-base-200/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
										onclick={focusSearchInput}
										aria-label="Edit search — focus the search box"
									>
										<IconMagnify
											class="h-5 w-5 shrink-0 self-center text-base-content/60 group-hover:text-base-content"
											aria-hidden="true"
										/>
										<span class="min-w-0 flex-1 text-base font-medium leading-snug">{data.query}</span>
									</button>
									<div
										class="relative shrink-0"
										title="Total community gloops for these links (same URL counts together)"
									>
										<img
											src={gloopglopLogoUrl}
											alt=""
											class="h-10 w-10 rounded-xl object-cover ring-1 ring-base-300 sm:h-11 sm:w-11"
											width="44"
											height="44"
											decoding="async"
										/>
										<span
											class="badge absolute -bottom-1 -right-1 min-w-[1.5rem] justify-center border-0 bg-primary px-1.5 text-sm font-bold text-primary-content"
										>
											{totalGloopCount}
										</span>
									</div>
								</div>

								<ul class="divide-y divide-base-300">
									{#if useCreatorStackLayout}
										<li class="px-3 py-3">
											<div
												class="rounded-xl border-2 border-primary bg-primary/10 p-3 shadow-sm ring-1 ring-primary/25"
											>
												<p class="mb-2 text-[11px] font-bold uppercase tracking-wider text-primary">
													GloopGlop page
												</p>
												{#if profileGlopGroup}
													{@const seo = data.seoByUrl[profileGlopGroup.answerUrl]}
													{@const display = glopResultDisplay(profileGlopGroup.answerUrl, seo)}
													<a
														href={profileGlopGroup.answerUrl}
														target="_blank"
														rel="noopener noreferrer"
														title={profileGlopGroup.answerUrl}
														class="group flex cursor-pointer flex-row items-start gap-4 rounded-lg no-underline outline-none transition-colors hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
													>
														<div class="relative shrink-0 self-start">
															<img
																src={gloopglopLogoUrl}
																alt=""
																class="h-11 w-11 rounded-xl object-cover ring-1 ring-primary/40"
																width="44"
																height="44"
																decoding="async"
															/>
															<span
																class="badge badge-sm absolute -bottom-1 -right-1 min-w-[1.25rem] justify-center border-0 bg-primary px-1.5 text-primary-content"
																title="Total gloops for this URL (all questions)"
															>
																{profileGlopGroup.gloopCount}
															</span>
														</div>
														<div class="flex min-w-0 flex-1 flex-col gap-1">
															<p class="text-xs font-medium text-base-content/70">
																{creatorUi?.displayName ?? 'Creator'}
															</p>
															{#if display.title}
																<p class="line-clamp-2 text-base leading-snug opacity-90">
																	{display.title}
																</p>
															{/if}
															{#if display.description}
																<p class="line-clamp-3 text-sm leading-relaxed opacity-75">
																	{display.description}
																</p>
															{/if}
															<p
																class="mt-auto block break-words pt-1 text-sm font-semibold text-primary group-hover:underline"
															>
																{display.linkLabel}
															</p>
														</div>
													</a>
												{/if}

												{#if nestedCreatorGlopGroups.length > 0}
													<details open class="mt-3 rounded-lg border border-base-300 bg-base-100">
														<summary
															class="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold text-base-content hover:bg-base-200/60 [&::-webkit-details-marker]:hidden"
														>
															<span class="flex min-w-0 items-center gap-2">
																<IconChevronDown
																	class="glop-drop-chevron h-4 w-4 shrink-0 text-primary transition-transform duration-200"
																	aria-hidden="true"
																/>
																<span class="truncate">Gloops from this page</span>
															</span>
															<span class="badge badge-sm shrink-0 border-0 bg-primary text-primary-content">
																{nestedCreatorGlopGroups.length}
															</span>
														</summary>
														<ul class="divide-y divide-base-200 border-t border-base-200 bg-base-100/90">
															{#each nestedCreatorGlopGroups as group (group.answerUrl)}
																{@const nSeo = data.seoByUrl[group.answerUrl]}
																{@const display = glopResultDisplay(group.answerUrl, nSeo)}
																<li class="p-0">
																	<a
																		href={group.answerUrl}
																		target="_blank"
																		rel="noopener noreferrer"
																		title={group.answerUrl}
																		class="group flex cursor-pointer flex-row items-start gap-3 px-3 py-3 no-underline outline-none transition-colors hover:bg-base-200/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
																	>
																		<div class="relative shrink-0 self-start">
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
																				title="Total gloops for this URL (all questions)"
																			>
																				{group.gloopCount}
																			</span>
																		</div>
																		<div class="flex min-w-0 flex-1 flex-col gap-0.5">
																			{#if display.title}
																				<p class="line-clamp-2 text-sm leading-snug opacity-85">
																					{display.title}
																				</p>
																			{/if}
																			{#if display.description}
																				<p class="line-clamp-2 text-xs leading-relaxed opacity-70">
																					{display.description}
																				</p>
																			{/if}
																			<p
																				class="mt-auto block break-words pt-1 text-xs font-semibold text-primary group-hover:underline"
																			>
																				{display.linkLabel}
																			</p>
																		</div>
																	</a>
																</li>
															{/each}
														</ul>
													</details>
												{/if}
											</div>
										</li>
										{#if standaloneGlopGroups.length > 0}
											<li class="bg-base-100/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-base-content/55">
												More results
											</li>
										{/if}
										{#each standaloneGlopGroups as group (group.answerUrl)}
											{@const seo = data.seoByUrl[group.answerUrl]}
											{@const display = glopResultDisplay(group.answerUrl, seo)}
											<li class="p-0">
												<a
													href={group.answerUrl}
													target="_blank"
													rel="noopener noreferrer"
													title={group.answerUrl}
													class="group flex cursor-pointer flex-row items-start gap-4 px-4 py-4 no-underline outline-none transition-colors hover:bg-base-200/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
												>
													<div class="relative shrink-0 self-start">
														<img
															src={gloopglopLogoUrl}
															alt=""
															class="h-11 w-11 rounded-xl object-cover ring-1 ring-base-300"
															width="44"
															height="44"
															decoding="async"
														/>
														<span
															class="badge badge-sm absolute -bottom-1 -right-1 min-w-[1.25rem] justify-center border-0 bg-primary px-1.5 text-primary-content"
															title="Total gloops for this URL (all questions)"
														>
															{group.gloopCount}
														</span>
													</div>
													<div class="flex min-w-0 flex-1 flex-col gap-1">
														{#if display.title}
															<p class="line-clamp-2 text-base leading-snug opacity-90">
																{display.title}
															</p>
														{/if}
														{#if display.description}
															<p class="line-clamp-3 text-sm leading-relaxed opacity-75">
																{display.description}
															</p>
														{/if}
														<p
															class="mt-auto block break-words pt-1 text-sm font-semibold text-primary group-hover:underline"
														>
															{display.linkLabel}
														</p>
													</div>
												</a>
											</li>
										{/each}
									{:else}
										{#each groupedGlops as group (group.answerUrl)}
											{@const seo = data.seoByUrl[group.answerUrl]}
											{@const display = glopResultDisplay(group.answerUrl, seo)}
											<li class="p-0">
												<a
													href={group.answerUrl}
													target="_blank"
													rel="noopener noreferrer"
													title={group.answerUrl}
													class="group flex cursor-pointer flex-row items-start gap-4 px-4 py-4 no-underline outline-none transition-colors hover:bg-base-200/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
												>
													<div class="relative shrink-0 self-start">
														<img
															src={gloopglopLogoUrl}
															alt=""
															class="h-11 w-11 rounded-xl object-cover ring-1 ring-base-300"
															width="44"
															height="44"
															decoding="async"
														/>
														<span
															class="badge badge-sm absolute -bottom-1 -right-1 min-w-[1.25rem] justify-center border-0 bg-primary px-1.5 text-primary-content"
															title="Total gloops for this URL (all questions)"
														>
															{group.gloopCount}
														</span>
													</div>
													<div class="flex min-w-0 flex-1 flex-col gap-1">
														{#if display.title}
															<p class="line-clamp-2 text-base leading-snug opacity-90">
																{display.title}
															</p>
														{/if}
														{#if display.description}
															<p class="line-clamp-3 text-sm leading-relaxed opacity-75">
																{display.description}
															</p>
														{/if}
														<p
															class="mt-auto block break-words pt-1 text-sm font-semibold text-primary group-hover:underline"
														>
															{display.linkLabel}
														</p>
													</div>
												</a>
											</li>
										{/each}
									{/if}
								</ul>
							</div>
						</div>
					{:else}
						<div class="card bg-base-100 shadow">
							<div class="card-body gap-3">
								<p class="text-base leading-relaxed">
									This glop isn’t glooped yet. Scroll down to add the first gloop and help the next person.
								</p>
							</div>
						</div>
					{/if}

					<div class="rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-6 text-center">
						<p class="text-base font-medium leading-snug">Not finding your answer?</p>
						<p class="mt-1 text-sm font-medium leading-snug">Some Gloops have many Glops</p>
						<button
							type="button"
							class="btn btn-primary mt-4 inline-flex max-w-full items-center gap-2 px-4"
							onclick={openGloopModal}
							aria-label="Add a glop for this search"
						>
							<IconMagnify class="h-5 w-5 shrink-0" aria-hidden="true" />
							<span class="min-w-0 truncate text-left font-medium">{data.query}</span>
						</button>
						<p class="mt-3 text-sm opacity-80">add another angle, source, or link to this Gloop</p>
					</div>
				</section>
			{/if}
		</div>
	</main>

	<Icons8BoogerAttribution />

	{#if gloopModalOpen}
		<div class="modal modal-open">
			<div
				class="modal-box max-w-lg space-y-4"
				role="dialog"
				aria-modal="true"
				aria-labelledby="glop-modal-query"
			>
				<div
					id="glop-modal-query"
					class="flex items-center gap-2 rounded-lg border border-base-300 bg-base-200 px-3 py-2.5 text-base font-medium leading-snug"
				>
					<IconMagnify class="h-5 w-5 shrink-0 text-base-content/60" aria-hidden="true" />
					<p class="min-w-0 flex-1">{data.query}</p>
				</div>
				<label class="form-control w-full">
					<input
						type="text"
						class="input input-bordered w-full"
						placeholder="gloop.gg/… or https://…"
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
				<div class="modal-action mt-2 flex-wrap gap-2">
					<button type="button" class="btn btn-primary" disabled={gloopSubmit === 'loading'} onclick={submitGloop}>
						{gloopSubmit === 'loading' ? 'Saving…' : 'Submit'}
					</button>
					<button
						type="button"
						class="btn btn-ghost"
						disabled={gloopSubmit === 'loading'}
						onclick={closeGloopModal}
					>
						Cancel
					</button>
				</div>
			</div>
			<div class="modal-backdrop">
				<button type="button" aria-label="Close" onclick={closeGloopModal}>close</button>
			</div>
		</div>
	{/if}
</div>

<style>
	/* GloopGlop brand green (Daisy dark default primary is blue). */
	.gloopglop-search {
		--color-primary: oklch(62% 0.18 155);
		--color-primary-content: oklch(98% 0.01 155);
	}

	.gloopglop-search details[open] .glop-drop-chevron {
		transform: rotate(180deg);
	}
</style>
