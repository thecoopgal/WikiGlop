<script lang="ts">
	import LoadingGloop from './LoadingGloop.svelte';

	const {
		message = 'One moment…',
		size = 'lg'
	}: {
		message?: string;
		size?: 'md' | 'lg';
	} = $props();
</script>

<div class="flex flex-col items-center justify-center gap-3 py-6" role="status" aria-live="polite">
	<LoadingGloop spinning {size} />
	{#if message}
		<p class="text-sm text-base-content/70">{message}</p>
	{/if}
</div>
