<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { PageYaml } from '$lib/server/content';
	import type { ResolvedSite } from '$lib/server/sites';
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';
	import LoadingGloop from '$lib/components/LoadingGloop.svelte';
	import GlopSearchModal from '$lib/components/GlopSearchModal.svelte';
	import { GLOOPGLOP_SEARCH_PAGE_FOCUS_HREF } from '$lib/gloopglop-search-nav';
	import { resolveGloopIconUrl, subscribeCustomGloopIcon } from '$lib/client/gloopglop-custom-icon';
	import { GLOOPGLOP_DEFAULT_LOGO_URL } from '$lib/glop-link-image';
	import IconMagnify from '~icons/mdi/magnify';

	type LayoutData = {
		site: ResolvedSite | null;
		notFoundForError: { site: ResolvedSite; page: PageYaml } | null;
	};

	type GloopErrorContent = {
		code: string;
		headline: string;
		searchQuery: string;
		showTryAgain: boolean;
		showWatchMock: boolean;
	};

	let { data }: { data: LayoutData } = $props();

	const site = $derived(data.notFoundForError?.site ?? data.site);
	const themeName = $derived(
		site?.theme?.preset && (site.theme.preset === 'light' || site.theme.preset === 'dark')
			? site.theme.preset
			: site?.theme?.mode === 'light' || site?.theme?.mode === 'dark'
				? site.theme.mode
				: 'gloopglop'
	);
	const pageBg = $derived(
		typeof site?.theme?.overrides?.['base-200'] === 'string' ? site.theme.overrides['base-200'] : undefined
	);

	const BOOGER_SPIN_MS = 2000;

	let heroIconUrl = $state(GLOOPGLOP_DEFAULT_LOGO_URL);
	let boogerExhausted = $state(false);
	let searchModalOpen = $state(false);
	let activeSearchQuery = $state('');

	const isWatchPath = $derived(/^\/watch\/?$/.test(page.url.pathname));
	const watchMockHref = $derived.by(() => {
		const next = new URL(page.url);
		next.searchParams.set('mock', '1');
		return `${next.pathname}${next.search}`;
	});

	const gloopErrorContent = $derived.by((): GloopErrorContent | null => {
		if (page.status === 503) {
			return {
				code: '503 Error',
				headline: 'The gloops got glopped too hard',
				searchQuery: 'what is a 503 error',
				showTryAgain: true,
				showWatchMock: isWatchPath
			};
		}
		if (page.status === 404) {
			return {
				code: '404 Error',
				headline: 'This page got lost in the gloop',
				searchQuery: 'what is a 404 error',
				showTryAgain: false,
				showWatchMock: false
			};
		}
		return null;
	});

	onMount(() => {
		const stopIconSync = subscribeCustomGloopIcon(() => {
			heroIconUrl = resolveGloopIconUrl();
		});

		if (page.status !== 404 && page.status !== 503) {
			return stopIconSync;
		}

		const timer = setTimeout(() => {
			boogerExhausted = true;
		}, BOOGER_SPIN_MS);

		return () => {
			stopIconSync();
			clearTimeout(timer);
		};
	});

	function tryAgain() {
		window.location.reload();
	}

	function goBack() {
		if (typeof history !== 'undefined' && history.length > 1) {
			history.back();
			return;
		}
		window.location.href = '/';
	}

	function openSearchModal(query: string) {
		activeSearchQuery = query;
		searchModalOpen = true;
	}
</script>

