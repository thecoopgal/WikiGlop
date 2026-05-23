<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';
	import IconYoutube from '~icons/mdi/youtube';
	import IconUpload from '~icons/mdi/upload';
	import IconCheck from '~icons/mdi/check-circle';
	import IconAlert from '~icons/mdi/alert-circle';
	import type { PageData } from './$types';
	import {
		fetchUploadDestinations,
		fetchUploadStatus,
		publishUploadToYoutube,
		startGoogleUploadAuth,
		uploadVideoFile,
		type UploadApiResult
	} from '$lib/upload-client';

	const { data } = $props<{ data: PageData }>();

	let fileInput = $state<HTMLInputElement | null>(null);
	let selectedFile = $state<File | null>(null);
	let previewUrl = $state('');
	let uploadPhase = $state<'idle' | 'uploading' | 'staged' | 'error'>('idle');
	let uploadError = $state('');
	let staged = $state<UploadApiResult | null>(null);
	let youtubeTitle = $state('');
	let youtubeDescription = $state('');
	let youtubePrivacy = $state<'private' | 'unlisted' | 'public'>('private');
	let publishPhase = $state<'idle' | 'loading' | 'done' | 'error'>('idle');
	let publishError = $state('');
	let youtubeUrl = $state('');
	let googleConnected = $state(false);
	let googleEmail = $state<string | null>(null);
	let googleConfigured = $state(false);

	$effect(() => {
		googleConnected = data.google.connected;
		googleEmail = data.google.email;
		googleConfigured = data.google.configured;
	});

	onMount(() => {
		void refreshDestinations();
		if (page.url.searchParams.get('google') === 'connected') {
			const u = new URL(page.url);
			u.searchParams.delete('google');
			history.replaceState({}, '', u.pathname + u.search);
		}
		return () => {
			if (previewUrl) URL.revokeObjectURL(previewUrl);
		};
	});

	async function refreshDestinations() {
		try {
			const res = await fetchUploadDestinations();
			const yt = res.destinations.find((d) => d.id === 'youtube');
			googleConnected = res.google.connected;
			googleEmail = res.google.email ?? yt?.accountEmail ?? null;
			googleConfigured = res.google.configured;
		} catch {
			/* keep server-loaded state */
		}
	}

	function onFileChange() {
		const file = fileInput?.files?.[0];
		uploadError = '';
		publishError = '';
		publishPhase = 'idle';
		youtubeUrl = '';
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			previewUrl = '';
		}
		selectedFile = file ?? null;
		staged = null;
		uploadPhase = 'idle';
		if (file) {
			previewUrl = URL.createObjectURL(file);
			if (!youtubeTitle.trim()) {
				youtubeTitle = file.name.replace(/\.[^.]+$/, '') || 'GloopGlop upload';
			}
		}
	}

	async function stageUpload() {
		if (!selectedFile) {
			uploadError = 'Choose a video file first.';
			return;
		}
		uploadPhase = 'uploading';
		uploadError = '';
		try {
			staged = await uploadVideoFile(selectedFile);
			uploadPhase = 'staged';
		} catch (e) {
			uploadPhase = 'error';
			uploadError = e instanceof Error ? e.message : 'Upload failed';
		}
	}

	function connectGoogle() {
		startGoogleUploadAuth('/upload');
	}

	async function publishToYoutube() {
		if (!staged) return;
		if (!googleConnected) {
			connectGoogle();
			return;
		}
		publishPhase = 'loading';
		publishError = '';
		youtubeUrl = '';
		try {
			const res = await publishUploadToYoutube({
				uploadId: staged.id,
				title: youtubeTitle.trim() || undefined,
				description: youtubeDescription,
				privacyStatus: youtubePrivacy
			});
			youtubeUrl = res.videoUrl;
			publishPhase = 'done';
			await fetchUploadStatus(staged.id);
		} catch (e) {
			publishPhase = 'error';
			publishError = e instanceof Error ? e.message : 'YouTube upload failed';
		}
	}

	function formatBytes(n: number): string {
		if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
		return `${(n / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<svelte:head>
	<title>Upload · GloopGlop</title>
	<meta name="description" content="Upload a video and publish to YouTube with Google sign-in." />
</svelte:head>

<main class="min-h-[70vh] px-4 py-10">
	<div class="mx-auto max-w-xl">
		<header class="mb-8 text-center">
			<h1 class="text-3xl font-bold tracking-tight">Upload</h1>
			<p class="mt-2 text-base-content/70">
				Stage a video on GloopGlop, then publish it to connected platforms.
			</p>
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
					onchange={onFileChange}
				/>

				{#if selectedFile}
					<p class="text-sm text-base-content/70">
						{selectedFile.name} · {formatBytes(selectedFile.size)}
					</p>
				{/if}

				{#if previewUrl && selectedFile?.type.startsWith('video/')}
					<!-- svelte-ignore a11y_media_has_caption — local preview only -->
					<video
						src={previewUrl}
						controls
						class="max-h-48 w-full rounded-lg bg-base-200"
						aria-label="Video preview"
					></video>
				{/if}

				{#if uploadPhase !== 'staged'}
					<button
						type="button"
						class="btn w-full border-0 text-white"
						style="background-color: #7ac943"
						disabled={!selectedFile || uploadPhase === 'uploading'}
						onclick={stageUpload}
					>
						{uploadPhase === 'uploading' ? 'Uploading…' : 'Upload to GloopGlop'}
					</button>
				{:else}
					<div class="alert alert-success text-sm">
						<IconCheck class="size-5 shrink-0" />
						<span>Staged on GloopGlop — ready to publish.</span>
					</div>
				{/if}

				{#if uploadError}
					<div class="alert alert-error text-sm">
						<IconAlert class="size-5 shrink-0" />
						<span>{uploadError}</span>
					</div>
				{/if}
			</div>
		</section>

		{#if uploadPhase === 'staged' && staged}
			<section class="card mt-6 bg-base-100 shadow-xl">
				<div class="card-body gap-4">
					<h2 class="card-title text-lg">Upload to:</h2>

					{#if !googleConfigured}
						<div class="alert alert-warning text-sm">
							<IconAlert class="size-5 shrink-0" />
							<span>
								Google sign-in is not configured on this environment. Set
								<code class="text-xs">GOOGLE_OAUTH_*</code> secrets to enable YouTube.
							</span>
						</div>
					{/if}

					<div class="flex flex-col gap-3 sm:flex-row sm:items-start">
						<button
							type="button"
							class="btn flex-1 gap-2"
							class:btn-outline={!googleConnected}
							disabled={!googleConfigured}
							onclick={connectGoogle}
						>
							<IconYoutube class="size-5 text-[#FF0000]" />
							{#if googleConnected}
								{googleEmail ? `YouTube · ${googleEmail}` : 'YouTube · Connected'}
							{:else}
								Connect Google for YouTube
							{/if}
						</button>
					</div>

					<div class="divider my-0 text-xs">YouTube details</div>

					<label class="form-control w-full">
						<span class="label-text">Title</span>
						<input
							type="text"
							class="input input-bordered w-full"
							bind:value={youtubeTitle}
							maxlength="100"
						/>
					</label>

					<label class="form-control w-full">
						<span class="label-text">Description</span>
						<textarea
							class="textarea textarea-bordered w-full"
							rows="3"
							bind:value={youtubeDescription}
						></textarea>
					</label>

					<label class="form-control w-full">
						<span class="label-text">Visibility</span>
						<select class="select select-bordered w-full" bind:value={youtubePrivacy}>
							<option value="private">Private</option>
							<option value="unlisted">Unlisted</option>
							<option value="public">Public</option>
						</select>
					</label>

					<button
						type="button"
						class="btn w-full gap-2 border-0 text-white"
						style="background-color: #7ac943"
						disabled={publishPhase === 'loading' || !googleConfigured}
						onclick={publishToYoutube}
					>
						<IconYoutube class="size-5" />
						{#if publishPhase === 'loading'}
							Uploading to YouTube…
						{:else if !googleConnected}
							Sign in & upload to YouTube
						{:else}
							Upload to YouTube
						{/if}
					</button>

					{#if publishPhase === 'done' && youtubeUrl}
						<div class="alert alert-success text-sm">
							<IconCheck class="size-5 shrink-0" />
							<span>
								Live on YouTube —
								<a href={youtubeUrl} target="_blank" rel="noopener noreferrer" class="link">
									{youtubeUrl}
								</a>
							</span>
						</div>
					{/if}

					{#if publishError}
						<div class="alert alert-error text-sm">
							<IconAlert class="size-5 shrink-0" />
							<span>{publishError}</span>
						</div>
					{/if}
				</div>
			</section>
		{/if}

		<p class="mt-8 text-center text-xs text-base-content/50">
			<Icons8BoogerAttribution />
		</p>
	</div>
</main>
