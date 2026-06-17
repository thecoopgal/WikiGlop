<script lang="ts">
	import { parseYouTubeVideoId, youtubeEmbedSrc } from '$lib/youtube-embed';

	type GlopSeo = { title?: string | null; description?: string | null };

	const {
		answerUrl,
		gloopCount,
		seo,
		logoUrl,
		variant = 'default',
		creatorLabel = null,
		displayTitle = null,
		displayDescription = null,
		linkLabel
	}: {
		answerUrl: string;
		gloopCount: number;
		seo?: GlopSeo;
		logoUrl: string;
		variant?: 'default' | 'nested' | 'profile';
		creatorLabel?: string | null;
		displayTitle?: string | null;
		displayDescription?: string | null;
		linkLabel: string;
	} = $props();

	const youtubeId = $derived(parseYouTubeVideoId(answerUrl));
	const embedSrc = $derived(youtubeId ? youtubeEmbedSrc(youtubeId) : null);

	const isNested = $derived(variant === 'nested');
	const isProfile = $derived(variant === 'profile');

	const rowClass = $derived(
		isProfile
			? 'group flex cursor-pointer flex-row items-start gap-4 rounded-lg no-underline outline-none transition-colors hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100'
			: isNested
				? 'group flex cursor-pointer flex-row items-start gap-3 px-3 py-3 no-underline outline-none transition-colors hover:bg-base-200/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary'
				: 'group flex cursor-pointer flex-row items-start gap-4 px-4 py-4 no-underline outline-none transition-colors hover:bg-base-200/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary'
	);

	const logoClass = $derived(
		isNested
			? 'h-9 w-9 rounded-lg object-cover ring-1 ring-base-300'
			: isProfile
				? 'h-11 w-11 rounded-xl object-cover ring-1 ring-primary/40'
				: 'h-11 w-11 rounded-xl object-cover ring-1 ring-base-300'
	);

	const logoSize = $derived(isNested ? 36 : 44);

	const badgeClass = $derived(
		isNested
			? 'badge badge-sm absolute -bottom-0.5 -right-0.5 min-w-[1.1rem] scale-90 justify-center border-0 bg-primary px-1 text-[10px] text-primary-content'
			: 'badge badge-sm absolute -bottom-1 -right-1 min-w-[1.25rem] justify-center border-0 bg-primary px-1.5 text-primary-content'
	);

	const titleClass = $derived(
		isNested ? 'line-clamp-2 text-sm leading-snug opacity-85' : 'line-clamp-2 text-base leading-snug opacity-90'
	);

	const descriptionClass = $derived(
		isNested ? 'line-clamp-2 text-xs leading-relaxed opacity-70' : 'line-clamp-3 text-sm leading-relaxed opacity-75'
	);

	const linkClass = $derived(
		isNested
			? 'mt-auto block break-words pt-1 text-xs font-semibold text-primary group-hover:underline'
			: 'mt-auto block break-words pt-1 text-sm font-semibold text-primary group-hover:underline'
	);

	const textColClass = $derived(isNested ? 'flex min-w-0 flex-1 flex-col gap-0.5' : 'flex min-w-0 flex-1 flex-col gap-1');

	const embedWrapClass = $derived(
		isNested ? 'relative px-3 pt-3' : isProfile ? 'relative mb-3' : 'relative px-4 pt-4'
	);

	const title = $derived(displayTitle ?? seo?.title?.trim() ?? null);
	const description = $derived(displayDescription ?? seo?.description?.trim() ?? null);
</script>

{#if embedSrc}
	<div class={embedWrapClass}>
		<div class="aspect-video w-full overflow-hidden rounded-xl bg-black">
			<iframe
				src={embedSrc}
				title={title ?? 'YouTube video'}
				class="h-full w-full border-0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
				referrerpolicy="strict-origin-when-cross-origin"
				allowfullscreen
			></iframe>
		</div>
		<span
			class="{badgeClass} absolute top-5 right-5 sm:top-6 sm:right-6"
			title="Gloops for this question and link"
		>
			{gloopCount}
		</span>
	</div>
{/if}

<a href={answerUrl} target="_blank" rel="noopener noreferrer" title={answerUrl} class={rowClass}>
	{#if !embedSrc}
		<div class="relative shrink-0 self-start">
			<img
				src={logoUrl}
				alt=""
				class={logoClass}
				width={logoSize}
				height={logoSize}
				decoding="async"
			/>
			<span class={badgeClass} title="Gloops for this question and link">
				{gloopCount}
			</span>
		</div>
	{/if}

	<div class={textColClass}>
		{#if creatorLabel}
			<p class="text-xs font-medium text-base-content/70">{creatorLabel}</p>
		{/if}
		{#if title}
			<p class={titleClass}>{title}</p>
		{/if}
		{#if description}
			<p class={descriptionClass}>{description}</p>
		{/if}
		<p class={linkClass}>
			{embedSrc ? 'Open on YouTube' : linkLabel}
		</p>
	</div>

	{#if embedSrc}
		<span class="sr-only">{gloopCount} gloops</span>
	{/if}
</a>
