<script lang="ts">
	import { marked } from 'marked';

	type Props = {
		content?: string;
	};

	let { content } = $props() as Props;

	const linkClass =
		'font-semibold text-primary underline decoration-primary/70 decoration-2 underline-offset-[3px] transition-colors hover:text-primary/80 hover:decoration-primary';

	const markedWithExternalLinks = marked.use({
		renderer: {
			link({ href, title, tokens }) {
				const text = this.parser.parseInline(tokens);
				const safeHref = href ?? '';
				const isExternal = /^https?:\/\//i.test(safeHref);
				const titleAttr = title ? ` title="${title}"` : '';
				const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
				const externalMark = isExternal
					? '<span class="ml-0.5 inline-block text-[0.9em] opacity-75" aria-hidden="true">↗</span>'
					: '';
				return `<a href="${safeHref}" class="${linkClass}"${titleAttr}${targetAttr}>${text}${externalMark}</a>`;
			}
		}
	});

	function toHtml(v: string) {
		return markedWithExternalLinks.parse(v);
	}
</script>

{#if !content?.trim()}
	<div class="wiki-markdown-spacer h-6" aria-hidden="true"></div>
{:else}
	<div class="wiki-markdown prose max-w-none">
		{@html toHtml(content)}
	</div>
{/if}

<style>
	.wiki-markdown :global(p) {
		margin: 0.75em 0;
	}

	.wiki-markdown :global(p:first-child) {
		margin-top: 0;
	}

	.wiki-markdown :global(p:last-child) {
		margin-bottom: 0;
	}

	.wiki-markdown :global(ul),
	.wiki-markdown :global(ol) {
		margin: 0.75em 0;
		padding-left: 1.5rem;
	}

	.wiki-markdown :global(ul) {
		list-style-type: disc;
	}

	.wiki-markdown :global(ol) {
		list-style-type: decimal;
	}

	.wiki-markdown :global(li) {
		display: list-item;
		margin: 0.35em 0;
		padding-left: 0.25rem;
	}

	.wiki-markdown :global(li > ul),
	.wiki-markdown :global(li > ol) {
		margin: 0.35em 0;
	}

	.wiki-markdown :global(ul ul) {
		list-style-type: circle;
	}

	.wiki-markdown :global(ul ul ul) {
		list-style-type: square;
	}

	.wiki-markdown :global(a) {
		font-weight: 600;
		color: var(--color-primary);
		text-decoration: underline;
		text-decoration-color: color-mix(in oklab, var(--color-primary) 70%, transparent);
		text-underline-offset: 3px;
		text-decoration-thickness: 2px;
	}

	.wiki-markdown :global(a:hover) {
		color: color-mix(in oklab, var(--color-primary) 85%, var(--color-base-content));
		text-decoration-color: var(--color-primary);
	}
</style>
