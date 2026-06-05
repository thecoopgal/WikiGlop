<script lang="ts">
	import { page } from '$app/state';
	import GlopSearchModal from '$lib/components/GlopSearchModal.svelte';
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
		placeholder = 'Search GloopGlop',
		initialQuery = '',
		wrapperClass = 'mx-auto w-full max-w-lg px-4 pb-4 text-left',
		showSettings = true
	}: Props = $props();

	const displayQuery = $derived(initialQuery.trim());
	const barLabel = $derived(displayQuery || placeholder);
	const showsPlaceholder = $derived(!displayQuery);
	const gloopglopPlatform = $derived(isGloopglopSite(page.data.site));
	const showSettingsCog = $derived(showSettings && gloopglopPlatform);

	let modalOpen = $state(false);
	let settingsOpen = $state(false);
	let activeQuery = $state('');

	function openSearchModal() {
		activeQuery = displayQuery;
		modalOpen = true;
	}

	function openSettingsModal() {
		if (page.url.pathname === '/settings') return;
		settingsOpen = true;
	}
</script>

<div class={wrapperClass}>
	<div class="flex items-center gap-2 sm:gap-3">
		<button
			type="button"
			class="group flex min-w-0 flex-1 items-center gap-2 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-200 sm:gap-3"
			onclick={openSearchModal}
			aria-label={barLabel}
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
				<span
					class="min-w-0 flex-1 truncate text-left text-base {showsPlaceholder
						? 'text-base-content/55'
						: 'text-base-content'}"
				>
					{barLabel}
				</span>
			</span>
		</button>

		{#if showSettingsCog}
			<button
				type="button"
				class="shrink-0 rounded-lg p-1 text-base-content/60 transition-colors hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-200 motion-safe:transition-transform motion-safe:hover:scale-110"
				aria-label="Settings"
				onclick={openSettingsModal}
			>
				<IconCog class="h-6 w-6" />
			</button>
		{/if}
	</div>
</div>

{#if modalOpen}
	<GlopSearchModal bind:open={modalOpen} initialQuery={activeQuery} />
{/if}

{#if settingsOpen}
	<SettingsModal bind:open={settingsOpen} />
{/if}
