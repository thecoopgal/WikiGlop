<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';
	import LoadingGloopPanel from '$lib/components/LoadingGloopPanel.svelte';
	import UploadDestinationPicker, {
		type UploadDestinationId
	} from '$lib/components/UploadDestinationPicker.svelte';
	import IconYoutube from '~icons/mdi/youtube';
	import IconUpload from '~icons/mdi/upload';
	import IconCheck from '~icons/mdi/check-circle';
	import IconAlert from '~icons/mdi/alert-circle';
	import type { PageData } from './$types';
	import {
		completeStreamUpload,
		createStreamUploadSession,
		fetchUploadDestinations,
		fetchUploadStatus,
		publishUploadToYoutube,
		startGoogleUploadAuth,
		uploadFileToStream,
		type UploadApiResult
	} from '$lib/upload-client';

	const { data } = $props<{ data: PageData }>();

	let fileInput = $state<HTMLInputElement | null>(null);
	let selectedFile = $state<File | null>(null);
	let previewUrl = $state('');
	let uploadPhase = $state<'idle' | 'uploading' | 'staged' | 'error'>('idle');
	let uploadPercent = $state<number | null>(null);
	let uploadStatusMessage = $state('Uploading to Cloudflare Stream…');
	let uploadError = $state('');
	let staged = $state<UploadApiResult | null>(null);
	let selectedDestinations = $state<Set<UploadDestinationId>>(
		new Set(['gloopglop', 'youtube'])
	);
	let youtubeTitle = $state('');
	let youtubeDescription = $state('');
	let youtubePrivacy = $state<'private' | 'unlisted' | 'public'>('private');
	let publishPhase = $state<'idle' | 'loading' | 'done' | 'error'>('idle');
	let publishError = $state('');
	let youtubeUrl = $state('');
	let googleConnected = $state(false);
	let googleEmail = $state<string | null>(null);
	let googleConfigured = $state(false);

	const wantsYoutube = $derived(selectedDestinations.has('youtube'));
	const wantsTiktok = $derived(selectedDestinations.has('tiktok'));
	const isBusy = $derived(uploadPhase === 'uploading' || publishPhase === 'loading');

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
		uploadPercent = null;
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
		uploadPercent = 0;
		uploadStatusMessage = 'Uploading to Cloudflare Stream…';
		try {
			const session = await createStreamUploadSession(selectedFile);
			await uploadFileToStream(selectedFile, session, (p) => {
				uploadPercent = p;
				uploadStatusMessage = 'Uploading to Cloudflare Stream…';
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
				Your video uploads directly to Cloudflare Stream. Pick destinations while it uploads.
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
					disabled={isBusy}
					onchange={onFileChange}
				/>

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
					<UploadDestinationPicker
						selected={selectedDestinations}
						onSelectedChange={(s) => (selectedDestinations = s)}
						{googleConnected}
						{googleConfigured}
						compact
					/>
				{:else if uploadPhase === 'staged'}
					<div class="alert alert-success text-sm">
						<IconCheck class="size-5 shrink-0" />
						<span>Saved on GloopGlop (Cloudflare Stream).</span>
					</div>
					<UploadDestinationPicker
						selected={selectedDestinations}
						onSelectedChange={(s) => (selectedDestinations = s)}
						disabled={publishPhase === 'loading'}
						{googleConnected}
						{googleConfigured}
					/>
				{:else}
					<UploadDestinationPicker
						selected={selectedDestinations}
						onSelectedChange={(s) => (selectedDestinations = s)}
						disabled={!selectedFile}
						{googleConnected}
						{googleConfigured}
					/>
					<button
						type="button"
						class="btn w-full border-0 text-white"
						style="background-color: #7ac943"
						disabled={!selectedFile}
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

		{#if uploadPhase === 'staged' && staged && wantsYoutube}
			<section class="card mt-6 bg-base-100 shadow-xl">
				<div class="card-body gap-4">
					<h2 class="card-title text-lg gap-2">
						<IconYoutube class="size-6 text-[#FF0000]" />
						YouTube
					</h2>

					{#if !googleConfigured}
						<div class="alert alert-warning text-sm">
							<IconAlert class="size-5 shrink-0" />
							<span>
								Google sign-in is not configured on this environment. Set
								<code class="text-xs">GOOGLE_OAUTH_*</code> secrets to enable YouTube.
							</span>
						</div>
					{:else if !googleConnected}
						<button
							type="button"
							class="btn btn-outline w-full gap-2"
							disabled={publishPhase === 'loading'}
							onclick={connectGoogle}
						>
							<IconYoutube class="size-5 text-[#FF0000]" />
							Connect Google for YouTube
						</button>
					{/if}

					{#if googleConnected || !googleConfigured}
						<label class="form-control w-full">
							<span class="label-text">Title</span>
							<input
								type="text"
								class="input input-bordered w-full"
								bind:value={youtubeTitle}
								maxlength="100"
								disabled={publishPhase === 'loading'}
							/>
						</label>

						<label class="form-control w-full">
							<span class="label-text">Description</span>
							<textarea
								class="textarea textarea-bordered w-full"
								rows="3"
								bind:value={youtubeDescription}
								disabled={publishPhase === 'loading'}
							></textarea>
						</label>

						<label class="form-control w-full">
							<span class="label-text">Visibility</span>
							<select
								class="select select-bordered w-full"
								bind:value={youtubePrivacy}
								disabled={publishPhase === 'loading'}
							>
								<option value="private">Private</option>
								<option value="unlisted">Unlisted</option>
								<option value="public">Public</option>
							</select>
						</label>
					{/if}

					{#if publishPhase === 'loading'}
						<LoadingGloopPanel message="Glooping to YouTube…" />
					{:else if googleConnected && googleConfigured}
						<button
							type="button"
							class="btn w-full gap-2 border-0 text-white"
							style="background-color: #7ac943"
							onclick={publishToYoutube}
						>
							<IconYoutube class="size-5" />
							Upload to YouTube
						</button>
					{/if}

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

		{#if uploadPhase === 'staged' && staged && wantsTiktok}
			<section class="card mt-6 bg-base-100 shadow-xl">
				<div class="card-body gap-3">
					<h2 class="card-title text-lg">TikTok</h2>
					<div class="alert alert-info text-sm">
						<IconAlert class="size-5 shrink-0" />
						<span>TikTok uploads are coming soon. Your video is saved on GloopGlop in the meantime.</span>
					</div>
				</div>
			</section>
		{/if}

		{#if uploadPhase === 'staged' && staged && !wantsYoutube && !wantsTiktok}
			<p class="mt-6 text-center text-sm text-base-content/70">
				Your video is on GloopGlop. Pick YouTube or TikTok above to publish elsewhere.
			</p>
		{/if}

		<p class="mt-8 text-center text-xs text-base-content/50">
			<Icons8BoogerAttribution />
		</p>
	</div>
</main>
