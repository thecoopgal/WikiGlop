<script lang="ts">
	import { getContext } from 'svelte';
	import {
		THEME_CARDS_DELAY_MS,
		THEME_PROMPT_FADE_MS
	} from '$lib/links-create-theme-timing';
	import {
		LINKS_CREATOR_LINK_LABEL_MAX_LENGTH,
		LINKS_CREATOR_LINK_URL_MAX_LENGTH,
		persistCreatorLinkFields,
		reorderCreatorLinkFields
	} from '$lib/client/links-create-state';
	import LinksCreateReorderList from '$lib/components/LinksCreateReorderList.svelte';
	import {
		LINKS_CREATE_CONTEXT_KEY,
		type CreatorLinkIconMode,
		type LinksCreateContextState
	} from '$lib/links-create-context';
	import IconClose from '~icons/mdi/close';
	import CreatorLinkIconPicker from '$lib/components/CreatorLinkIconPicker.svelte';
	import { defaultCreatorLinkIconMode } from '$lib/creator-link-icon';
	import {
		getLinksCreatorUrlFeedback,
		type LinksCreatorUrlFeedback
	} from '$lib/links-creator-url-hygiene';
	import IconLinkVariant from '~icons/mdi/link-variant';

	const linksCreateState = getContext<LinksCreateContextState>(LINKS_CREATE_CONTEXT_KEY);

	const linkUrlFeedbackById = $derived.by(() => {
		const feedback = new Map<number, LinksCreatorUrlFeedback | null>();
		for (const field of linksCreateState.creatorLinkFields) {
			feedback.set(field.id, getLinksCreatorUrlFeedback(field.url));
		}
		return feedback;
	});

	let showLinkFields = $state(false);
	let linkInputEls = new Map<number, HTMLInputElement>();

	$effect(() => {
		showLinkFields = false;
		const fieldTimer = window.setTimeout(() => {
			showLinkFields = true;
		}, THEME_CARDS_DELAY_MS);
		return () => window.clearTimeout(fieldTimer);
	});

	$effect(() => {
		const focusId = linksCreateState.focusCreatorLinkFieldId;
		if (!showLinkFields || focusId == null) return;
		linkInputEls.get(focusId)?.focus();
		linksCreateState.focusCreatorLinkFieldId = null;
	});

	function persistFields() {
		persistCreatorLinkFields(linksCreateState.creatorLinkFields);
	}

	function updateField(fieldId: number, key: 'label' | 'url', event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		linksCreateState.creatorLinkFields = linksCreateState.creatorLinkFields.map((field) => {
			if (field.id !== fieldId) return field;
			if (key === 'url') {
				return { ...field, url: value, iconMode: defaultCreatorLinkIconMode(value) };
			}
			return { ...field, label: value };
		});
		persistFields();
	}

	function applySuggestedUrl(fieldId: number, suggestedUrl: string) {
		linksCreateState.creatorLinkFields = linksCreateState.creatorLinkFields.map((field) =>
			field.id === fieldId
				? { ...field, url: suggestedUrl, iconMode: defaultCreatorLinkIconMode(suggestedUrl) }
				: field
		);
		persistFields();
	}

	function setIconMode(fieldId: number, iconMode: CreatorLinkIconMode) {
		linksCreateState.creatorLinkFields = linksCreateState.creatorLinkFields.map((field) =>
			field.id === fieldId ? { ...field, iconMode } : field
		);
		persistFields();
	}

	function clearOrRemoveField(fieldId: number) {
		const fields = linksCreateState.creatorLinkFields;
		if (fields.length === 1) {
			linksCreateState.creatorLinkFields = fields.map((field) =>
				field.id === fieldId ? { ...field, label: '', url: '', iconMode: 'basic' } : field
			);
		} else {
			linksCreateState.creatorLinkFields = fields.filter((field) => field.id !== fieldId);
		}
		persistFields();
	}

	function reorderFields(fromId: number, toId: number) {
		linksCreateState.creatorLinkFields = reorderCreatorLinkFields(
			linksCreateState.creatorLinkFields,
			fromId,
			toId
		);
		persistFields();
	}

	function bindLinkInput(node: HTMLInputElement, fieldId: number) {
		linkInputEls.set(fieldId, node);
		return {
			destroy() {
				linkInputEls.delete(fieldId);
			}
		};
	}
