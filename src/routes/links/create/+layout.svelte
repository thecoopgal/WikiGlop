<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';
	import LinksCreateProgressRing from '$lib/components/LinksCreateProgressRing.svelte';
	import LinksCreateColorEditBrush from '$lib/components/LinksCreateColorEditBrush.svelte';
	import { getLinksCreateImportedSiteThemeMode } from '$lib/client/links-create-import';
	import LinksCreateCustomizeActions from '$lib/components/LinksCreateCustomizeActions.svelte';
	import LinksCreateProfilePreview from '$lib/components/LinksCreateProfilePreview.svelte';
	import LinksCreateQuestion from '$lib/components/LinksCreateQuestion.svelte';
	import { resolveGloopIconUrl, subscribeCustomGloopIcon } from '$lib/client/gloopglop-custom-icon';
	import {
		creatorLinkFieldsFromValues,
		creatorNameFieldsFromValues,
		creatorNameFieldValues,
		defaultCreatorLinkFields,
		defaultCreatorNameFields,
		getLinksCreateCreatorLinks,
		getLinksCreateCreatorNames,
		getLinksCreateCreatorPageDescription,
		getLinksCreateCreatorProfilePicture,
		getLinksCreateCreatorShareIconVariant,
		getLinksCreateCreatorTagline,
		getLinksCreateProfileTheme,
		isValidLinksCreatorProfilePicture,
		getPreviewLinksCreatorLinks,
		getValidLinksCreatorNames,
		isValidLinksCreatorPageDescription,
		isValidLinksCreatorTagline
	} from '$lib/client/links-create-state';
	import {
		creatorPageBackgroundStyle,
		creatorPageColorsToStyle,
		defaultLinksCreateCreatorPageColors,
		getLinksCreateCreatorPageColors
	} from '$lib/client/links-create-page-colors';
	import { GLOOPGLOP_DEFAULT_LOGO_URL } from '$lib/glop-link-image';
	import { LINKS_CREATE_CONTEXT_KEY, type LinksCreateContextState } from '$lib/links-create-context';
	import {
		isLinksCreateStep,
		linksCreateStepProgress,
		prevLinksCreateStep,
		type LinksCreateStep
	} from '$lib/links-create-steps';
	import { linksFade, linksStepReceive, linksStepSend } from '$lib/links-page-transition';
	import IconArrowLeft from '~icons/mdi/arrow-left';
	import IconFormSelect from '~icons/mdi/form-select';

	let { children } = $props();

	let heroIconUrl = $state(GLOOPGLOP_DEFAULT_LOGO_URL);
	let ringSpinning = $state(false);
	let previewRevealed = $state(false);
	let mainEl = $state<HTMLElement | null>(null);
	let ringAnchorEl = $state<HTMLDivElement | null>(null);
	let headlineEl = $state<HTMLDivElement | null>(null);
	let formAnchorEl = $state<HTMLDivElement | null>(null);
	let previewAnchorEl = $state<HTMLDivElement | null>(null);
	let bottomSpacerPx = $state(0);
	let fadeLineTopPx = $state<number | null>(null);
	let gradientTopPx = $state<number | null>(null);
	let gradientFadeStartPx = $state<number | null>(null);
	let gradientOpaquePx = $state<number | null>(null);

	/** Matches btn-sm (2rem) + 0.75rem gap above the progress ring. */
	const EYE_ABOVE_RING_OFFSET_PX = 44;
	/** How far above the eye line the soft fade begins. */
	const GRADIENT_SOFT_EXTEND_PX = 80;
	const initialNameFields = defaultCreatorNameFields();
	const initialLinkFields = defaultCreatorLinkFields();
	const linksCreateState = $state<LinksCreateContextState>({
		selectedTheme: null,
		creatorNameFields: initialNameFields.fields,
		nextCreatorNameFieldId: initialNameFields.nextId,
		focusCreatorNameFieldId: null,
		creatorTagline: '',
		creatorPageDescription: '',
		creatorLinkFields: initialLinkFields.fields,
		nextCreatorLinkFieldId: initialLinkFields.nextId,
		focusCreatorLinkFieldId: null,
		creatorProfilePicture: '',
		creatorPageColors: defaultLinksCreateCreatorPageColors(),
		creatorShareIconVariant: 'light'
	});

	const step = $derived(page.params.step ?? '');
	const createStep = $derived(
		isLinksCreateStep(step) ? (step as LinksCreateStep) : 'hello'
	);
	const ringProgress = $derived(linksCreateStepProgress(createStep));
	const isAlmostDoneStep = $derived(createStep === 'almost-done');
	const isCustomizeStep = $derived(createStep === 'customize');
	const showProgressRing = $derived(!isCustomizeStep);
	const showProfilePreview = $derived(
		linksCreateState.selectedTheme != null &&
			(createStep === 'theme' ||
				createStep === 'name' ||
				createStep === 'tagline' ||
				createStep === 'description' ||
				createStep === 'links' ||
				createStep === 'photo' ||
				isAlmostDoneStep ||
				isCustomizeStep)
	);
	const previewColorStyle = $derived(
		creatorPageColorsToStyle(linksCreateState.creatorPageColors)
	);
	const customizeShellStyle = $derived(
		isCustomizeStep ? creatorPageBackgroundStyle(linksCreateState.creatorPageColors) : ''
	);
	const importedSiteThemeMode = $derived(
		isCustomizeStep ? getLinksCreateImportedSiteThemeMode() : null
	);
	const previewFullyRevealed = $derived(previewRevealed || isCustomizeStep);
	const previewAvatar = $derived(
		isValidLinksCreatorProfilePicture(linksCreateState.creatorProfilePicture)
			? linksCreateState.creatorProfilePicture
			: heroIconUrl
	);
	const previewNames = $derived(
		getValidLinksCreatorNames(creatorNameFieldValues(linksCreateState.creatorNameFields))
	);
	const previewName = $derived(previewNames[0] ?? 'Your name');
	const previewTagline = $derived.by(() => {
		const current = linksCreateState.creatorTagline.trim();
		if (createStep === 'tagline' && current) return current;
		if (isValidLinksCreatorTagline(current)) return current;
		return 'Your tagline here';
	});
	const previewBio = $derived.by(() => {
		const current = linksCreateState.creatorPageDescription.trim();
		if (createStep === 'description' && current) return current;
		if (isValidLinksCreatorPageDescription(current)) return current;
		return '';
	});
	const previewLinks = $derived(
		getPreviewLinksCreatorLinks(linksCreateState.creatorLinkFields)
	);

	const prevStep = $derived(prevLinksCreateStep(createStep));
	const hideCreateForm = $derived(showProfilePreview && previewFullyRevealed && !isCustomizeStep);

	setContext(LINKS_CREATE_CONTEXT_KEY, linksCreateState);

	$effect(() => {
		createStep;
		previewRevealed = false;
	});

	function updateFadeLinePosition() {
		if (!ringAnchorEl || !mainEl) return;
		const mainRect = mainEl.getBoundingClientRect();
		const ringRect = ringAnchorEl.getBoundingClientRect();
		fadeLineTopPx = ringRect.top - mainRect.top;
		gradientTopPx = fadeLineTopPx - EYE_ABOVE_RING_OFFSET_PX;
		gradientFadeStartPx = Math.max(0, gradientTopPx - GRADIENT_SOFT_EXTEND_PX);
		gradientOpaquePx = fadeLineTopPx;
	}

	function updateBottomSpacer() {
		if (!mainEl) return;
		const mainTop = mainEl.getBoundingClientRect().top;
		let contentBottom = 0;

		if (formAnchorEl) {
			contentBottom = Math.max(
				contentBottom,
				formAnchorEl.getBoundingClientRect().bottom - mainTop
			);
		}

		if (previewAnchorEl) {
			contentBottom = Math.max(
				contentBottom,
				previewAnchorEl.getBoundingClientRect().bottom - mainTop
			);
		}

		const footerHeight =
			mainEl.parentElement?.querySelector('footer')?.getBoundingClientRect().height ?? 0;
		const viewportMainMin = Math.max(0, window.innerHeight - footerHeight);

		bottomSpacerPx = Math.max(viewportMainMin, contentBottom + 48);
	}

	function updateLayoutMetrics() {
		updateFadeLinePosition();
		updateBottomSpacer();
	}

	$effect(() => {
		if (!browser) return;
		createStep;
		isAlmostDoneStep;
		isCustomizeStep;
		showProfilePreview;
		previewLinks.length;
		linksCreateState.creatorLinkFields.length;
		previewRevealed;
		queueMicrotask(updateLayoutMetrics);

		const stepTimer = window.setTimeout(updateLayoutMetrics, 1300);

		const resizeObserver = new ResizeObserver(updateLayoutMetrics);
		if (ringAnchorEl) resizeObserver.observe(ringAnchorEl);
		if (headlineEl) resizeObserver.observe(headlineEl);
		if (formAnchorEl) resizeObserver.observe(formAnchorEl);
		if (previewAnchorEl) resizeObserver.observe(previewAnchorEl);
		if (mainEl) resizeObserver.observe(mainEl);

		window.addEventListener('resize', updateLayoutMetrics);

		return () => {
			window.clearTimeout(stepTimer);
			resizeObserver.disconnect();
			window.removeEventListener('resize', updateLayoutMetrics);
		};
	});

	function goBack() {
		if (prevStep) {
			goto(`/links/create/${prevStep}`);
			return;
		}
		goto('/links/start');
	}

	onMount(() => {
		if (createStep !== 'theme') {
			linksCreateState.selectedTheme = getLinksCreateProfileTheme();
		}
		if (createStep !== 'name') {
			const savedNames = getLinksCreateCreatorNames();
			const hydrated = creatorNameFieldsFromValues(savedNames.length > 0 ? savedNames : ['']);
			linksCreateState.creatorNameFields = hydrated.fields;
			linksCreateState.nextCreatorNameFieldId = hydrated.nextId;
		}
		if (createStep !== 'tagline') {
			linksCreateState.creatorTagline = getLinksCreateCreatorTagline();
		}
		if (createStep !== 'description') {
			linksCreateState.creatorPageDescription = getLinksCreateCreatorPageDescription();
		}
		if (createStep !== 'links') {
			const savedLinks = getLinksCreateCreatorLinks();
			const hydrated =
				savedLinks.length > 0
					? creatorLinkFieldsFromValues(savedLinks)
					: defaultCreatorLinkFields();
			linksCreateState.creatorLinkFields = hydrated.fields;
			linksCreateState.nextCreatorLinkFieldId = hydrated.nextId;
		}
		if (createStep !== 'photo') {
			linksCreateState.creatorProfilePicture = getLinksCreateCreatorProfilePicture();
		}
		linksCreateState.creatorPageColors = getLinksCreateCreatorPageColors();
		linksCreateState.creatorShareIconVariant = getLinksCreateCreatorShareIconVariant();
		ringSpinning = true;
		return subscribeCustomGloopIcon(() => {
			heroIconUrl = resolveGloopIconUrl();
		});
	});
