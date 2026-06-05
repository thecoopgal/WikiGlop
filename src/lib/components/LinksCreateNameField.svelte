<script lang="ts">
	import { getContext } from 'svelte';
	import {
		THEME_CARDS_DELAY_MS,
		THEME_PROMPT_FADE_MS
	} from '$lib/links-create-theme-timing';
	import {
		LINKS_CREATOR_NAME_MAX_LENGTH,
		persistCreatorNameFields,
		reorderCreatorNameFields
	} from '$lib/client/links-create-state';
	import LinksCreateReorderList from '$lib/components/LinksCreateReorderList.svelte';
	import {
		LINKS_CREATE_CONTEXT_KEY,
		type LinksCreateContextState
	} from '$lib/links-create-context';
	import IconAt from '~icons/mdi/at';
	import IconClose from '~icons/mdi/close';

	const linksCreateState = getContext<LinksCreateContextState>(LINKS_CREATE_CONTEXT_KEY);

	let showNameFields = $state(false);
	let nameInputEls = new Map<number, HTMLInputElement>();

	$effect(() => {
		showNameFields = false;
		const fieldTimer = window.setTimeout(() => {
			showNameFields = true;
		}, THEME_CARDS_DELAY_MS);
		return () => window.clearTimeout(fieldTimer);
	});

	$effect(() => {
		const focusId = linksCreateState.focusCreatorNameFieldId;
		if (!showNameFields || focusId == null) return;
		nameInputEls.get(focusId)?.focus();
		linksCreateState.focusCreatorNameFieldId = null;
	});

	function persistFields() {
		persistCreatorNameFields(linksCreateState.creatorNameFields);
	}

	function onNameInput(fieldId: number, event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		linksCreateState.creatorNameFields = linksCreateState.creatorNameFields.map((field) =>
			field.id === fieldId ? { ...field, value } : field
		);
		persistFields();
	}

	function clearOrRemoveField(fieldId: number) {
		const fields = linksCreateState.creatorNameFields;
		if (fields.length === 1) {
			linksCreateState.creatorNameFields = fields.map((field) =>
				field.id === fieldId ? { ...field, value: '' } : field
			);
		} else {
			linksCreateState.creatorNameFields = fields.filter((field) => field.id !== fieldId);
		}
		persistFields();
	}

	function reorderFields(fromId: number, toId: number) {
		linksCreateState.creatorNameFields = reorderCreatorNameFields(
			linksCreateState.creatorNameFields,
			fromId,
			toId
		);
		persistFields();
	}

	function bindNameInput(node: HTMLInputElement, fieldId: number) {
		nameInputEls.set(fieldId, node);
		return {
			destroy() {
				nameInputEls.delete(fieldId);
			}
		};
	}
</script>

<div
	class="mx-auto mt-10 w-full max-w-xl transition-opacity ease-out {showNameFields
		? 'opacity-100'
		: 'opacity-0'}"
	style="transition-duration: {THEME_PROMPT_FADE_MS}ms"
	class:pointer-events-none={!showNameFields}
	aria-hidden={!showNameFields}
>
	<LinksCreateReorderList
		items={linksCreateState.creatorNameFields}
		enabled={showNameFields}
		itemLabel="name"
		listLabel="Creator names"
		gapClass="gap-2"
		onReorder={reorderFields}
	>
		{#snippet item({ field, index })}
			<label class="input input-bordered flex w-full items-center gap-2 bg-base-100">
				<IconAt class="h-5 w-5 shrink-0 text-base-content/60" aria-hidden="true" />
				<span class="sr-only">{index === 0 ? 'Your name' : 'Another name'}</span>
				<input
					use:bindNameInput={field.id}
					type="text"
					name={`creator_name_${field.id}`}
					value={field.value}
					placeholder={index === 0 ? 'Your name' : 'Another name'}
					class="min-w-0 grow"
					autocomplete={index === 0 ? 'name' : 'off'}
					maxlength={LINKS_CREATOR_NAME_MAX_LENGTH}
					tabindex={showNameFields ? undefined : -1}
					oninput={(event) => onNameInput(field.id, event)}
				/>
				<span class="shrink-0 text-xs tabular-nums opacity-60" aria-live="polite">
					{field.value.length}/{LINKS_CREATOR_NAME_MAX_LENGTH}
				</span>
				<button
					type="button"
					class="btn btn-ghost btn-xs btn-circle shrink-0 text-base-content/50 hover:text-base-content"
					aria-label={linksCreateState.creatorNameFields.length === 1
						? 'Clear name'
						: 'Remove name'}
					tabindex={showNameFields ? undefined : -1}
					onclick={() => clearOrRemoveField(field.id)}
				>
					<IconClose class="h-4 w-4" aria-hidden="true" />
				</button>
			</label>
		{/snippet}
	</LinksCreateReorderList>
</div>