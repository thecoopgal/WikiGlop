<script lang="ts">
	import { streamThumbnailSrc } from '$lib/stream-watch';

	type Props = {
		href: string;
		filename: string;
		streamUid: string;
		thumbnailUrl: string | null;
		createdAt: string;
		approvedAt: string | null;
		creatorName?: string;
	};

	let {
		href,
		filename,
		streamUid,
		thumbnailUrl,
		createdAt,
		approvedAt,
		creatorName
	}: Props = $props();

	const title = $derived(filename.replace(/\.[^.]+$/, '') || filename);
	const thumbSrc = $derived(thumbnailUrl?.trim() || streamThumbnailSrc(streamUid));
	const dateLabel = $derived(new Date(approvedAt ?? createdAt).toLocaleDateString());
	const metaLabel = $derived(creatorName ? `${creatorName} · ${dateLabel}` : dateLabel);
</script>

<a
	{href}
	class="group block overflow-hidden rounded-xl bg-base-300 shadow-md transition hover:shadow-lg"
>
	<figure class="relative aspect-video">
		<img
			src={thumbSrc}
			alt=""
			class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
			loading="lazy"
		/>
		<figcaption
			class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-3 pt-10 text-left"
		>
			<p class="line-clamp-2 text-sm font-semibold leading-snug text-white">{title}</p>
			<p class="mt-1 truncate text-xs text-white/75">{metaLabel}</p>
		</figcaption>
	</figure>
</a>
