<script lang="ts">
	import { getContext } from 'svelte';
	import { downloadCreatorSiteYaml } from '$lib/client/links-create-site-yaml';
	import {
		THEME_CARDS_DELAY_MS,
		THEME_PROMPT_FADE_MS
	} from '$lib/links-create-theme-timing';
	import {
		LINKS_CREATE_CONTEXT_KEY,
		type LinksCreateContextState
	} from '$lib/links-create-context';
	import { goto } from '$app/navigation';

	const linksCreateState = getContext<LinksCreateContextState>(LINKS_CREATE_CONTEXT_KEY);

	let showActions = $state(false);
	let downloading = $state(false);
	let downloadError = $state('');

	const primaryBtnClass =
		'btn min-w-[10rem] border-[#5f9626] bg-[#7ac943] text-[#10210a] hover:border-[#4c7a1f] hover:bg-[#6fb93b] disabled:cursor-not-allowed disabled:opacity-50';

	$effect(() => {
		showActions = false;
		const actionTimer = window.setTimeout(() => {
			showActions = true;
		}, THEME_CARDS_DELAY_MS);
		return () => window.clearTimeout(actionTimer);
	});

	function goCustomizeColors() {
		goto('/links/create/customize');
	}

	async function downloadSiteYaml() {
		if (downloading) return;
		downloading = true;
		downloadError = '';
		try {
			await downloadCreatorSiteYaml(linksCreateState);
		} catch (error) {
			downloadError =
				error instanceof Error ? error.message : 'Could not prepare the site YAML download.';
		} finally {
			downloading = false;
		}
	}
</script>

<div
	class="relative mx-auto mt-8 flex w-full max-w-md flex-col items-center transition-opacity ease-out {showActions
		? 'opacity-100'
		: 'opacity-0'}"
	style="transition-duration: {THEME_PROMPT_FADE_MS}ms"
	class:pointer-events-none={!showActions}
	aria-hidden={!showActions}
>
	<div class="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
		<button
			type="button"
			class="btn btn-outline min-w-[10rem]"
			tabindex={showActions ? undefined : -1}
			disabled={downloading}
			onclick={goCustomizeColors}
		>
			Continue Glooping
		</button>
		<button
			type="button"
			class={primaryBtnClass}
			tabindex={showActions ? undefined : -1}
			disabled={downloading}
			onclick={downloadSiteYaml}
		>
			{downloading ? 'Preparing…' : 'Download site YAML'}
		</button>
	</div>
	{#if downloadError}
		<p class="mt-3 text-sm text-error">{downloadError}</p>
	{/if}
</div>
