<script lang="ts">
	import { page } from '$app/state';
	import type { PageYaml } from '$lib/server/content';
	import type { ResolvedSite, SiteNavLink } from '$lib/server/sites';
	import LandingPage from '$lib/components/page-layouts/LandingPage.svelte';
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';

	type LayoutData = {
		notFoundForError: { site: ResolvedSite; page: PageYaml } | null;
	};

	let { data }: { data: LayoutData } = $props();

	const site = $derived(data.notFoundForError?.site);
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

	function navLinkAttrs(link: SiteNavLink) {
		return {
			'data-open-mode': link.open_mode ?? undefined,
			'data-modal': link.modal ?? undefined
		};
	}
</script>

<svelte:head>
	{#if page.status === 404 && data.notFoundForError}
		<title>{data.notFoundForError.page.seo?.title ?? data.notFoundForError.page.title ?? 'Not found'}</title>
		{#if data.notFoundForError.page.seo?.description}
			<meta name="description" content={data.notFoundForError.page.seo.description} />
		{/if}
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
{:else}
	<div class="flex min-h-screen flex-col items-center justify-center gap-4 bg-base-200 p-8" data-theme="light">
		<h1 class="text-4xl font-bold">{page.status}</h1>
		<p class="max-w-md text-center opacity-80">{page.error?.message ?? 'Something went wrong.'}</p>
		<a class="btn btn-primary" href="/">Go home</a>
	</div>
{/if}
