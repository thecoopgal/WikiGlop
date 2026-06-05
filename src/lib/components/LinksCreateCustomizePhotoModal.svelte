<script lang="ts">
	import { getContext } from 'svelte';
	import {
		LINKS_CREATOR_PROFILE_PICTURE_ACCEPT,
		prepareProfilePictureDataUrl
	} from '$lib/client/links-create-profile-picture';
	import { setLinksCreateCreatorProfilePicture } from '$lib/client/links-create-state';
	import { GLOOPGLOP_DEFAULT_LOGO_URL } from '$lib/glop-link-image';
	import {
		LINKS_CREATE_CONTEXT_KEY,
		type LinksCreateContextState
	} from '$lib/links-create-context';
	import IconAccountCircle from '~icons/mdi/account-circle-outline';
	import IconCameraPlus from '~icons/mdi/camera-plus-outline';

	let { open = $bindable(false) }: { open: boolean } = $props();

	const linksCreateState = getContext<LinksCreateContextState>(LINKS_CREATE_CONTEXT_KEY);

	let fileInputEl = $state<HTMLInputElement | null>(null);
	let uploading = $state(false);
	let errorMessage = $state('');

	const previewSrc = $derived(
		linksCreateState.creatorProfilePicture.trim() || GLOOPGLOP_DEFAULT_LOGO_URL
	);

	function close() {
		open = false;
	}

	function done() {
		setLinksCreateCreatorProfilePicture(linksCreateState.creatorProfilePicture);
		close();
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
			setLinksCreateCreatorProfilePicture(linksCreateState.creatorProfilePicture);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Could not use that image.';
		} finally {
			uploading = false;
		}
	}

	function openFilePicker() {
		if (uploading) return;
		fileInputEl?.click();
	}
</script>

{#if open}
	<div class="modal modal-open z-[200]" role="dialog" aria-modal="true">
		<div class="modal-box relative z-[201] max-w-sm">
			<h3 class="text-lg font-bold">Edit profile picture</h3>

			<div class="mt-4 flex flex-col items-center">
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
					aria-label="Choose profile picture"
					disabled={uploading}
					onclick={openFilePicker}
				>
					<img
						src={previewSrc}
						alt=""
						class="h-full w-full object-cover"
						decoding="async"
					/>
					<span
						class="absolute inset-0 flex items-center justify-center bg-base-content/45 opacity-0 transition group-hover:opacity-100"
					>
						<IconCameraPlus class="h-10 w-10 text-base-100" aria-hidden="true" />
					</span>
				</button>

				{#if uploading}
					<p class="mt-4 text-sm opacity-70">Processing image…</p>
				{:else if errorMessage}
					<p class="mt-4 text-sm text-error">{errorMessage}</p>
				{/if}

				{#if !linksCreateState.creatorProfilePicture.trim()}
					<div class="mt-2 flex items-center gap-1 text-xs text-base-content/55">
						<IconAccountCircle class="h-4 w-4 shrink-0" aria-hidden="true" />
						<span>Using the default GloopGlop logo until you upload one.</span>
					</div>
				{/if}
			</div>

			<div class="modal-action">
				<button type="button" class="btn" onclick={close}>Cancel</button>
				<button type="button" class="btn btn-primary" disabled={uploading} onclick={done}>
					Done
				</button>
			</div>
		</div>
		<button type="button" class="modal-backdrop z-[200]" aria-label="Close" onclick={close}
		></button>
	</div>
{/if}
