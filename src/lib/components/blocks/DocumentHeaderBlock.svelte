<script lang="ts">
	type Props = {
		title?: string;
		summary?: string;
	};

	let { title, summary } = $props() as Props;
</script>

<header class="my-10">
	{#if title}
		<h1 class="text-4xl font-bold">{title}</h1>
	{/if}
	{#if summary}
		<p class="mt-3 text-base-content/80">{summary}</p>
	{/if}
</header>

