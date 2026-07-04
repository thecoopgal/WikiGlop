<script lang="ts">
	import { browser } from '$app/environment';
	import type { PageData } from './$types';
	import CreatorPageEditPreview from '$lib/components/CreatorPageEditPreview.svelte';
	import CreatorPageThemeModal from '$lib/components/CreatorPageThemeModal.svelte';
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';
	import {
		applyFormToPage,
		formFromPage,
		type CreatorPageEditForm
	} from '$lib/content-page-edit';
	import {
		creatorCardPreviewStyle,
		creatorPageBackgroundStyle,
		creatorPageColorsToStyle
	} from '$lib/client/links-create-page-colors';
	import {
		GLOOPGLOP_CUSTOM_COLOR_FIELDS,
		type GloopglopCustomColorKey,
		type GloopglopCustomColors
	} from '$lib/daisy-theme-colors';
	import type { PageYaml } from '$lib/server/content';
	import IconPaletteOutline from '~icons/mdi/palette-outline';

	let { data }: { data: PageData } = $props();

	function emptyColors(): GloopglopCustomColors {
		return Object.fromEntries(
			GLOOPGLOP_CUSTOM_COLOR_FIELDS.map(({ key }) => [key, ''])
		) as GloopglopCustomColors;
	}

	function colorsFromOverrides(
		overrides: Record<string, string> | null | undefined
	): GloopglopCustomColors {
		const base = emptyColors();
		if (!overrides) return base;
		const allowed = new Set<GloopglopCustomColorKey>(
			GLOOPGLOP_CUSTOM_COLOR_FIELDS.map(({ key }) => key)
		);
		for (const [key, value] of Object.entries(overrides)) {
			if (!allowed.has(key as GloopglopCustomColorKey)) continue;
			if (typeof value !== 'string' || !value.trim()) continue;
			base[key as GloopglopCustomColorKey] = value.trim();
		}
		return base;
	}

	function applyFormState(form: CreatorPageEditForm, page: PageYaml, overrides: Record<string, string> | null) {
		pageSnapshot = page;
		names = [...form.names];
		tagline = form.tagline;
		bio = form.bio;
		avatar = form.avatar;
		links = form.links.map((l) => ({ ...l }));
		colors = colorsFromOverrides(overrides);
	}

	let pageSnapshot = $state(data.page);
	let names = $state<string[]>([...data.form.names]);
	let tagline = $state(data.form.tagline);
	let bio = $state(data.form.bio);
	let avatar = $state(data.form.avatar);
	let links = $state(data.form.links.map((l) => ({ ...l })));
	let colors = $state<GloopglopCustomColors>(colorsFromOverrides(data.themeOverrides));
	let hasDraft = $state(data.hasDraft);
	let themeOpen = $state(false);

	let publishedPage = $state(data.publishedPage);
	let publishedForm = $state(data.publishedForm);
	let publishedThemeOverrides = $state(data.publishedThemeOverrides);

	let busy = $state(false);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	const themeMode = $derived(
		data.themeMode === 'dark' || data.themeMode === 'light' ? data.themeMode : 'light'
	);

	const pageStyle = $derived.by(() => {
		const bg = creatorPageBackgroundStyle(colors);
		const all = creatorPageColorsToStyle(colors);
		return [bg, all].filter(Boolean).join('; ') || undefined;
	});

	const cardStyle = $derived(creatorCardPreviewStyle(colors));

	function liveHref(siteId: string): string {
		if (!browser) return `https://${siteId}.gloopglop.com/`;
		const host = window.location.hostname;
		if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')) {
			const port = window.location.port || '8787';
			return `http://${siteId}.localhost:${port}/`;
		}
		return `https://${siteId}.gloopglop.com/`;
	}

	function themeOverridesPayload(): Record<string, string> {
		const overrides: Record<string, string> = {};
		for (const { key } of GLOOPGLOP_CUSTOM_COLOR_FIELDS) {
			const value = colors[key]?.trim();
			if (!value) continue;
			overrides[key] = value;
		}
		return overrides;
	}

	function buildPageFromForm(): PageYaml {
		const form: CreatorPageEditForm = {
			names,
			tagline,
			bio,
			avatar,
			links
		};
		return applyFormToPage(pageSnapshot, form);
	}

	async function saveDraft() {
		if (busy) return;
		busy = true;
		errorMessage = null;
		successMessage = null;
		try {
			const page = buildPageFromForm();
			const res = await fetch(
				`/api/content/sites/${encodeURIComponent(data.siteId)}/pages/index/draft`,
				{
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						page,
						themeOverrides: themeOverridesPayload()
					})
				}
			);
			const body = (await res.json().catch(() => null)) as { message?: string } | null;
			if (!res.ok) {
				errorMessage = body?.message?.trim() || 'Could not save draft.';
				return;
			}
			pageSnapshot = page;
			hasDraft = true;
			successMessage = 'Draft saved.';
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Could not save draft.';
		} finally {
			busy = false;
		}
	}

	async function discardDraft() {
		if (busy || !hasDraft) return;
		busy = true;
		errorMessage = null;
		successMessage = null;
		try {
			const res = await fetch(
				`/api/content/sites/${encodeURIComponent(data.siteId)}/pages/index/draft`,
				{ method: 'DELETE' }
			);
			const body = (await res.json().catch(() => null)) as { message?: string } | null;
			if (!res.ok) {
				errorMessage = body?.message?.trim() || 'Could not discard draft.';
				return;
			}
			applyFormState(publishedForm, publishedPage, publishedThemeOverrides);
			hasDraft = false;
			successMessage = 'Draft discarded.';
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Could not discard draft.';
		} finally {
			busy = false;
		}
	}

	async function publish() {
		if (busy) return;
		busy = true;
		errorMessage = null;
		successMessage = null;

		try {
			const page = buildPageFromForm();
			const overrides = themeOverridesPayload();

			const pageRes = await fetch(
				`/api/content/sites/${encodeURIComponent(data.siteId)}/pages/index`,
				{
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ page })
				}
			);
			const pageBody = (await pageRes.json().catch(() => null)) as { message?: string } | null;
			if (!pageRes.ok) {
				errorMessage = pageBody?.message?.trim() || 'Could not publish page.';
				return;
			}

			const themeRes = await fetch(`/api/content/sites/${encodeURIComponent(data.siteId)}`, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ themeOverrides: overrides })
			});
			const themeBody = (await themeRes.json().catch(() => null)) as { message?: string } | null;
			if (!themeRes.ok) {
				errorMessage = themeBody?.message?.trim() || 'Page published, but theme failed to save.';
				pageSnapshot = page;
				return;
			}

			await fetch(`/api/content/sites/${encodeURIComponent(data.siteId)}/pages/index/draft`, {
				method: 'DELETE'
			});

			const published = formFromPage(page);
			if (published) {
				publishedPage = page;
				publishedForm = published;
				publishedThemeOverrides = Object.keys(overrides).length ? overrides : null;
			}
			pageSnapshot = page;
			hasDraft = false;
			successMessage = 'Published.';
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Could not publish page.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Edit {data.siteName} · GloopGlop</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-base-200" data-theme={themeMode} style={pageStyle}>
	<main class="mx-auto w-full max-w-[500px] flex-1 px-4 pb-36 pt-4 sm:px-6">
		<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
			<a class="btn btn-ghost btn-sm" href="/pages">← My pages</a>
			<div class="flex flex-wrap gap-2">
				<button type="button" class="btn btn-outline btn-sm gap-1" onclick={() => (themeOpen = true)}>
					<IconPaletteOutline class="h-4 w-4" aria-hidden="true" />
					Edit theme
				</button>
				<a
					class="btn btn-outline btn-sm"
					href={liveHref(data.siteId)}
					target="_blank"
					rel="noopener noreferrer"
				>
					Open live
				</a>
			</div>
		</div>

		{#if hasDraft}
			<div class="alert alert-warning mb-3 py-2 text-sm">
				<span>Editing a draft. Live page is unchanged until you publish.</span>
			</div>
		{/if}

		<p class="mb-1 text-center text-xs opacity-60">
			Tap photo, name, tagline, bio, or links to edit
		</p>

		<CreatorPageEditPreview
			bind:names
			bind:tagline
			bind:bio
			bind:avatar
			bind:links
			cardStyle={cardStyle}
		/>

		{#if errorMessage}
			<div class="alert alert-error mt-4 text-sm"><span>{errorMessage}</span></div>
		{/if}
		{#if successMessage}
			<div class="alert alert-success mt-4 text-sm"><span>{successMessage}</span></div>
		{/if}
	</main>

	<div
		class="fixed inset-x-0 bottom-0 z-40 border-t border-base-300 bg-base-100/95 px-4 py-3 backdrop-blur"
	>
		<div class="mx-auto flex w-full max-w-[500px] flex-col gap-2">
			<div class="flex gap-2">
				<button
					type="button"
					class="btn btn-outline flex-1"
					disabled={busy}
					onclick={() => void saveDraft()}
				>
					Save as draft
				</button>
				<button
					type="button"
					class="btn btn-ghost flex-1"
					disabled={busy || !hasDraft}
					onclick={() => void discardDraft()}
				>
					Discard draft
				</button>
			</div>
			<button
				type="button"
				class="btn btn-primary w-full"
				disabled={busy}
				onclick={() => void publish()}
			>
				{busy ? 'Working…' : 'Publish'}
			</button>
		</div>
	</div>

	<CreatorPageThemeModal bind:open={themeOpen} bind:colors />
	<Icons8BoogerAttribution />
</div>
