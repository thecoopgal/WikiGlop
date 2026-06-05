<script lang="ts">
	import { browser } from '$app/environment';
	import { getContext } from 'svelte';
	import {
		normalizeCreatorPageColor,
		setLinksCreateCreatorPageColors
	} from '$lib/client/links-create-page-colors';
	import { cssColorToHex } from '$lib/client/color-format';
	import { linksCreateEditButtonClass } from '$lib/links-create-edit-button';
	import {
		getThemePreference,
		resolveEffectiveTheme,
		subscribeThemePreference,
		type EffectiveTheme
	} from '$lib/client/theme-preference';
	import type { GloopglopCustomColorKey } from '$lib/daisy-theme-colors';
	import {
		LINKS_CREATE_CONTEXT_KEY,
		type LinksCreateContextState
	} from '$lib/links-create-context';
	import IconPaintBucket from '~icons/mdi/format-paint';
	import IconBrush from '~icons/mdi/brush';
	import IconFormatText from '~icons/mdi/format-text';

	const BRUSH_COLOR_KEYS = new Set<GloopglopCustomColorKey>([
		'card-border',
		'link-border',
		'share-border'
	]);

	const TEXT_COLOR_KEYS = new Set<GloopglopCustomColorKey>([
		'heading',
		'subheading',
		'link-text',
		'button-text',
		'text-box-text'
	]);

	let {
		colorKey,
		ariaLabel,
		size = 'xs'
	}: {
		colorKey: GloopglopCustomColorKey;
		ariaLabel: string;
		size?: 'xs' | 'sm';
	} = $props();

	const linksCreateState = getContext<LinksCreateContextState>(LINKS_CREATE_CONTEXT_KEY);

	let colorInputEl = $state<HTMLInputElement | null>(null);
	let runtimeTheme = $state<EffectiveTheme>('light');

	const isTextColor = $derived(TEXT_COLOR_KEYS.has(colorKey));
	const isBrushColor = $derived(BRUSH_COLOR_KEYS.has(colorKey));

	const pickerValue = $derived.by(() => {
		const raw = linksCreateState.creatorPageColors[colorKey]?.trim();
		if (!raw) return '#000000';
		return cssColorToHex(raw);
	});

	const buttonClass = $derived(linksCreateEditButtonClass(runtimeTheme, size));

	const iconClass = $derived(size === 'sm' ? 'h-5 w-5 shrink-0' : 'h-4 w-4 shrink-0');

	$effect(() => {
		if (!browser) return;
		const refresh = () => {
			runtimeTheme = resolveEffectiveTheme(getThemePreference());
		};
		refresh();
		return subscribeThemePreference(refresh);
	});

	function openPicker() {
		colorInputEl?.click();
	}

	function onColorInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const normalized = normalizeCreatorPageColor(input.value);
		if (!normalized) return;
		linksCreateState.creatorPageColors = {
			...linksCreateState.creatorPageColors,
			[colorKey]: normalized
		};
		setLinksCreateCreatorPageColors(linksCreateState.creatorPageColors);
	}
</script>

<div class="relative inline-flex shrink-0">
	<button type="button" class={buttonClass} aria-label={ariaLabel} onclick={openPicker}>
		{#if isTextColor}
			<IconFormatText class={iconClass} aria-hidden="true" />
		{:else if isBrushColor}
			<IconBrush class={iconClass} aria-hidden="true" />
		{:else}
			<IconPaintBucket class={iconClass} aria-hidden="true" />
		{/if}
	</button>
	<input
		bind:this={colorInputEl}
		type="color"
		class="pointer-events-none absolute left-1/2 top-full h-px w-px -translate-x-1/2 opacity-0"
		tabindex={-1}
		aria-hidden="true"
		value={pickerValue}
		oninput={onColorInput}
	/>
</div>
