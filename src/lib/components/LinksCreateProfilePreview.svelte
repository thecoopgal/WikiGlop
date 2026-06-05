<script lang="ts">

	import { getContext } from 'svelte';
	import { browser } from '$app/environment';
	import { creatorCardPreviewStyle } from '$lib/client/links-create-page-colors';

	import {

		getThemePreference,

		resolveEffectiveTheme,

		subscribeThemePreference,

		type EffectiveTheme

	} from '$lib/client/theme-preference';

	import {
		displayLinksCreatorLinkLabel,
		setLinksCreateCreatorShareIconVariant
	} from '$lib/client/links-create-state';
	import { linksCreateEditButtonClass } from '$lib/links-create-edit-button';
	import {
		LINKS_CREATE_CONTEXT_KEY,
		type CreatorPreviewLink,
		type LinksCreateContextState
	} from '$lib/links-create-context';

	import type { CreatorLinksThemeId } from '$lib/links-creator-themes';

	import CreatorLinkIcon from '$lib/components/CreatorLinkIcon.svelte';
	import LinksCreateColorEditBrush from '$lib/components/LinksCreateColorEditBrush.svelte';
	import LinksCreateCustomizeLinksModal from '$lib/components/LinksCreateCustomizeLinksModal.svelte';
	import LinksCreateCustomizePhotoModal from '$lib/components/LinksCreateCustomizePhotoModal.svelte';
	import LinksCreateCustomizeTextModal, {
		type CustomizeTextEditSection
	} from '$lib/components/LinksCreateCustomizeTextModal.svelte';
	import { GLOOPGLOP_DEFAULT_LOGO_URL } from '$lib/glop-link-image';
	import IconPencilOutline from '~icons/mdi/pencil-outline';



	const SHARE_ICON_LIGHT_URL =

		'https://imagedelivery.net/zdMtZgMUbYs7-R4-dRSl-Q/20ec55d3-136b-4ad6-f33a-12de645f5800/public';

	const SHARE_ICON_DARK_URL =

		'https://imagedelivery.net/zdMtZgMUbYs7-R4-dRSl-Q/7b2e7e40-67c2-4618-c73b-b97537901e00/public';



	let {

		profileTheme: _profileTheme,

		name = 'Your name',

		names = [],

		tagline = 'Your tagline here',

		bio = '',

		avatar = GLOOPGLOP_DEFAULT_LOGO_URL,

		links = [],

		compact = false,

		showColorEdits = false

	}: {

		profileTheme: CreatorLinksThemeId;

		name?: string;

		names?: string[];

		tagline?: string;

		bio?: string;

		avatar?: string;

		links?: CreatorPreviewLink[];

		compact?: boolean;

		showColorEdits?: boolean;

	} = $props();



	const linksCreateState = getContext<LinksCreateContextState>(LINKS_CREATE_CONTEXT_KEY);

	const previewLinks = $derived(links);

	const previewColorStyle = $derived(
		showColorEdits ? creatorCardPreviewStyle(linksCreateState.creatorPageColors) : ''
	);



	let runtimeTheme = $state<EffectiveTheme>('light');

	let activeNameIndex = $state(0);
	let activeTextEdit = $state<CustomizeTextEditSection | null>(null);
	let linksEditOpen = $state(false);
	let photoEditOpen = $state(false);

	const displayBio = $derived(
		showColorEdits ? linksCreateState.creatorPageDescription : bio
	);

	const displayTagline = $derived.by(() => {
		if (!showColorEdits) return tagline;
		const current = linksCreateState.creatorTagline.trim();
		return current || tagline;
	});

	const customizePencilButtonClass = $derived(linksCreateEditButtonClass(runtimeTheme));

	$effect(() => {
		if (!showColorEdits) {
			activeTextEdit = null;
			linksEditOpen = false;
			photoEditOpen = false;
		}
	});

	function openTextEdit(section: CustomizeTextEditSection) {
		if (!showColorEdits) return;
		activeTextEdit = section;
	}



	const shareIconUrl = $derived.by(() => {
		if (showColorEdits) {
			return linksCreateState.creatorShareIconVariant === 'dark'
				? SHARE_ICON_DARK_URL
				: SHARE_ICON_LIGHT_URL;
		}
		return runtimeTheme === 'dark' ? SHARE_ICON_DARK_URL : SHARE_ICON_LIGHT_URL;
	});

	function toggleShareIconVariant() {
		if (!showColorEdits) return;
		const next =
			linksCreateState.creatorShareIconVariant === 'light' ? 'dark' : 'light';
		linksCreateState.creatorShareIconVariant = next;
		setLinksCreateCreatorShareIconVariant(next);
	}

	const nameOptions = $derived.by(() => {

		const out: string[] = [];

		for (const value of names) {

			const trimmed = value.trim();

			if (!trimmed || out.includes(trimmed)) continue;

			out.push(trimmed);

		}

		if (out.length > 0) return out;

		const fallback = name.trim();

		return fallback ? [fallback] : ['Your name'];

	});



	const displayedName = $derived(nameOptions[activeNameIndex] ?? nameOptions[0] ?? 'Your name');

	const rotatesNames = $derived(nameOptions.length > 1);



	$effect(() => {

		if (!browser) return;

		const refresh = () => {

			runtimeTheme = resolveEffectiveTheme(getThemePreference());

		};

		refresh();

		return subscribeThemePreference(refresh);

	});



	$effect(() => {

		nameOptions;

		activeNameIndex = 0;

	});



	$effect(() => {

		if (nameOptions.length <= 1) return;

		const timer = setInterval(() => {

			activeNameIndex = (activeNameIndex + 1) % nameOptions.length;

		}, 2600);

		return () => clearInterval(timer);

	});

