<script lang="ts">
	import { page } from '$app/state';
	import { linksShellReceive, linksShellSend } from '$lib/links-page-transition';

	let { children } = $props();

	const transitionKey = $derived(
		page.url.pathname.startsWith('/links/create') ? '/links/create' : page.url.pathname
	);
</script>

<div class="gloopglop-links min-h-screen bg-base-200">
	<div class="relative grid min-h-screen [&>*]:col-start-1 [&>*]:row-start-1">
		{#key transitionKey}
			<div
				class="min-h-screen w-full"
				in:linksShellReceive={{ key: transitionKey }}
				out:linksShellSend={{ key: transitionKey }}
			>
				{@render children()}
			</div>
		{/key}
	</div>
</div>

<style>
	.gloopglop-links {
		--color-primary: oklch(62% 0.18 155);
		--color-primary-content: oklch(98% 0.01 155);
	}
</style>