</script>

<div
	class="mx-auto mt-10 w-full max-w-xl transition-opacity ease-out {showLinkFields
		? 'opacity-100'
		: 'opacity-0'}"
	style="transition-duration: {THEME_PROMPT_FADE_MS}ms"
	class:pointer-events-none={!showLinkFields}
	aria-hidden={!showLinkFields}
>
	<LinksCreateReorderList
		items={linksCreateState.creatorLinkFields}
		enabled={showLinkFields}
		itemLabel="link"
		listLabel="Creator links"
		gapClass="gap-3"
		itemClass="overflow-visible"
		onReorder={reorderFields}
	>
		{#snippet item({ field, index })}
			{@const urlFeedback = linkUrlFeedbackById.get(field.id) ?? null}
			<div
				class="overflow-visible rounded-2xl border border-base-content/10 bg-base-100 p-3 shadow-sm"
			>
				<label
					class="input input-bordered relative z-20 mb-2 flex w-full items-center gap-2 overflow-visible bg-base-100"
				>
					<CreatorLinkIconPicker
						href={field.url}
						mode={field.iconMode}
						disabled={!showLinkFields}
						onModeChange={(iconMode) => setIconMode(field.id, iconMode)}
					/>
					<span class="sr-only">{index === 0 ? 'Link label' : `Link ${index + 1} label`}</span>
					<input
						type="text"
						name={`creator_link_label_${field.id}`}
						value={field.label}
						placeholder="Link name"
						class="min-w-0 grow"
						autocomplete="off"
						maxlength={LINKS_CREATOR_LINK_LABEL_MAX_LENGTH}
						tabindex={showLinkFields ? undefined : -1}
						oninput={(event) => updateField(field.id, 'label', event)}
					/>
				</label>

				<div class="flex flex-col gap-1">
					<label
						class="input input-bordered flex w-full items-center gap-2 bg-base-100 {urlFeedback?.level ===
						'error'
							? 'input-error'
							: urlFeedback?.level === 'warn'
								? 'border-warning/70'
								: ''}"
					>
						<IconLinkVariant class="h-5 w-5 shrink-0 text-base-content/60" aria-hidden="true" />
						<span class="sr-only">{index === 0 ? 'Link URL' : `Link ${index + 1} URL`}</span>
						<input
							use:bindLinkInput={field.id}
							type="text"
							inputmode="url"
							autocapitalize="off"
							spellcheck="false"
							name={`creator_link_url_${field.id}`}
							value={field.url}
							placeholder="https://example.com"
							class="min-w-0 grow"
							autocomplete="off"
							maxlength={LINKS_CREATOR_LINK_URL_MAX_LENGTH}
							aria-invalid={urlFeedback?.level === 'error' ? true : undefined}
							aria-describedby={urlFeedback ? `creator_link_url_help_${field.id}` : undefined}
							tabindex={showLinkFields ? undefined : -1}
							oninput={(event) => updateField(field.id, 'url', event)}
						/>
						<button
							type="button"
							class="btn btn-ghost btn-xs btn-circle shrink-0 text-base-content/50 hover:text-base-content"
							aria-label={linksCreateState.creatorLinkFields.length === 1
								? 'Clear link'
								: 'Remove link'}
							tabindex={showLinkFields ? undefined : -1}
							onclick={() => clearOrRemoveField(field.id)}
						>
							<IconClose class="h-4 w-4" aria-hidden="true" />
						</button>
					</label>

					{#if urlFeedback}
						<div
							id="creator_link_url_help_{field.id}"
							class="flex flex-col gap-1 px-1 text-xs {urlFeedback.level === 'error'
								? 'text-error'
								: 'text-warning'}"
							role="note"
						>
							<p>{urlFeedback.message}</p>
							{#if urlFeedback.suggestedUrl}
								<div class="flex flex-wrap items-center gap-2">
									<span class="break-all opacity-80">{urlFeedback.suggestedUrl}</span>
									<button
										type="button"
										class="btn btn-xs btn-outline shrink-0 border-warning/40 hover:border-warning"
										tabindex={showLinkFields ? undefined : -1}
										onclick={() => applySuggestedUrl(field.id, urlFeedback.suggestedUrl!)}
									>
										Use cleaner link
									</button>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{/snippet}
	</LinksCreateReorderList>
</div>
