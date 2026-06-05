<script lang="ts">
	import { getContext } from 'svelte';
	import {
		THEME_CARDS_DELAY_MS,
		THEME_PROMPT_FADE_MS
	} from '$lib/links-create-theme-timing';
	import {
		LINKS_CREATOR_TAGLINE_MAX_LENGTH,
		setLinksCreateCreatorTagline
	} from '$lib/client/links-create-state';
	import { LINKS_CREATE_CONTEXT_KEY, type LinksCreateContextState } from '$lib/links-create-context';
	import IconClose from '~icons/mdi/close';
	import IconFormatQuoteClose from '~icons/mdi/format-quote-close';

	const linksCreateState = getContext<LinksCreateContextState>(LINKS_CREATE_CONTEXT_KEY);
	let showTaglineField = $state(false);
	let taglineInputEl = $state<HTMLInputElement | null>(null);

	$effect(() => {
		showTaglineField = false;
		const fieldTimer = window.setTimeout(() => {
			showTaglineField = true;
		}, THEME_CARDS_DELAY_MS);

		return () => window.clearTimeout(fieldTimer);
	});

	$effect(() => {
		if (!showTaglineField) return;
		taglineInputEl?.focus();
	});

	const characterCount = $derived(linksCreateState.creatorTagline.length);

	function onTaglineInput(event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		linksCreateState.creatorTagline = value;
		setLinksCreateCreatorTagline(value);
	}

	function clearTagline() {
		linksCreateState.creatorTagline = '';
		setLinksCreateCreatorTagline('');
		taglineInputEl?.focus();
	}
</script>

<div
	class="relative mx-auto mt-10 w-full max-w-xl transition-opacity ease-out {showTaglineField
		? 'opacity-100'
		: 'opacity-0'}"
	style="transition-duration: {THEME_PROMPT_FADE_MS}ms"
	class:pointer-events-none={!showTaglineField}
	aria-hidden={!showTaglineField}
>
	<label class="input input-bordered flex w-full items-center gap-2 bg-base-100">
		<IconFormatQuoteClose class="h-5 w-5 shrink-0 text-base-content/60" aria-hidden="true" />
		<span class="sr-only">Your tagline</span>
		<input
			bind:this={taglineInputEl}
			type="text"
			name="creator_tagline"
			value={linksCreateState.creatorTagline}
			placeholder="Your tagline here"
			class="min-w-0 grow"
			autocomplete="off"
			maxlength="200"
			tabindex={showTaglineField ? undefined : -1}
			oninput={onTaglineInput}
		/>
		{#if linksCreateState.creatorTagline}
			<button
				type="button"
				class="btn btn-ghost btn-xs btn-circle shrink-0 text-base-content/50 hover:text-base-content"
				aria-label="Clear tagline"
				tabindex={showTaglineField ? undefined : -1}
				onclick={clearTagline}
			>
				<IconClose class="h-4 w-4" aria-hidden="true" />
			</button>
		{/if}
	</label>
</div>
