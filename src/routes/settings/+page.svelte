<script lang="ts">
	import { goto } from '$app/navigation';
	import GlopSearchFooter from '$lib/components/GlopSearchFooter.svelte';
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
	import IconCog from '~icons/mdi/cog';

	function leaveSettings() {
		void goto('/', { replaceState: true });
	}
</script>

<div class="flex min-h-screen flex-col bg-base-200">
	<main class="flex-1 overflow-y-auto">
		<div class="mx-auto w-full max-w-[800px] px-4 py-4 sm:px-5 sm:py-6">
			<div class="mb-4 flex items-center gap-2">
				<IconCog class="h-5 w-5 text-base-content/70" aria-hidden="true" />
				<h1 class="text-lg font-bold">Settings</h1>
			</div>
			<SettingsPanel onDone={leaveSettings} />
		</div>
	</main>
	<GlopSearchFooter showSettings={false} />
	<Icons8BoogerAttribution />
</div>
