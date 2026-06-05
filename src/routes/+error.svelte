<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { PageYaml } from '$lib/server/content';
	import type { ResolvedSite, SiteNavLink } from '$lib/server/sites';
	import LandingPage from '$lib/components/page-layouts/LandingPage.svelte';
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';
	import LoadingGloop from '$lib/components/LoadingGloop.svelte';
	import GlopSearchModal from '$lib/components/GlopSearchModal.svelte';
	import IconMagnify from '~icons/mdi/magnify';

	type LayoutData = {
		site: ResolvedSite | null;
		notFoundForError: { site: ResolvedSite; page: PageYaml } | null;
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

	const BOOGER_ICON_URL = 'https://img.icons8.com/color/96/booger.png';
	const BOOGER_SPIN_MS = 2000;
	const SEARCH_INSTEAD_QUERY = 'what is a 503 error';

	let boogerExhausted = $state(false);
	let searchModalOpen = $state(false);

	onMount(() => {
		if (page.status !== 503) return;
		const timer = setTimeout(() => {
			boogerExhausted = true;
		}, BOOGER_SPIN_MS);
		return () => clearTimeout(timer);
	});

	function navLinkAttrs(link: SiteNavLink) {
		return {
			'data-open-mode': link.open_mode ?? undefined,
			'data-modal': link.modal ?? undefined
		};
	}

	function tryAgain() {
		window.location.reload();
	}

	function openSearchModal() {
		searchModalOpen = true;
	}
</script>

<svelte:head>
	{#if page.status === 404 && data.notFoundForError}
		<title>{data.notFoundForError.page.seo?.title ?? data.notFoundForError.page.title ?? 'Not found'}</title>
		{#if data.notFoundForError.page.seo?.description}
			<meta name="description" content={data.notFoundForError.page.seo.description} />
		{/if}
	{:else if page.status === 503}
		<title>Gloop overload · GloopGlop</title>
		<meta name="description" content="GloopGlop is temporarily unavailable. The gloops are still glopping." />
	{:else}
		<title>{page.status}</title>
	{/if}
</svelte:head>

{#if page.status === 404 && data.notFoundForError}
	<div
		class="flex min-h-screen flex-col bg-base-200"
		data-theme={themeName}
		style={pageBg ? `background-color: ${pageBg};` : undefined}
	>
		{#if data.notFoundForError.page.page_settings?.show_header !== false && data.notFoundForError.site.navigation?.header}
			<div class="navbar bg-base-100 shadow-sm">
				<div class="navbar-start">
					<a class="btn btn-ghost text-xl" href="/"
						>{data.notFoundForError.site.name ?? data.notFoundForError.site.id}</a
					>
				</div>
				<div class="navbar-center hidden md:flex">
					<ul class="menu menu-horizontal px-1">
						{#each data.notFoundForError.site.navigation.header as link}
							<li>
								<a href={link.href} {...navLinkAttrs(link)}>{link.label}</a>
							</li>
						{/each}
					</ul>
				</div>
				<div class="navbar-end"></div>
			</div>
		{/if}

		<main class="flex-1">
			<LandingPage site={data.notFoundForError.site} page={data.notFoundForError.page} />
		</main>

		<Icons8BoogerAttribution />
	</div>
{:else if page.status === 503}
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
						src={BOOGER_ICON_URL}
						alt=""
						class="h-12 w-12 object-contain transition-all duration-1000 ease-out {boogerExhausted
							? 'grayscale opacity-45'
							: ''}"
						width="48"
						height="48"
						decoding="async"
					/>
				</div>

				<p class="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">503 Error</p>
				<h1 class="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
					The gloops got glopped too hard
				</h1>

				<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
					<button
						type="button"
						class="btn border-[#5f9626] bg-[#7ac943] text-[#10210a] hover:border-[#4c7a1f] hover:bg-[#6fb93b]"
						onclick={tryAgain}
					>
						Try again
					</button>
					<a
						href="/"
						class="btn btn-outline border-primary/30 hover:border-primary hover:bg-primary/10"
					>
						Go home
					</a>
				</div>
			</div>
		</main>

		<div class="mx-auto w-full max-w-lg px-4 pb-4 text-left">
			<button
				type="button"
				class="group flex w-full items-center gap-2 sm:gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-200 rounded-xl"
				onclick={openSearchModal}
				aria-label="Search: {SEARCH_INSTEAD_QUERY}"
			>
				<span
					class="shrink-0 rounded-xl ring-1 ring-base-300 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:scale-110"
				>
					<LoadingGloop spinning={false} size="sm" alt="" />
				</span>
				<span
					class="input input-bordered flex h-12 min-w-0 flex-1 cursor-pointer items-center gap-2 bg-base-100 px-3 shadow-sm transition-colors hover:border-primary/40 hover:bg-base-100"
				>
					<IconMagnify class="h-5 w-5 shrink-0 text-base-content/60" />
					<span class="min-w-0 flex-1 truncate text-left text-base text-base-content">
						{SEARCH_INSTEAD_QUERY}<span class="error503-cursor"></span>
					</span>
				</span>
			</button>
		</div>

		{#if searchModalOpen}
			<GlopSearchModal bind:open={searchModalOpen} initialQuery={SEARCH_INSTEAD_QUERY} />
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
	.error503-cursor {
		display: inline-block;
		width: 2px;
		height: 1.05em;
		margin-left: 1px;
		vertical-align: text-bottom;
		background-color: currentColor;
		animation: error503-cursor-blink 1s step-end infinite;
	}

	@keyframes error503-cursor-blink {
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
