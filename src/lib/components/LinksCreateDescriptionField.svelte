<script lang="ts">
	import { getContext } from 'svelte';
	import {
		THEME_CARDS_DELAY_MS,
		THEME_PROMPT_FADE_MS
	} from '$lib/links-create-theme-timing';
	import {
		LINKS_CREATOR_PAGE_DESCRIPTION_MAX_LENGTH,
		setLinksCreateCreatorPageDescription
	} from '$lib/client/links-create-state';
	import { LINKS_CREATE_CONTEXT_KEY, type LinksCreateContextState } from '$lib/links-create-context';
	import IconClose from '~icons/mdi/close';
	import IconTextBoxOutline from '~icons/mdi/text-box-outline';

	const linksCreateState = getContext<LinksCreateContextState>(LINKS_CREATE_CONTEXT_KEY);

	let showDescriptionField = $state(false);

	let descriptionInputEl = $state<HTMLTextAreaElement | null>(null);



	const characterCount = $derived(linksCreateState.creatorPageDescription.length);



	$effect(() => {

		showDescriptionField = false;

		const fieldTimer = window.setTimeout(() => {

			showDescriptionField = true;

		}, THEME_CARDS_DELAY_MS);



		return () => window.clearTimeout(fieldTimer);

	});



	$effect(() => {

		if (!showDescriptionField) return;

		descriptionInputEl?.focus();

	});



	$effect(() => {

		setLinksCreateCreatorPageDescription(linksCreateState.creatorPageDescription);

	});



	function clearDescription() {

		linksCreateState.creatorPageDescription = '';

		descriptionInputEl?.focus();

	}

</script>



<div

	class="relative mx-auto mt-10 w-full max-w-xl transition-opacity ease-out {showDescriptionField

		? 'opacity-100'

		: 'opacity-0'}"

	style="transition-duration: {THEME_PROMPT_FADE_MS}ms"

	class:pointer-events-none={!showDescriptionField}

	aria-hidden={!showDescriptionField}

>

	<label class="flex w-full flex-col gap-1">

		<span class="sr-only">Your page description</span>

		<div class="relative">

			<IconTextBoxOutline

				class="pointer-events-none absolute left-3 top-3 z-10 h-5 w-5 text-base-content/60"

				aria-hidden="true"

			/>

			<textarea

				bind:this={descriptionInputEl}

				bind:value={linksCreateState.creatorPageDescription}

				name="creator_page_description"

				placeholder="Tell people what your page is about"

				class="textarea textarea-bordered block min-h-28 w-full resize-none overflow-y-auto whitespace-pre-wrap bg-base-100 py-3 pl-10 pr-10 leading-relaxed"

				autocomplete="off"

				maxlength={LINKS_CREATOR_PAGE_DESCRIPTION_MAX_LENGTH}

				rows={4}

				tabindex={showDescriptionField ? undefined : -1}

			></textarea>

			{#if linksCreateState.creatorPageDescription}

				<button

					type="button"

					class="btn btn-ghost btn-xs btn-circle absolute right-2 top-2 text-base-content/50 hover:text-base-content"

					aria-label="Clear page description"

					tabindex={showDescriptionField ? undefined : -1}

					onclick={clearDescription}

				>

					<IconClose class="h-4 w-4" aria-hidden="true" />

				</button>

			{/if}

		</div>

		<p class="text-right text-xs tabular-nums opacity-60" aria-live="polite">

			{characterCount}/{LINKS_CREATOR_PAGE_DESCRIPTION_MAX_LENGTH}

		</p>

	</label>

</div>