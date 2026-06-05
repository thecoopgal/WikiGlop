<script lang="ts">

	import { getContext } from 'svelte';

	import {
		THEME_CARDS_DELAY_MS,
		THEME_PROMPT_FADE_MS
	} from '$lib/links-create-theme-timing';

	import { CREATOR_LINKS_THEME_OPTIONS } from '$lib/links-creator-themes';

	import { setLinksCreateProfileTheme } from '$lib/client/links-create-state';

	import { LINKS_CREATE_CONTEXT_KEY, type LinksCreateContextState } from '$lib/links-create-context';

	import type { CreatorLinksThemeId } from '$lib/links-creator-themes';



	const linksCreateState = getContext<LinksCreateContextState>(LINKS_CREATE_CONTEXT_KEY);



	let showThemeCards = $state(false);



	const selectedTheme = $derived(linksCreateState.selectedTheme);



	function selectTheme(themeId: CreatorLinksThemeId) {

		linksCreateState.selectedTheme = themeId;

		setLinksCreateProfileTheme(themeId);

	}



	$effect(() => {

		showThemeCards = false;

		const cardsTimer = window.setTimeout(() => {

			showThemeCards = true;

		}, THEME_CARDS_DELAY_MS);



		return () => window.clearTimeout(cardsTimer);

	});

</script>



<div

	class="relative mt-10 grid grid-cols-1 gap-4 transition-opacity ease-out sm:grid-cols-2 {showThemeCards

		? 'opacity-100'

		: 'opacity-0'}"

	style="transition-duration: {THEME_PROMPT_FADE_MS}ms"

	class:pointer-events-none={!showThemeCards}

	aria-hidden={!showThemeCards}

>

	{#each CREATOR_LINKS_THEME_OPTIONS as theme (theme.id)}

		{#if theme.available}

			<button
				type="button"
				class="group w-full rounded-2xl text-left"
				class:ring-2={selectedTheme === theme.id}
				class:ring-primary={selectedTheme === theme.id}
				class:ring-offset-2={selectedTheme === theme.id}
				class:ring-offset-base-200={selectedTheme === theme.id}
				onclick={() => selectTheme(theme.id)}
				tabindex={showThemeCards ? undefined : -1}
			>
				<div
					class="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-base-100 to-base-200 shadow-md transition-transform duration-200 group-hover:-translate-y-0.5"
				>

					<div class="p-4">

						<div class="mx-auto flex w-full max-w-[8.5rem] flex-col items-center gap-2">

							<div class="h-10 w-10 rounded-full bg-primary/20"></div>

							<div class="h-2 w-20 rounded-full bg-base-content/15"></div>

							<div class="mt-1 h-2 w-14 rounded-full bg-base-content/10"></div>

							<div class="mt-2 flex w-full flex-col gap-1.5">

								<div class="h-7 rounded-lg border border-primary/25 bg-base-100/80"></div>

								<div class="h-7 rounded-lg border border-primary/25 bg-base-100/80"></div>

							</div>

						</div>

					</div>

					<div class="border-t border-primary/10 bg-base-100/60 px-3 py-2 text-center">

						<p class="text-sm font-semibold">{theme.label}</p>

						{#if theme.description}

							<p class="text-xs opacity-70">{theme.description}</p>

						{/if}

					</div>

				</div>

			</button>

		{:else}

			<div

				class="relative overflow-hidden rounded-2xl border border-base-content/10 bg-base-200 text-left opacity-55 grayscale"

				aria-disabled="true"

			>

				<div class="p-4">

					<div class="mx-auto flex w-full max-w-[8.5rem] flex-col items-center gap-2">

						<div class="h-10 w-10 rounded-full bg-base-content/10"></div>

						<div class="h-2 w-20 rounded-full bg-base-content/10"></div>

						<div class="mt-1 h-2 w-14 rounded-full bg-base-content/10"></div>

						<div class="mt-2 flex w-full flex-col gap-1.5">

							<div class="h-7 rounded-lg border border-base-content/10 bg-base-100/50"></div>

							<div class="h-7 rounded-lg border border-base-content/10 bg-base-100/50"></div>

						</div>

					</div>

				</div>

				<div class="border-t border-base-content/10 bg-base-100/40 px-3 py-2 text-center">

					<p class="text-sm font-semibold text-base-content/50">{theme.label}</p>

				</div>

				<div

					class="pointer-events-none absolute inset-0 flex items-center justify-center bg-base-300/35"

					aria-hidden="true"

				>

					<span class="text-6xl font-light leading-none text-base-content/35">✕</span>

				</div>

			</div>

		{/if}

	{/each}

</div>

