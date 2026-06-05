<script lang="ts">
	import { page } from '$app/state';
	import { GLOOPGLOP_SEARCH_PAGE_FOCUS_HREF } from '$lib/gloopglop-search-nav';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import LoadingGloop from '$lib/components/LoadingGloop.svelte';
	import { isGloopglopSite } from '$lib/daisy-theme-colors';
	import IconCog from '~icons/mdi/cog';
	import IconMagnify from '~icons/mdi/magnify';

	type Props = {
		placeholder?: string;
		initialQuery?: string;
		wrapperClass?: string;
		showSettings?: boolean;
	};

	let {
		placeholder = 'What do you want to glop?',
		initialQuery = '',
		wrapperClass = 'mx-auto w-full max-w-lg',
		showSettings = true
	}: Props = $props();

	const gloopglopPlatform = $derived(isGloopglopSite(page.data.site));
	const showSettingsCog = $derived(showSettings && gloopglopPlatform);

	let settingsOpen = $state(false);

	function openSettingsModal() {
		if (page.url.pathname === '/settings') return;
		settingsOpen = true;
	}
</script>

<div class={wrapperClass}>
	<div class="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
		<a
			href={GLOOPGLOP_SEARCH_PAGE_FOCUS_HREF}
			class="shrink-0 transition-opacity hover:opacity-90"
			aria-label="GloopGlop search"
		>
			<LoadingGloop spinning={false} size="md" />
		</a>
		<form
			method="get"
			action="/search"
			class="flex w-full min-w-0 flex-row items-stretch gap-2 sm:flex-1 sm:gap-3"
		>
			<label class="input input-bordered flex min-w-0 flex-1 items-center gap-2 bg-base-100">
				<IconMagnify class="h-5 w-5 shrink-0 text-base-content/60" aria-hidden="true" />
				<span class="sr-only">Search</span>
				<input
					type="search"
					name="q"
					value={initialQuery}
					{placeholder}
					class="min-w-0 grow"
					autocomplete="off"
					minlength="2"
					maxlength="500"
				/>
			</label>
			<button type="submit" class="btn btn-primary shrink-0">Search</button>
		</form>
		{#if showSettingsCog}
			<button
				type="button"
				class="shrink-0 rounded-lg p-1 text-base-content/60 transition-colors hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-200 motion-safe:transition-transform motion-safe:hover:scale-110 sm:ml-0"
				aria-label="Settings"
				onclick={openSettingsModal}
			>
				<IconCog class="h-6 w-6" />
			</button>
		{/if}
	</div>
</div>

{#if settingsOpen}
	<SettingsModal bind:open={settingsOpen} />
{/if}
