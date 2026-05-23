<script lang="ts">
	import LoadingGloop from './LoadingGloop.svelte';

	const {
		message = 'One moment…',
		size = 'lg',
		percent = null
	}: {
		message?: string;
		size?: 'md' | 'lg';
		/** 0–100; when set, shows a large percent readout and progress bar. */
		percent?: number | null;
	} = $props();

	const displayPercent = $derived(
		percent == null ? null : Math.min(100, Math.max(0, Math.round(percent)))
	);
</script>

<div class="flex flex-col items-center justify-center gap-3 py-6" role="status" aria-live="polite">
	<LoadingGloop spinning {size} />
	{#if displayPercent != null}
		<p class="text-3xl font-bold tabular-nums tracking-tight">{displayPercent}%</p>
		<progress class="progress progress-primary h-2 w-full max-w-xs" value={displayPercent} max="100"
		></progress>
	{/if}
	{#if message}
		<p class="text-sm text-base-content/70">{message}</p>
	{/if}
</div>
