<script lang="ts">
	import IconDragVertical from '~icons/mdi/drag-vertical';

	let {
		index,
		total,
		enabled = true,
		itemLabel,
		dragging = false,
		onDragStart,
		onDragEnd
	}: {
		index: number;
		total: number;
		enabled?: boolean;
		itemLabel: string;
		dragging?: boolean;
		onDragStart: (event: DragEvent) => void;
		onDragEnd: () => void;
	} = $props();

	const showReorder = $derived(total > 1);
</script>

{#if showReorder}
	<button
		type="button"
		class="btn btn-ghost btn-sm shrink-0 cursor-grab self-center px-2 active:cursor-grabbing {dragging
			? 'opacity-50'
			: ''}"
		aria-label="Drag to reorder {itemLabel}"
		draggable={enabled}
		tabindex={enabled ? undefined : -1}
		ondragstart={onDragStart}
		ondragend={onDragEnd}
	>
		<IconDragVertical class="h-5 w-5 text-base-content/50" aria-hidden="true" />
	</button>
{/if}
