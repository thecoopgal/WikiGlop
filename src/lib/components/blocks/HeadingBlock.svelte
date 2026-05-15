<script lang="ts">
	import IconLink from '~icons/mdi/link-variant';

	type Props = {
		id?: string;
		level?: number | string;
		text?: string;
	};

	let { id, level, text } = $props() as Props;

	const safeLevel = $derived(typeof level === 'number' ? level : Number(level));
	const safeText = $derived(text ?? '');
	const anchorId = $derived((id ?? '').trim());
	const showSectionLink = $derived(safeLevel === 2 && !!anchorId);

	const tag = $derived(safeLevel >= 1 && safeLevel <= 6 ? `h${safeLevel}` : 'h2');

	const headingClass = $derived(
		tag === 'h1'
			? 'text-4xl font-bold'
			: tag === 'h2'
				? 'text-3xl font-bold'
				: tag === 'h3'
					? 'text-2xl font-bold'
					: tag === 'h4'
						? 'text-xl font-bold'
						: tag === 'h5'
							? 'text-lg font-bold'
							: 'text-base font-bold'
	);

	let copyState = $state<'idle' | 'copied' | 'error'>('idle');
	let copyTimer: ReturnType<typeof setTimeout> | null = null;

	const copyMessage = $derived(copyState === 'copied' ? 'Copied!' : copyState === 'error' ? 'Copy failed' : '');
	const copyButtonLabel = $derived(copyState === 'idle' ? 'Copy link to this section' : copyMessage);

	function updateSectionHash() {
		if (!anchorId || typeof window === 'undefined') return '';
		const url = new URL(window.location.href);
		url.hash = anchorId;
		history.replaceState(history.state, '', url);
		return url.href;
	}

	async function copySectionLink() {
		if (!anchorId || typeof window === 'undefined') return;
		const url = updateSectionHash();
		try {
			await navigator.clipboard.writeText(url);
			copyState = 'copied';
			if (copyTimer) clearTimeout(copyTimer);
			copyTimer = setTimeout(() => {
				copyState = 'idle';
			}, 2500);
		} catch {
			copyState = 'error';
			if (copyTimer) clearTimeout(copyTimer);
			copyTimer = setTimeout(() => {
				copyState = 'idle';
			}, 2500);
		}
	}
</script>

{#if showSectionLink}
	<section id={anchorId} class="scroll-mt-20">
		<div class="flex items-start gap-2">
			<div class="mt-1 flex w-12 shrink-0 flex-col items-center gap-0.5">
				<button
					type="button"
					class="text-primary opacity-70 transition-opacity hover:opacity-100"
					onclick={copySectionLink}
					title={copyButtonLabel}
					aria-label={copyButtonLabel}
				>
					<IconLink class="h-5 w-5" />
				</button>
				{#if copyMessage}
					<span class="text-center text-[10px] font-medium leading-tight text-primary" aria-live="polite">
						{copyMessage}
					</span>
				{/if}
			</div>
			<h2 class={`min-w-0 flex-1 ${headingClass}`}>{safeText}</h2>
		</div>
	</section>
{:else if tag === 'h1'}
	<h1 id={anchorId || undefined} class="{headingClass} {anchorId ? 'scroll-mt-20' : ''}">{safeText}</h1>
{:else if tag === 'h2'}
	<h2 id={anchorId || undefined} class="{headingClass} {anchorId ? 'scroll-mt-20' : ''}">{safeText}</h2>
{:else if tag === 'h3'}
	<h3 id={anchorId || undefined} class="{headingClass} {anchorId ? 'scroll-mt-20' : ''}">{safeText}</h3>
{:else if tag === 'h4'}
	<h4 id={anchorId || undefined} class="{headingClass} {anchorId ? 'scroll-mt-20' : ''}">{safeText}</h4>
{:else if tag === 'h5'}
	<h5 id={anchorId || undefined} class="{headingClass} {anchorId ? 'scroll-mt-20' : ''}">{safeText}</h5>
{:else}
	<h6 id={anchorId || undefined} class="{headingClass} {anchorId ? 'scroll-mt-20' : ''}">{safeText}</h6>
{/if}
