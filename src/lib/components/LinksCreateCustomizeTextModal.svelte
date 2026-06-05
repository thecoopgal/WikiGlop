<script lang="ts">
	import { getContext } from 'svelte';
	import {
		LINKS_CREATOR_NAME_MAX_LENGTH,
		LINKS_CREATOR_NAMES_MAX_COUNT,
		LINKS_CREATOR_PAGE_DESCRIPTION_MAX_LENGTH,
		LINKS_CREATOR_TAGLINE_MAX_LENGTH,
		linksCreatorNameFieldStatus,
		persistCreatorNameFields,
		reorderCreatorNameFields,
		setLinksCreateCreatorPageDescription,
		setLinksCreateCreatorTagline
	} from '$lib/client/links-create-state';
	import LinksCreateReorderList from '$lib/components/LinksCreateReorderList.svelte';
	import {
		LINKS_CREATE_CONTEXT_KEY,
		type LinksCreateContextState
	} from '$lib/links-create-context';
	import IconAt from '~icons/mdi/at';
	import IconClose from '~icons/mdi/close';
	import IconFormatQuoteClose from '~icons/mdi/format-quote-close';
	import IconTextBoxOutline from '~icons/mdi/text-box-outline';

	export type CustomizeTextEditSection = 'name' | 'tagline' | 'description';

	let {
		section = $bindable(null)
	}: {
		section: CustomizeTextEditSection | null;
	} = $props();

	const linksCreateState = getContext<LinksCreateContextState>(LINKS_CREATE_CONTEXT_KEY);

	let nameInputEls = new Map<number, HTMLInputElement>();
	let taglineInputEl = $state<HTMLInputElement | null>(null);
	let descriptionInputEl = $state<HTMLTextAreaElement | null>(null);
	let descriptionDraft = $state('');
	let focusedSection = $state<CustomizeTextEditSection | null>(null);

	const nameFieldStatus = $derived(
		linksCreatorNameFieldStatus(linksCreateState.creatorNameFields)
	);

	const sectionTitle = $derived(
		section === 'name'
			? 'Edit names'
			: section === 'tagline'
				? 'Edit tagline'
				: section === 'description'
					? 'Edit description'
					: ''
	);

	$effect(() => {
		if (!section) {
			focusedSection = null;
			return;
		}

		if (section === 'description' && focusedSection !== 'description') {
			descriptionDraft = linksCreateState.creatorPageDescription;
		}

		if (focusedSection === section) return;
		focusedSection = section;

		queueMicrotask(() => {
			if (section === 'name') {
				const first = linksCreateState.creatorNameFields[0];
				if (first) nameInputEls.get(first.id)?.focus();
				return;
			}
			if (section === 'tagline') {
				taglineInputEl?.focus();
				return;
			}
			descriptionInputEl?.focus();
		});
	});

	$effect(() => {
		const focusId = linksCreateState.focusCreatorNameFieldId;
		if (section !== 'name' || focusId == null) return;
		nameInputEls.get(focusId)?.focus();
		linksCreateState.focusCreatorNameFieldId = null;
	});

	function close() {
		section = null;
	}

	function done() {
		if (section === 'name') {
			persistCreatorNameFields(linksCreateState.creatorNameFields);
		} else if (section === 'tagline') {
			setLinksCreateCreatorTagline(linksCreateState.creatorTagline);
		} else if (section === 'description') {
			linksCreateState.creatorPageDescription = descriptionDraft;
			setLinksCreateCreatorPageDescription(descriptionDraft);
		}
		close();
	}

	function onNameInput(fieldId: number, event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		linksCreateState.creatorNameFields = linksCreateState.creatorNameFields.map((field) =>
			field.id === fieldId ? { ...field, value } : field
		);
		persistCreatorNameFields(linksCreateState.creatorNameFields);
	}

	function clearOrRemoveNameField(fieldId: number) {
		const fields = linksCreateState.creatorNameFields;
		if (fields.length === 1) {
			linksCreateState.creatorNameFields = fields.map((field) =>
				field.id === fieldId ? { ...field, value: '' } : field
			);
		} else {
			linksCreateState.creatorNameFields = fields.filter((field) => field.id !== fieldId);
		}
		persistCreatorNameFields(linksCreateState.creatorNameFields);
	}

	function reorderNameFields(fromId: number, toId: number) {
		linksCreateState.creatorNameFields = reorderCreatorNameFields(
			linksCreateState.creatorNameFields,
			fromId,
			toId
		);
		persistCreatorNameFields(linksCreateState.creatorNameFields);
	}

	function addAnotherName() {
		if (!nameFieldStatus.hasValid) return;
		if (linksCreateState.creatorNameFields.length >= LINKS_CREATOR_NAMES_MAX_COUNT) return;
		const id = linksCreateState.nextCreatorNameFieldId;
		linksCreateState.nextCreatorNameFieldId += 1;
		linksCreateState.creatorNameFields = [
			...linksCreateState.creatorNameFields,
			{ id, value: '' }
		];
		linksCreateState.focusCreatorNameFieldId = id;
	}

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

	function selectAllDescription() {
		descriptionInputEl?.focus();
		descriptionInputEl?.select();
	}

	function clearDescription() {
		descriptionDraft = '';
		queueMicrotask(() => descriptionInputEl?.focus());
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

{#if section}
	<div class="modal modal-open z-[200]" role="dialog" aria-modal="true">
		<div class="modal-box relative z-[201] max-w-md">
			<h3 class="text-lg font-bold">{sectionTitle}</h3>

			{#if section === 'name'}
				<div class="mt-4 space-y-3">
					<LinksCreateReorderList
						items={linksCreateState.creatorNameFields}
						enabled={true}
						itemLabel="name"
						listLabel="Creator names"
						gapClass="gap-2"
						onReorder={reorderNameFields}
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
									onclick={() => clearOrRemoveNameField(field.id)}
								>
									<IconClose class="h-4 w-4" aria-hidden="true" />
								</button>
							</label>
						{/snippet}
					</LinksCreateReorderList>

					{#if linksCreateState.creatorNameFields.length < LINKS_CREATOR_NAMES_MAX_COUNT}
						<button
							type="button"
							class="btn btn-ghost btn-sm w-full"
							disabled={!nameFieldStatus.hasValid}
							onclick={addAnotherName}
						>
							Add another name
						</button>
					{/if}
				</div>
			{:else if section === 'tagline'}
				<div class="mt-4">
					<label class="input input-bordered flex w-full items-center gap-2 bg-base-100">
						<IconFormatQuoteClose
							class="h-5 w-5 shrink-0 text-base-content/60"
							aria-hidden="true"
						/>
						<span class="sr-only">Your tagline</span>
						<input
							bind:this={taglineInputEl}
							type="text"
							name="creator_tagline"
							value={linksCreateState.creatorTagline}
							placeholder="Your tagline here"
							class="min-w-0 grow"
							autocomplete="off"
							maxlength={LINKS_CREATOR_TAGLINE_MAX_LENGTH}
							oninput={onTaglineInput}
						/>
						{#if linksCreateState.creatorTagline}
							<button
								type="button"
								class="btn btn-ghost btn-xs btn-circle shrink-0 text-base-content/50 hover:text-base-content"
								aria-label="Clear tagline"
								onclick={clearTagline}
							>
								<IconClose class="h-4 w-4" aria-hidden="true" />
							</button>
						{/if}
					</label>
					<p class="mt-2 text-right text-xs tabular-nums opacity-60" aria-live="polite">
						{linksCreateState.creatorTagline.length}/{LINKS_CREATOR_TAGLINE_MAX_LENGTH}
					</p>
				</div>
			{:else if section === 'description'}
				<div class="mt-4">
					<div class="flex w-full flex-col gap-1">
						<label class="sr-only" for="creator_page_description_modal">Your page description</label>
						<div class="relative">
							<IconTextBoxOutline
								class="pointer-events-none absolute left-3 top-3 z-10 h-5 w-5 text-base-content/60"
								aria-hidden="true"
							/>
							<textarea
								id="creator_page_description_modal"
								bind:this={descriptionInputEl}
								bind:value={descriptionDraft}
								name="creator_page_description"
								placeholder="Tell people what your page is about"
								class="textarea textarea-bordered select-text block min-h-28 w-full cursor-text resize-none overflow-y-auto whitespace-pre-wrap bg-base-100 py-3 pl-10 pr-10 leading-relaxed"
								autocomplete="off"
								maxlength={LINKS_CREATOR_PAGE_DESCRIPTION_MAX_LENGTH}
								rows={4}
								ondblclick={(event) => {
									event.preventDefault();
									selectAllDescription();
								}}
							></textarea>
							{#if descriptionDraft}
								<button
									type="button"
									class="btn btn-ghost btn-xs btn-circle absolute right-2 top-2 text-base-content/50 hover:text-base-content"
									aria-label="Clear page description"
									onclick={clearDescription}
								>
									<IconClose class="h-4 w-4" aria-hidden="true" />
								</button>
							{/if}
						</div>
						<p class="text-right text-xs tabular-nums opacity-60" aria-live="polite">
							{descriptionDraft.length}/{LINKS_CREATOR_PAGE_DESCRIPTION_MAX_LENGTH}
						</p>
					</div>
				</div>
			{/if}

			<div class="modal-action">
				<button type="button" class="btn" onclick={close}>Cancel</button>
				<button type="button" class="btn btn-primary" onclick={done}>Done</button>
			</div>
		</div>
		<button
			type="button"
			class="modal-backdrop z-[200]"
			aria-label="Close"
			onclick={close}
		></button>
	</div>
{/if}
