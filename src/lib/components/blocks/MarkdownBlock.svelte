<script lang="ts">
	import { marked } from 'marked';

	type Props = {
		content?: string;
	};

	let { content } = $props() as Props;

	function toHtml(v: string) {
		return marked.parse(v);
	}
</script>

{#if content}
	<div class="prose max-w-none">
		{@html toHtml(content)}
	</div>
{:else}
	<div class="prose max-w-none text-warning">Missing markdown content.</div>
{/if}

