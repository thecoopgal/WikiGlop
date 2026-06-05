<script lang="ts">
	import { streamIframeSrc, streamThumbnailSrc } from '$lib/stream-watch';

	const {
		streamUid,
		title = 'Video',
		mock = false,
		thumbnailUrl = null
	}: {
		streamUid: string;
		title?: string;
		mock?: boolean;
		thumbnailUrl?: string | null;
	} = $props();

	const src = $derived(streamIframeSrc(streamUid));
	const mockThumbSrc = $derived(thumbnailUrl?.trim() || streamThumbnailSrc(streamUid));
</script>

{#if mock}
	<div class="relative aspect-video w-full overflow-hidden rounded-lg bg-base-300">
		<img src={mockThumbSrc} alt="" class="h-full w-full object-cover" />
		<div class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 px-4 text-center">
			<span class="badge badge-lg border-0 bg-primary text-primary-content">Mock preview</span>
			<p class="max-w-sm text-sm text-white/90">Placeholder player for design — no Stream video attached.</p>
		</div>
	</div>
{:else}
	<div class="aspect-video w-full overflow-hidden rounded-lg bg-black">
		<iframe
			{src}
			{title}
			class="h-full w-full border-0"
			allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
			allowfullscreen
		></iframe>
	</div>
{/if}
