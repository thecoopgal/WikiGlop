<script lang="ts">
	type Props = {
		variant?: string;
		title?: string;
		content?: string;
	};

	let { variant, title, content } = $props() as Props;

	const alertClass = $derived(variant ? `alert-${variant}` : 'alert-info');
</script>

{#if title || content}
	<div class={`alert ${alertClass} my-6`}>
		{#if title}
			<div>
				<h3 class="font-bold">{title}</h3>
				{#if content}
					<p class="mt-1 opacity-90">{content}</p>
				{/if}
			</div>
		{:else if content}
			<p class="opacity-90">{content}</p>
		{/if}
	</div>
{:else}
	<p class="text-sm text-warning">Missing callout content.</p>
{/if}

