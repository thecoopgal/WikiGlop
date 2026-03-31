<script lang="ts">
	type Props = {
		level?: number | string;
		text?: string;
	};

	let { level, text } = $props() as Props;

	const safeLevel = $derived(typeof level === 'number' ? level : Number(level));
	const safeText = $derived(text ?? '');

	const tag = $derived(safeLevel >= 1 && safeLevel <= 6 ? `h${safeLevel}` : 'h2');
</script>

{#if tag === 'h1'}
	<h1 class="text-4xl font-bold">{safeText}</h1>
{:else if tag === 'h2'}
	<h2 class="text-3xl font-bold">{safeText}</h2>
{:else if tag === 'h3'}
	<h3 class="text-2xl font-bold">{safeText}</h3>
{:else if tag === 'h4'}
	<h4 class="text-xl font-bold">{safeText}</h4>
{:else if tag === 'h5'}
	<h5 class="text-lg font-bold">{safeText}</h5>
{:else}
	<h6 class="text-base font-bold">{safeText}</h6>
{/if}

