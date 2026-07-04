<script lang="ts">
	import { getContext } from 'svelte';
	import {
		LINKS_CREATOR_PROFILE_PICTURE_ACCEPT,
		uploadProfilePicture
	} from '$lib/client/links-create-profile-picture';
	import { setLinksCreateCreatorProfilePicture } from '$lib/client/links-create-state';
	import { GLOOPGLOP_DEFAULT_LOGO_URL } from '$lib/glop-link-image';
	import {
		LINKS_CREATE_CONTEXT_KEY,
		type LinksCreateContextState
	} from '$lib/links-create-context';
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
			const url = await uploadProfilePicture(file);
			linksCreateState.creatorProfilePicture = url;
			setLinksCreateCreatorProfilePicture(url);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Could not upload that image.';
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
					onchange={(event) => void onFileSelected(event)}
				/>

				<button
					type="button"
					class="group relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-base-content/20 bg-base-100 shadow-sm transition hover:border-primary/40 hover:bg-base-100/90"
					aria-label="Upload profile picture"
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

				<button
					type="button"
					class="btn btn-primary btn-sm mt-4"
					disabled={uploading}
					onclick={openFilePicker}
				>
					{uploading ? 'Uploading…' : 'Upload photo'}
				</button>

				{#if uploading}
					<p class="mt-4 text-sm opacity-70">Uploading to Cloudflare Images…</p>
				{:else if errorMessage}
					<p class="mt-4 text-sm text-error">{errorMessage}</p>
				{:else}
					<p class="mt-3 text-center text-xs opacity-60">
						JPEG, PNG, WebP, or GIF. Hosted on Cloudflare Images.
					</p>
				{/if}
			</div>

			<div class="modal-action">
				<button type="button" class="btn" disabled={uploading} onclick={close}>Cancel</button>
				<button type="button" class="btn btn-primary" disabled={uploading} onclick={done}>Done</button>
			</div>
		</div>
		<button type="button" class="modal-backdrop bg-black/40" aria-label="Close" onclick={close}
		></button>
	</div>
{/if}