</script>



<section class="{compact ? 'my-3' : 'my-10'} w-full text-left">

	<div
		class="gloopglop-card-gradient gloopglop-card-border card relative border shadow-md"
		class:overflow-hidden={!showColorEdits}
		class:overflow-visible={showColorEdits}
		style={previewColorStyle}
	>
		{#if showColorEdits}
			<div class="absolute left-3 top-3 z-10">
				<LinksCreateColorEditBrush
					colorKey="base-100"
					ariaLabel="Edit card background"
				/>
			</div>
		{/if}

		<div class="card-body items-center p-5 text-center sm:p-6">

			<div

				class="grid w-full grid-cols-1 items-start gap-2 sm:grid-cols-[2.5rem_minmax(0,1fr)]"

			>

				<div class="hidden h-8 w-8 sm:block" aria-hidden="true"></div>



				<div

					class="flex min-w-0 w-full flex-col items-center gap-3 sm:flex-1 sm:flex-row sm:items-center sm:justify-center sm:gap-4"

				>

					{#if showColorEdits}
						<button
							type="button"
							class="group relative h-24 w-24 shrink-0 overflow-hidden rounded-full sm:h-16 sm:w-16"
							aria-label="Edit profile picture"
							onclick={() => {
								photoEditOpen = true;
							}}
						>
							<img
								src={avatar}
								alt=""
								class="h-full w-full object-cover"
								width="96"
								height="96"
								decoding="async"
							/>
							<span
								class="absolute inset-0 flex items-center justify-center bg-base-content/45 opacity-0 transition group-hover:opacity-100"
							>
								<IconPencilOutline
									class="h-8 w-8 text-base-100 sm:h-6 sm:w-6"
									aria-hidden="true"
								/>
							</span>
						</button>
					{:else}
						<img
							src={avatar}
							alt=""
							class="h-24 w-24 shrink-0 rounded-full object-cover sm:h-16 sm:w-16"
							width="96"
							height="96"
							decoding="async"
						/>
					{/if}

					<div class="min-w-0 w-full text-center sm:flex-1 sm:text-left">
						<div class="relative w-full min-w-0">
							<h2
								class="profile-name-heading w-full min-w-0 max-w-full text-xl font-bold sm:text-2xl"
								class:grid={rotatesNames}
								class:grid-cols-1={rotatesNames}
							>
								{#if rotatesNames}
									{#each nameOptions as option (option)}
										<span
											class="profile-name-measure invisible col-start-1 row-start-1 block min-w-0 max-w-full pointer-events-none select-none"
											aria-hidden="true"
										>{option}</span>
									{/each}
								{/if}
								{#key activeNameIndex}
									<span
										class="profile-name-measure block min-w-0 max-w-full profile-name-anim profile-name-anim-fade"
										class:col-start-1={rotatesNames}
										class:row-start-1={rotatesNames}
									>{displayedName}</span>
								{/key}
							</h2>
							{#if showColorEdits}
								<div
									class="absolute right-0 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1"
								>
									<button
										type="button"
										class={customizePencilButtonClass}
										aria-label="Edit names"
										onclick={() => openTextEdit('name')}
									>
										<IconPencilOutline class="h-4 w-4 shrink-0" aria-hidden="true" />
									</button>
									<LinksCreateColorEditBrush
										colorKey="heading"
										ariaLabel="Edit name text color"
									/>
								</div>
							{/if}
						</div>

						<div class="relative mx-auto mt-3 w-full max-w-sm sm:mx-0 sm:mt-5">
							<p
								class="gloopglop-subheading w-full text-sm opacity-80 sm:text-left"
							>
								{displayTagline}
							</p>
							{#if showColorEdits}
								<div
									class="absolute right-0 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1"
								>
									<button
										type="button"
										class={customizePencilButtonClass}
										aria-label="Edit tagline"
										onclick={() => openTextEdit('tagline')}
									>
										<IconPencilOutline class="h-4 w-4 shrink-0" aria-hidden="true" />
									</button>
									<LinksCreateColorEditBrush
										colorKey="subheading"
										ariaLabel="Edit tagline text color"
									/>
								</div>
							{/if}
						</div>
					</div>

				</div>

			</div>



			{#if displayBio || showColorEdits}
				<div
					class="relative mx-auto mt-3 w-full max-w-md {showColorEdits && !displayBio
						? 'min-h-8'
						: ''}"
				>
					{#if displayBio}
						<p
							class="gloopglop-text-box-text w-full whitespace-pre-line text-center text-sm opacity-80"
						>
							{displayBio}
						</p>
					{/if}
					{#if showColorEdits}
						<div
							class="absolute bottom-0 right-0 z-10 flex translate-x-1/4 translate-y-1/4 items-center gap-1"
						>
							<button
								type="button"
								class={customizePencilButtonClass}
								aria-label="Edit description text"
								onclick={() => openTextEdit('description')}
							>
								<IconPencilOutline class="h-4 w-4 shrink-0" aria-hidden="true" />
							</button>
							<LinksCreateColorEditBrush
								colorKey="text-box-text"
								ariaLabel="Edit description text color"
							/>
						</div>
					{/if}
				</div>
			{/if}

			<div class="mt-3 flex w-full justify-center">
				<div class="relative inline-flex">
					<div
						class="gloopglop-share-background gloopglop-share-border gloopglop-button-text btn btn-sm rounded-full border"
						class:pointer-events-none={!showColorEdits}
						aria-hidden={!showColorEdits}
					>
						{#if showColorEdits}
							<button
								type="button"
								class="btn btn-ghost btn-xs btn-circle pointer-events-auto shrink-0 border-0 bg-transparent p-0 shadow-none hover:bg-base-content/10"
								aria-label="Switch share icon between light and dark"
								onclick={toggleShareIconVariant}
							>
								<img src={shareIconUrl} alt="" class="h-4 w-4 object-contain" />
							</button>
						{:else}
							<img src={shareIconUrl} alt="" class="h-4 w-4 object-contain" />
						{/if}
						Share profile
					</div>
					{#if showColorEdits}
						<div
							class="absolute right-full top-1/2 z-10 mr-1.5 flex -translate-y-1/2 items-center gap-1"
						>
							<LinksCreateColorEditBrush
								colorKey="share-background"
								ariaLabel="Edit share button background color"
							/>
							<LinksCreateColorEditBrush
								colorKey="share-border"
								ariaLabel="Edit share button border color"
							/>
						</div>
						<div class="absolute left-full top-1/2 z-10 ml-1.5 -translate-y-1/2">
							<LinksCreateColorEditBrush
								colorKey="button-text"
								ariaLabel="Edit share button text color"
							/>
						</div>
					{/if}
				</div>
			</div>



			{#if previewLinks.length > 0 || showColorEdits}
			<div class="mx-auto mt-5 flex w-full max-w-md flex-col gap-2">
				{#each previewLinks as link, index (link.label + link.href)}
					<div class="relative w-full">
						{#if showColorEdits && index === 0}
							<div
								class="absolute left-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1"
							>
								<LinksCreateColorEditBrush
									colorKey="link-background"
									ariaLabel="Edit link background color"
								/>
								<LinksCreateColorEditBrush
									colorKey="link-border"
									ariaLabel="Edit link border color"
								/>
							</div>
							<div
								class="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1"
							>
								<button
									type="button"
									class={customizePencilButtonClass}
									aria-label="Edit links"
									onclick={() => {
										linksEditOpen = true;
									}}
								>
									<IconPencilOutline class="h-4 w-4 shrink-0" aria-hidden="true" />
								</button>
								<LinksCreateColorEditBrush
									colorKey="link-text"
									ariaLabel="Edit link text color"
								/>
							</div>
						{/if}
						<div
							class="gloopglop-link-background gloopglop-link-border btn btn-sm btn-outline pointer-events-none h-auto min-h-10 w-full min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2 font-medium normal-case"
							aria-hidden="true"
						>
							{#if link.iconMode !== 'none'}
								<CreatorLinkIcon
									href={link.href}
									mode={link.iconMode ?? 'basic'}
									fallback="link"
								/>
							{/if}
							<span
								class="gloopglop-link-text truncate text-center text-xs leading-tight"
								>{displayLinksCreatorLinkLabel(link.label)}</span
							>
						</div>
					</div>
				{/each}
				{#if showColorEdits && previewLinks.length === 0}
					<div class="relative flex min-h-10 w-full justify-center">
						<button
							type="button"
							class="{customizePencilButtonClass} absolute right-0 top-1/2 -translate-y-1/2"
							aria-label="Edit links"
							onclick={() => {
								linksEditOpen = true;
							}}
						>
							<IconPencilOutline class="h-4 w-4 shrink-0" aria-hidden="true" />
						</button>
					</div>
				{/if}
			</div>
			{/if}

		</div>

	</div>

	{#if showColorEdits}
		<div class="mt-2 flex justify-center items-center gap-1">
			<LinksCreateColorEditBrush
				colorKey="card-gradient"
				ariaLabel="Edit card gradient color"
			/>
			<LinksCreateColorEditBrush
				colorKey="card-border"
				ariaLabel="Edit card border color"
			/>
		</div>
	{/if}

	<LinksCreateCustomizeTextModal bind:section={activeTextEdit} />
	<LinksCreateCustomizeLinksModal bind:open={linksEditOpen} />
	<LinksCreateCustomizePhotoModal bind:open={photoEditOpen} />

</section>