</script>

<div
	class="flex min-h-screen flex-col bg-base-200 {isCustomizeStep
		? ''
		: 'bg-gradient-to-b from-base-200 via-base-200 to-base-300/50'}"
	style={customizeShellStyle}
>
	<main bind:this={mainEl} class="relative flex flex-1 flex-col">
		{#if isCustomizeStep && linksCreateState.selectedTheme}
			<div
				class="flex min-h-full flex-1 flex-col"
				data-theme={importedSiteThemeMode ?? undefined}
				in:fade={linksFade}
			>
				<div class="relative flex flex-1 flex-col px-4 pt-4 pb-6">
					<div bind:this={previewAnchorEl} class="mx-auto w-full max-w-[500px]">
						<LinksCreateProfilePreview
							profileTheme={linksCreateState.selectedTheme}
							name={previewName}
							names={previewNames}
							tagline={previewTagline}
							bio={previewBio}
							links={previewLinks}
							avatar={previewAvatar}
							compact
							showColorEdits
						/>
					</div>
					<div class="mt-6 flex w-full flex-1 items-center justify-center">
						<LinksCreateColorEditBrush
							colorKey="base-200"
							ariaLabel="Edit page background"
							size="sm"
						/>
					</div>
				</div>

				<div
					bind:this={formAnchorEl}
					class="sticky bottom-0 z-30 border-t border-base-content/10 bg-base-200/95 px-4 pb-4 pt-3 shadow-[0_-10px_28px_rgba(0,0,0,0.08)] backdrop-blur-md"
				>
					<div class="mx-auto flex w-full max-w-xl flex-col text-center">
						<div
							bind:this={headlineEl}
							class="relative grid w-full [&>*]:col-start-1 [&>*]:row-start-1"
						>
							{#key createStep}
								<div
									class="w-full text-center"
									in:linksStepReceive={{ key: createStep }}
									out:linksStepSend={{ key: createStep }}
								>
									<LinksCreateQuestion step={createStep} />
								</div>
							{/key}
						</div>
						<LinksCreateCustomizeActions />
					</div>
				</div>
			</div>
		{:else}
			{#if showProfilePreview && linksCreateState.selectedTheme}
				<div
					bind:this={previewAnchorEl}
					class="absolute inset-x-0 top-0 w-full pt-4 transition-opacity duration-500 ease-out {previewFullyRevealed
						? 'z-[24]'
						: 'z-[5]'}"
					in:fade={linksFade}
				>
					<div class="mx-auto max-w-[500px] px-6" style={previewColorStyle}>
						<LinksCreateProfilePreview
							profileTheme={linksCreateState.selectedTheme}
							name={previewName}
							names={previewNames}
							tagline={previewTagline}
							bio={previewBio}
							links={previewLinks}
							avatar={previewAvatar}
							compact
						/>
					</div>
				</div>

				{#if gradientFadeStartPx != null && gradientOpaquePx != null}
					<div
						class="pointer-events-none absolute inset-0 z-[22] transition-opacity duration-500 ease-out"
						class:opacity-0={previewFullyRevealed}
						aria-hidden={previewFullyRevealed}
						style="background: linear-gradient(to bottom, transparent {gradientFadeStartPx}px, color-mix(in oklab, var(--color-base-200) 55%, var(--color-base-300)) {gradientOpaquePx}px, color-mix(in oklab, var(--color-base-200) 55%, var(--color-base-300)) 100%);"
					></div>
				{/if}
			{/if}

			<div
				class="pointer-events-none absolute left-1/2 top-[50vh] z-[25] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 px-4 transition-opacity duration-500 ease-out"
				class:opacity-0={hideCreateForm}
				class:pointer-events-none={hideCreateForm}
				aria-hidden={hideCreateForm}
			>
				<div
					class="pointer-events-auto w-full text-center"
					class:pointer-events-none={hideCreateForm}
				>
					<div class="relative block w-full">
						<div class="absolute bottom-full left-0 right-0 mb-3 w-full">
							{#if showProgressRing}
								<div
									class="flex justify-center transition-opacity duration-500 ease-out"
									bind:this={ringAnchorEl}
								>
									<LinksCreateProgressRing
										iconUrl={heroIconUrl}
										progress={ringProgress}
										spinOnce={ringSpinning}
									/>
								</div>
							{/if}
							<div
								class="{showProgressRing ? 'mt-1' : ''} flex min-h-8 w-full items-center justify-center"
							>
								<div class="relative inline-flex items-center">
									<p class="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
										Links
									</p>
									<button
										type="button"
										class="btn btn-ghost btn-sm btn-circle absolute right-full top-1/2 mr-1 -translate-y-1/2 text-base-content/70 hover:text-base-content"
										aria-label="Back"
										onclick={goBack}
									>
										<IconArrowLeft class="h-5 w-5 shrink-0" aria-hidden="true" />
									</button>
								</div>
							</div>
						</div>

						<div
							bind:this={headlineEl}
							class="relative grid w-full [&>*]:col-start-1 [&>*]:row-start-1"
						>
							{#key createStep}
								<div
									class="w-full text-center"
									in:linksStepReceive={{ key: createStep }}
									out:linksStepSend={{ key: createStep }}
								>
									<LinksCreateQuestion step={createStep} />
								</div>
							{/key}
						</div>
					</div>
				</div>
			</div>

			<div
				bind:this={formAnchorEl}
				class="pointer-events-auto absolute left-1/2 z-[25] w-full max-w-lg -translate-x-1/2 px-4 pb-12 text-center transition-opacity duration-500 ease-out"
				class:opacity-0={hideCreateForm}
				class:pointer-events-none={hideCreateForm}
				aria-hidden={hideCreateForm}
				style="top: calc(50vh + 2.25rem);"
			>
				{@render children()}
			</div>

			<div
				class="pointer-events-none shrink-0"
				style="height: {bottomSpacerPx}px"
				aria-hidden="true"
			></div>
		{/if}
	</main>

	{#if showProfilePreview && linksCreateState.selectedTheme && !isCustomizeStep}
		<div class="pointer-events-none sticky bottom-0 z-[30] flex justify-center px-4 pb-4 pt-2">
			<button
				type="button"
				class="btn btn-sm pointer-events-auto gap-2 border border-base-content/10 bg-base-100/90 text-base-content/80 shadow-sm backdrop-blur-sm hover:bg-base-100 hover:text-base-content"
				aria-label={previewRevealed ? 'Show form' : 'Preview Page'}
				aria-pressed={!previewRevealed}
				onclick={() => {
					previewRevealed = !previewRevealed;
				}}
			>
				<IconFormSelect class="h-5 w-5 shrink-0" aria-hidden="true" />
				{previewRevealed ? 'Show form' : 'Preview Page'}
			</button>
		</div>
	{/if}

	<Icons8BoogerAttribution />
</div>
