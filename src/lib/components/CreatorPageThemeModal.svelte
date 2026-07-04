<script lang="ts">
	import { browser } from '$app/environment';
	import { cssColorToHex } from '$lib/client/color-format';
	import { normalizeCreatorPageColor } from '$lib/client/links-create-page-colors';
	import {
		type GloopglopCustomColorKey,
		type GloopglopCustomColors
	} from '$lib/daisy-theme-colors';
	import IconClose from '~icons/mdi/close';

	/** Focused theme controls for page chrome. */
	const PAGE_THEME_EDIT_FIELDS: Array<{
		key: GloopglopCustomColorKey;
		label: string;
	}> = [
		{ key: 'base-200', label: 'Page background' },
		{ key: 'base-100', label: 'Card background' },
		{ key: 'card-gradient', label: 'Card gradient' },
		{ key: 'card-border', label: 'Card outline' },
		{ key: 'link-background', label: 'Button background' },
		{ key: 'link-border', label: 'Button outline' },
		{ key: 'link-text', label: 'Button text' }
	];

	let {
		open = $bindable(false),
		colors = $bindable<GloopglopCustomColors>()
	}: {
		open: boolean;
		colors: GloopglopCustomColors;
	} = $props();

	$effect(() => {
		if (!open || !browser) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') open = false;
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	});

	function pickerValue(key: GloopglopCustomColorKey): string {
		const raw = colors[key]?.trim();
		if (!raw) return '#ffffff';
		return cssColorToHex(raw);
	}

	function onColorInput(key: GloopglopCustomColorKey, event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const normalized = normalizeCreatorPageColor(input.value);
		if (!normalized) return;
		colors = { ...colors, [key]: normalized };
	}

	function clearColor(key: GloopglopCustomColorKey) {
		colors = { ...colors, [key]: '' };
	}
</script>

{#if open}
	<div class="modal modal-open" role="dialog" aria-modal="true" aria-label="Edit theme">
		<button
			type="button"
			class="modal-backdrop bg-black/40"
			aria-label="Close"
			onclick={() => {
				open = false;
			}}
		></button>
		<div class="modal-box max-w-md">
			<div class="mb-4 flex items-center justify-between gap-3">
				<h3 class="text-lg font-bold">Edit theme</h3>
				<button
					type="button"
					class="btn btn-ghost btn-sm btn-circle"
					onclick={() => {
						open = false;
					}}
				>
					<IconClose class="h-5 w-5" aria-hidden="true" />
				</button>
			</div>

			<p class="mb-4 text-sm opacity-70">
				Page background, card, and button colors. Changes preview live — save when you are done.
			</p>

			<div class="flex flex-col gap-3">
				{#each PAGE_THEME_EDIT_FIELDS as field (field.key)}
					<div class="flex items-center gap-3">
						<input
							type="color"
							class="h-10 w-12 cursor-pointer rounded border border-base-300 bg-transparent p-0.5"
							value={pickerValue(field.key)}
							aria-label={field.label}
							oninput={(event) => onColorInput(field.key, event)}
						/>
						<div class="min-w-0 flex-1">
							<p class="text-sm font-medium">{field.label}</p>
							<p class="truncate text-xs opacity-50">{colors[field.key]?.trim() || 'Default'}</p>
						</div>
						{#if colors[field.key]?.trim()}
							<button
								type="button"
								class="btn btn-ghost btn-xs"
								onclick={() => clearColor(field.key)}
							>
								Reset
							</button>
						{/if}
					</div>
				{/each}
			</div>

			<div class="modal-action">
				<button
					type="button"
					class="btn btn-primary"
					onclick={() => {
						open = false;
					}}
				>
					Done
				</button>
			</div>
		</div>
	</div>
{/if}
