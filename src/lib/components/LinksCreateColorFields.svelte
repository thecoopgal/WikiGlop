<script lang="ts">
	import { getContext } from 'svelte';
	import {
		creatorPageColorsToStyle,
		normalizeCreatorPageColor,
		setLinksCreateCreatorPageColors
	} from '$lib/client/links-create-page-colors';
	import { cssColorToHex } from '$lib/client/color-format';
	import {
		GLOOPGLOP_CUSTOM_COLOR_FIELDS,
		type GloopglopCustomColorKey
	} from '$lib/daisy-theme-colors';
	import {
		THEME_CARDS_DELAY_MS,
		THEME_PROMPT_FADE_MS
	} from '$lib/links-create-theme-timing';
	import {
		LINKS_CREATE_CONTEXT_KEY,
		type LinksCreateContextState
	} from '$lib/links-create-context';

	const linksCreateState = getContext<LinksCreateContextState>(LINKS_CREATE_CONTEXT_KEY);

	let showFields = $state(false);

	$effect(() => {
		showFields = false;
		const fieldTimer = window.setTimeout(() => {
			showFields = true;
		}, THEME_CARDS_DELAY_MS);
		return () => window.clearTimeout(fieldTimer);
	});

	function persistColors() {
		setLinksCreateCreatorPageColors(linksCreateState.creatorPageColors);
	}

	function pickerValue(key: GloopglopCustomColorKey): string {
		const raw = linksCreateState.creatorPageColors[key]?.trim();
		if (!raw) return '#000000';
		return cssColorToHex(raw);
	}

	function onColorInput(key: GloopglopCustomColorKey, event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const normalized = normalizeCreatorPageColor(input.value);
		if (!normalized) return;
		linksCreateState.creatorPageColors = {
			...linksCreateState.creatorPageColors,
			[key]: normalized
		};
		persistColors();
	}
</script>

<div
	class="relative mx-auto mt-3 w-full max-w-md transition-opacity ease-out {showFields
		? 'opacity-100'
		: 'opacity-0'}"
	style="transition-duration: {THEME_PROMPT_FADE_MS}ms"
	class:pointer-events-none={!showFields}
	aria-hidden={!showFields}
>
	<ul
		class="divide-y divide-base-content/10 rounded-2xl border border-base-content/10 bg-base-100/90 shadow-sm backdrop-blur-sm"
		style={creatorPageColorsToStyle(linksCreateState.creatorPageColors)}
	>
		{#each GLOOPGLOP_CUSTOM_COLOR_FIELDS as field (field.key)}
			<li class="flex items-center justify-between gap-3 px-4 py-3">
				<span class="text-sm font-medium">{field.label}</span>
				<label class="relative shrink-0 cursor-pointer">
					<span class="sr-only">Pick {field.label.toLowerCase()} color</span>
					<input
						type="color"
						class="h-10 w-10 cursor-pointer rounded-full border border-base-content/15 bg-transparent p-0.5"
						value={pickerValue(field.key)}
						tabindex={showFields ? undefined : -1}
						oninput={(event) => onColorInput(field.key, event)}
					/>
				</label>
			</li>
		{/each}
	</ul>
</div>
