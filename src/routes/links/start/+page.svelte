<script lang="ts">
	import { goto } from '$app/navigation';
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';
	import { importLinksCreatePage } from '$lib/client/links-create-import';
	import { resetLinksCreateSession } from '$lib/client/links-create-state';
	import { LINKS_PAGE_FADE_MS } from '$lib/links-page-transition';

	let buttonVisible = $state(true);
	let editMode = $state(false);
	let pageUrl = $state('');
	let importing = $state(false);
	let importError = $state('');

	function onGloopClick() {
		if (!buttonVisible || editMode) return;
		resetLinksCreateSession();
		buttonVisible = false;
		window.setTimeout(() => {
			goto('/links/create/hello');
		}, LINKS_PAGE_FADE_MS);
	}

	function openEditMode() {
		if (!buttonVisible || editMode) return;
		editMode = true;
		importError = '';
	}

	function cancelEditMode() {
		editMode = false;
		pageUrl = '';
		importError = '';
	}

	async function onImportClick() {
		if (importing) return;
		importing = true;
		importError = '';
		const result = await importLinksCreatePage(pageUrl);
		importing = false;
		if (!result.ok) {
			importError = result.error;
			return;
		}
		buttonVisible = false;
		window.setTimeout(() => {
			goto('/links/create/customize');
		}, LINKS_PAGE_FADE_MS);
	}
</script>

<svelte:head>
	<title>Links · GloopGlop</title>
	<meta name="description" content="GloopGlop creator links." />
</svelte:head>

<div class="flex min-h-screen flex-col">
	<div class="flex flex-1 items-center justify-center px-4">
		<div
			class="flex w-full max-w-md flex-col items-center gap-4 transition-opacity duration-[400ms] {buttonVisible
				? 'opacity-100'
				: 'pointer-events-none opacity-0'}"
		>
			{#if editMode}
				<div class="w-full rounded-2xl border border-base-content/10 bg-base-100 p-5 shadow-sm">
					<label class="form-control w-full">
						<div class="label pb-1">
							<span class="label-text font-medium">Link to your existing page</span>
						</div>
						<input
							type="url"
							class="input input-bordered w-full"
							placeholder="thecoopgal.gloopglop.com"
							bind:value={pageUrl}
							disabled={importing}
							onkeydown={(event) => {
								if (event.key === 'Enter') onImportClick();
							}}
						/>
					</label>
					<div class="mt-4 flex flex-col gap-2 sm:flex-row">
						<button
							type="button"
							class="btn btn-outline flex-1"
							disabled={importing}
							onclick={cancelEditMode}
						>
							Cancel
						</button>
						<button
							type="button"
							class="btn btn-primary flex-1"
							disabled={importing || !pageUrl.trim()}
							onclick={onImportClick}
						>
							{importing ? 'Loading…' : 'Open in editor'}
						</button>
					</div>
					{#if importError}
						<p class="mt-3 text-sm text-error">{importError}</p>
					{/if}
				</div>
			{:else}
				<button
					type="button"
					class="btn btn-primary btn-lg rounded-2xl px-10"
					onclick={onGloopClick}
				>
					Gloop my Glop
				</button>
				<button
					type="button"
					class="btn btn-outline btn-lg rounded-2xl px-10"
					onclick={openEditMode}
				>
					Edit existing page
				</button>
			{/if}
		</div>
	</div>
	<Icons8BoogerAttribution />
</div>
