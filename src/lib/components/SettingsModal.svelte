<script lang="ts">
	import { browser } from '$app/environment';
	import { goto, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import GlopSearchFooter from '$lib/components/GlopSearchFooter.svelte';
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
	import IconCog from '~icons/mdi/cog';

	type Props = {
		open: boolean;
		onclose?: () => void;
	};

	let { open = $bindable(false), onclose }: Props = $props();

	const SETTINGS_PATH = '/settings';

	let returnUrlOnOpen = $state('');
	let urlSynced = $state(false);

	$effect(() => {
		if (!open) return;
		if (browser) {
			returnUrlOnOpen = `${page.url.pathname}${page.url.search}`;
		}
		urlSynced = false;
		syncSettingsUrl();
	});

	$effect(() => {
		if (!open || !browser) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') close();
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	});

	function syncSettingsUrl() {
		if (!browser) return;
		replaceState(SETTINGS_PATH, {});
		urlSynced = true;
	}

	function restoreReturnUrl() {
		if (!browser || !urlSynced) return;
		const openedOnSettingsPage =
			returnUrlOnOpen === SETTINGS_PATH || returnUrlOnOpen.startsWith(`${SETTINGS_PATH}?`);
		const target = openedOnSettingsPage ? '/' : returnUrlOnOpen;
		if (!target) return;
		urlSynced = false;
		if (openedOnSettingsPage) {
			void goto(target, { replaceState: true, noScroll: true });
		} else {
			replaceState(target, {});
		}
	}

	function close() {
		restoreReturnUrl();
		open = false;
		onclose?.();
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-[100] flex min-h-screen flex-col bg-base-200"
		role="dialog"
		aria-modal="true"
		aria-label="Settings"
	>
		<main class="flex-1 overflow-y-auto">
			<div class="mx-auto w-full max-w-[800px] px-4 py-4 sm:px-5 sm:py-6">
				<div class="mb-4 flex items-center gap-2">
					<IconCog class="h-5 w-5 text-base-content/70" aria-hidden="true" />
					<h1 class="text-lg font-bold">Settings</h1>
				</div>
				<SettingsPanel active={open} onDone={close} />
			</div>
		</main>
		<GlopSearchFooter showSettings={false} />
		<Icons8BoogerAttribution />
	</div>
{/if}
