<script lang="ts">
	import { browser } from '$app/environment';
	import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import { downloadCreatorSiteYaml } from '$lib/client/links-create-site-yaml';
	import { submitLinksCreateForm } from '$lib/client/links-create-submit';
	import { linksFade } from '$lib/links-page-transition';
	import {
		LINKS_CREATE_CONTEXT_KEY,
		type LinksCreateContextState
	} from '$lib/links-create-context';

	const linksCreateState = getContext<LinksCreateContextState>(LINKS_CREATE_CONTEXT_KEY);

	let submitting = $state(false);
	let downloading = $state(false);
	let submitError = $state('');
	let submitSuccess = $state(false);
	let submitMessage = $state('Your page is live.');
	let publishedSiteId = $state<string | null>(null);
	let downloadError = $state('');

	const primaryBtnClass =
		'btn min-w-[10rem] border-[#5f9626] bg-[#7ac943] text-[#10210a] hover:border-[#4c7a1f] hover:bg-[#6fb93b] disabled:cursor-not-allowed disabled:opacity-50';

	async function publishPage() {
		if (submitting || submitSuccess || downloading) return;
		submitting = true;
		submitError = '';
		const result = await submitLinksCreateForm(linksCreateState);
		submitting = false;
		if (!result.ok) {
			submitError = result.error;
			return;
		}
		submitMessage = result.message?.trim() || 'Your page is live.';
		publishedSiteId = result.siteId?.trim() || null;
		submitSuccess = true;
	}

	const publishedHref = $derived.by(() => {
		if (!publishedSiteId) return null;
		if (!browser) return `https://${publishedSiteId}.gloopglop.com/`;
		const host = window.location.hostname;
		if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')) {
			const port = window.location.port || '8787';
			return `http://${publishedSiteId}.localhost:${port}/`;
		}
		return `https://${publishedSiteId}.gloopglop.com/`;
	});

	async function downloadSiteYaml() {
		if (downloading || submitting) return;
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

<div class="relative mx-auto mt-4 flex w-full max-w-md flex-col items-center">
	{#if submitSuccess}
		<div class="flex flex-col items-center gap-3" in:fade={linksFade}>
			<p class="text-sm opacity-80">{submitMessage}</p>
			{#if publishedHref && publishedSiteId}
				<a
					class="btn btn-outline btn-sm"
					href={publishedHref}
					target="_blank"
					rel="noopener noreferrer"
				>
					Open page
				</a>
			{/if}
			<a href="/links" class="btn btn-ghost btn-sm">Back to Links</a>
		</div>
	{:else}
		<div
			class="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center"
		>
			<button
				type="button"
				class="btn btn-outline min-w-[10rem]"
				disabled={submitting || downloading}
				onclick={downloadSiteYaml}
			>
				{downloading ? 'Preparing…' : 'Download site YAML'}
			</button>
			<button
				type="button"
				class={primaryBtnClass}
				disabled={submitting || downloading}
				onclick={publishPage}
			>
				{submitting ? 'Publishing…' : 'Publish page'}
			</button>
		</div>
		{#if submitError}
			<p class="mt-3 text-sm text-error">{submitError}</p>
		{/if}
		{#if downloadError}
			<p class="mt-3 text-sm text-error">{downloadError}</p>
		{/if}
	{/if}
</div>
