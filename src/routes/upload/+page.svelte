<script lang="ts">
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';
	import LoadingGloopPanel from '$lib/components/LoadingGloopPanel.svelte';
	import IconUpload from '~icons/mdi/upload';
	import IconCheck from '~icons/mdi/check-circle';
	import IconAlert from '~icons/mdi/alert-circle';
	import {
		completeStreamUpload,
		createStreamUploadSession,
		uploadFileToStream,
		type UploadApiResult
	} from '$lib/upload-client';

	let fileInput = $state<HTMLInputElement | null>(null);
	let selectedFile = $state<File | null>(null);
	let previewUrl = $state('');
	let uploadPhase = $state<'idle' | 'uploading' | 'staged' | 'error'>('idle');
	let uploadPercent = $state<number | null>(null);
	let uploadStatusMessage = $state('Uploading to Gloopglop...');
	let uploadError = $state('');
	let staged = $state<UploadApiResult | null>(null);
	let creator = $state('');

	const isBusy = $derived(uploadPhase === 'uploading');

	$effect(() => {
		return () => {
			if (previewUrl) URL.revokeObjectURL(previewUrl);
		};
	});

	function onFileChange() {
		const file = fileInput?.files?.[0];
		uploadError = '';
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			previewUrl = '';
		}
		selectedFile = file ?? null;
		staged = null;
		uploadPhase = 'idle';
		uploadPercent = null;
		if (file) {
			previewUrl = URL.createObjectURL(file);
		}
	}

	async function stageUpload() {
		if (!selectedFile) {
			uploadError = 'Choose a video file first.';
			return;
		}
		const creatorId = creator.trim();
		if (!creatorId) {
			uploadError = 'Enter a creator id.';
			return;
		}
		uploadPhase = 'uploading';
		uploadError = '';
		uploadPercent = 0;
		uploadStatusMessage = 'Uploading to GloopGlop…';
		try {
			const session = await createStreamUploadSession(selectedFile, { creator: creatorId });
			await uploadFileToStream(selectedFile, session, (p) => {
				uploadPercent = p;
				uploadStatusMessage = 'Uploading to GloopGlop…';
			});
			uploadPercent = 100;
			uploadStatusMessage = 'Processing on Stream…';
			staged = await completeStreamUpload(session.id);
			uploadPhase = 'staged';
		} catch (e) {
			uploadPhase = 'error';
			uploadPercent = null;
			uploadError = e instanceof Error ? e.message : 'Upload failed';
		}
	}

	function formatBytes(n: number): string {
		if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
		return `${(n / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<svelte:head>
	<title>Upload · GloopGlop</title>
	<meta name="description" content="Upload a video to GloopGlop." />
</svelte:head>

<main class="min-h-[70vh] px-4 py-10">
	<div class="mx-auto max-w-xl">
		<header class="mb-8 text-center">
			<h1 class="text-3xl font-bold tracking-tight">Upload</h1>
		</header>

		<section class="card bg-base-100 shadow-xl">
			<div class="card-body gap-5">
				<h2 class="card-title text-lg">
					<IconUpload class="size-6" />
					Choose video
				</h2>

				<input
					bind:this={fileInput}
					type="file"
					accept="video/*"
					class="file-input file-input-bordered w-full"
					disabled={isBusy}
					onchange={onFileChange}
				/>

				<label class="form-control w-full">
					<span class="label-text font-medium">Creator</span>
					<input
						type="text"
						class="input input-bordered w-full"
						bind:value={creator}
						placeholder="e.g. thepaperjelly"
						maxlength="200"
						autocomplete="off"
						disabled={isBusy}
					/>
				</label>

				{#if selectedFile}
					<p class="text-sm text-base-content/70">
						{selectedFile.name} · {formatBytes(selectedFile.size)}
					</p>
				{/if}

				{#if previewUrl && selectedFile?.type.startsWith('video/') && uploadPhase !== 'uploading'}
					<!-- svelte-ignore a11y_media_has_caption — local preview only -->
					<video
						src={previewUrl}
						controls
						class="max-h-48 w-full rounded-lg bg-base-200"
						aria-label="Video preview"
					></video>
				{/if}

				{#if uploadPhase === 'uploading'}
					<LoadingGloopPanel message={uploadStatusMessage} percent={uploadPercent} />
				{:else if uploadPhase === 'staged'}
					<div class="alert alert-success text-sm">
						<IconCheck class="size-5 shrink-0" />
						<span>Uploaded. Pending approval before it appears on Watch.</span>
					</div>
					{#if staged?.streamUid && creator.trim()}
						<p class="text-sm text-base-content/70">
							After approval:
							<a href="/watch/{creator.trim().toLowerCase()}" class="link">
								/watch/{creator.trim().toLowerCase()}
							</a>
						</p>
					{/if}
				{:else}
					<button
						type="button"
						class="btn w-full border-0 text-white"
						style="background-color: #7ac943"
						disabled={!selectedFile || !creator.trim()}
						onclick={stageUpload}
					>
						Upload video
					</button>
				{/if}

				{#if uploadError}
					<div class="alert alert-error text-sm">
						<IconAlert class="size-5 shrink-0" />
						<span>{uploadError}</span>
					</div>
				{/if}
			</div>
		</section>

		<p class="mt-8 text-center text-xs text-base-content/50">
			<Icons8BoogerAttribution />
		</p>
	</div>
</main>