<svelte:head>
	{#if page.status === 404}
		<title
			>{data.notFoundForError?.page.seo?.title ??
				data.notFoundForError?.page.title ??
				'Page not found · GloopGlop'}</title
		>
		<meta
			name="description"
			content={data.notFoundForError?.page.seo?.description ??
				'This page does not exist or has moved.'}
		/>
	{:else if page.status === 503}
		<title>Gloop overload · GloopGlop</title>
		<meta name="description" content="GloopGlop is temporarily unavailable. The gloops are still glopping." />
	{:else}
		<title>{page.status}</title>
	{/if}
</svelte:head>

{#if gloopErrorContent}
	<div
		class="flex min-h-screen flex-col bg-gradient-to-b from-base-200 via-base-200 to-base-300/50"
		data-theme={themeName}
		style={pageBg ? `background-color: ${pageBg};` : undefined}
	>
		<main class="flex flex-1 flex-col items-center justify-center px-4 py-12">
			<div class="mx-auto w-full max-w-lg text-center">
				<div
					class="relative mx-auto mb-6 grid h-28 w-28 place-items-center rounded-full border-4 transition-all duration-1000 ease-out {boogerExhausted
						? 'border-base-content/20 grayscale'
						: 'border-primary/20 border-t-primary motion-safe:animate-spin'}"
				>
					<img
						src={heroIconUrl}
						alt=""
						class="h-12 w-12 rounded-xl object-cover transition-all duration-1000 ease-out {boogerExhausted
							? 'grayscale opacity-45'
							: ''}"
						width="48"
						height="48"
						decoding="async"
					/>
				</div>

				<p class="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
					{gloopErrorContent.code}
				</p>
				<h1 class="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
					{gloopErrorContent.headline}
				</h1>

				<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
					{#if gloopErrorContent.showTryAgain}
						<button
							type="button"
							class="btn border-[#5f9626] bg-[#7ac943] text-[#10210a] hover:border-[#4c7a1f] hover:bg-[#6fb93b]"
							onclick={tryAgain}
						>
							Try again
						</button>
					{/if}
					{#if gloopErrorContent.showWatchMock}
						<a
							href={watchMockHref}
							class="btn btn-outline border-primary/30 hover:border-primary hover:bg-primary/10"
						>
							View with mock data
						</a>
					{/if}
					{#if page.status === 404}
						<button
							type="button"
							class="btn border-[#5f9626] bg-[#7ac943] text-[#10210a] hover:border-[#4c7a1f] hover:bg-[#6fb93b]"
							onclick={goBack}
						>
							Go back
						</button>
					{/if}
					<a
						href="/"
						class="btn btn-outline border-primary/30 hover:border-primary hover:bg-primary/10"
					>
						Go home
					</a>
				</div>
			</div>
		</main>

		<div class="mx-auto flex w-full max-w-lg items-center gap-2 px-4 pb-4 text-left sm:gap-3">
			<a
				href={GLOOPGLOP_SEARCH_PAGE_FOCUS_HREF}
				class="shrink-0 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:hover:scale-110"
				aria-label="GloopGlop search"
			>
				<LoadingGloop spinning={false} size="sm" alt="" />
			</a>
			<button
				type="button"
				class="group flex min-w-0 flex-1 items-center rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-200"
				onclick={() => openSearchModal(gloopErrorContent.searchQuery)}
				aria-label="Search: {gloopErrorContent.searchQuery}"
			>
				<span
					class="input input-bordered flex h-12 min-w-0 flex-1 cursor-pointer items-center gap-2 bg-base-100 px-3 shadow-sm transition-colors hover:border-primary/40 hover:bg-base-100"
				>
					<IconMagnify class="h-5 w-5 shrink-0 text-base-content/60" />
					<span class="min-w-0 flex-1 truncate text-left text-base text-base-content">
						{gloopErrorContent.searchQuery}<span class="gloop-error-cursor"></span>
					</span>
				</span>
			</button>
		</div>

		{#if searchModalOpen}
			<GlopSearchModal bind:open={searchModalOpen} initialQuery={activeSearchQuery} />
		{/if}

		<Icons8BoogerAttribution />
	</div>
{:else}
	<div
		class="flex min-h-screen flex-col items-center justify-center gap-4 bg-base-200 p-8"
		data-theme={themeName}
		style={pageBg ? `background-color: ${pageBg};` : undefined}
	>
		<LoadingGloop spinning size="lg" />
		<h1 class="text-4xl font-bold">{page.status}</h1>
		<p class="max-w-md text-center opacity-80">{page.error?.message ?? 'Something went wrong.'}</p>
		<a
			class="btn border-[#5f9626] bg-[#7ac943] text-[#10210a] hover:border-[#4c7a1f] hover:bg-[#6fb93b]"
			href="/"
		>
			Go home
		</a>
	</div>
{/if}

<style>
	.gloop-error-cursor {
		display: inline-block;
		width: 2px;
		height: 1.05em;
		margin-left: 1px;
		vertical-align: text-bottom;
		background-color: currentColor;
		animation: gloop-error-cursor-blink 1s step-end infinite;
	}

	@keyframes gloop-error-cursor-blink {
		0%,
		49% {
			opacity: 1;
		}
		50%,
		100% {
			opacity: 0;
		}
	}
</style>
