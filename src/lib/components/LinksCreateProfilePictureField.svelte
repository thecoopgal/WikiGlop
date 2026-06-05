<script lang="ts">
	import { getContext } from 'svelte';
	import {
		LINKS_CREATOR_PROFILE_PICTURE_ACCEPT,
		prepareProfilePictureDataUrl
	} from '$lib/client/links-create-profile-picture';
	import {
		setLinksCreateCreatorProfilePicture
	} from '$lib/client/links-create-state';
	import {
		THEME_CARDS_DELAY_MS,
		THEME_PROMPT_FADE_MS
	} from '$lib/links-create-theme-timing';
	import {
		LINKS_CREATE_CONTEXT_KEY,
		type LinksCreateContextState
	} from '$lib/links-create-context';
	import IconAccountCircle from '~icons/mdi/account-circle-outline';
	import IconCameraPlus from '~icons/mdi/camera-plus-outline';

	const linksCreateState = getContext<LinksCreateContextState>(LINKS_CREATE_CONTEXT_KEY);

	let showField = $state(false);
	let fileInputEl = $state<HTMLInputElement | null>(null);
	let uploading = $state(false);
	let errorMessage = $state('');

	$effect(() => {
		showField = false;
		const fieldTimer = window.setTimeout(() => {
			showField = true;
		}, THEME_CARDS_DELAY_MS);
		return () => window.clearTimeout(fieldTimer);
	});

	function persistPicture() {
		setLinksCreateCreatorProfilePicture(linksCreateState.creatorProfilePicture);
	}

	async function onFileSelected(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		uploading = true;
		errorMessage = '';
		try {
			linksCreateState.creatorProfilePicture = await prepareProfilePictureDataUrl(file);
			persistPicture();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Could not use that image.';
		} finally {
			uploading = false;
		}
	}

	function openFilePicker() {
		if (!showField || uploading) return;
		fileInputEl?.click();
	}
</script>

<div
	class="relative mx-auto mt-10 flex w-full max-w-xl flex-col items-center transition-opacity ease-out {showField
		? 'opacity-100'
		: 'opacity-0'}"
	style="transition-duration: {THEME_PROMPT_FADE_MS}ms"
	class:pointer-events-none={!showField}
	aria-hidden={!showField}
>
	<input
		bind:this={fileInputEl}
		type="file"
		accept={LINKS_CREATOR_PROFILE_PICTURE_ACCEPT}
		class="sr-only"
		tabindex={-1}
		onchange={onFileSelected}
	/>

	<button
		type="button"
		class="group relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-base-content/20 bg-base-100 shadow-sm transition hover:border-primary/40 hover:bg-base-100/90"
		aria-label={linksCreateState.creatorProfilePicture
			? 'Change profile picture'
			: 'Set profile picture'}
		tabindex={showField ? undefined : -1}
		disabled={uploading}
		onclick={openFilePicker}
	>
		{#if linksCreateState.creatorProfilePicture}
			<img
				src={linksCreateState.creatorProfilePicture}
				alt=""
				class="h-full w-full object-cover"
				decoding="async"
			/>
			<span
				class="absolute inset-0 flex items-center justify-center bg-base-content/45 opacity-0 transition group-hover:opacity-100"
			>
				<IconCameraPlus class="h-10 w-10 text-base-100" aria-hidden="true" />
			</span>
		{:else}
			<div class="flex flex-col items-center gap-2 text-base-content/50">
				<IconAccountCircle class="h-16 w-16" aria-hidden="true" />
				<span class="text-sm font-medium">Set photo</span>
			</div>
		{/if}
	</button>

	{#if uploading}
		<p class="mt-4 text-sm opacity-70">Processing image…</p>
	{:else if errorMessage}
		<p class="mt-4 text-sm text-error">{errorMessage}</p>
	{:else if linksCreateState.creatorProfilePicture}
		<button
			type="button"
			class="btn btn-ghost btn-sm mt-4"
			tabindex={showField ? undefined : -1}
			onclick={openFilePicker}
		>
			Change photo
		</button>
	{/if}
</div>
