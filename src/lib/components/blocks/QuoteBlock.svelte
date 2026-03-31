<script lang="ts">
	type Props = {
		text?: string;
		citation?: string;
	};

	let { text, citation } = $props() as Props;
</script>

{#if text}
	<figure class="my-10">
		<blockquote class="prose text-base-content/90">{text}</blockquote>
		{#if citation}
			<figcaption class="mt-3 opacity-70">{citation}</figcaption>
		{/if}
	</figure>
{:else}
	<p class="text-sm text-warning">Missing quote text.</p>
{/if}

