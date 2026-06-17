<script lang="ts">
	import IconDragVertical from '~icons/mdi/drag-vertical';

	let {
		index,
		total,
		enabled = true,
		itemLabel,
		dragging = false,
		onPointerDragStart
	}: {
		index: number;
		total: number;
		enabled?: boolean;
		itemLabel: string;
		dragging?: boolean;
		onPointerDragStart: (event: PointerEvent) => void;
	} = $props();

	const canDrag = $derived(enabled && total > 1);
</script>

<button
	type="button"
	class="btn btn-ghost btn-sm shrink-0 touch-none self-center px-2 select-none {canDrag
		? 'cursor-grab active:cursor-grabbing'
		: 'cursor-default opacity-60'} {dragging ? 'cursor-grabbing' : ''}"
	aria-label="Drag to reorder {itemLabel}"
	aria-disabled={!canDrag}
	tabindex={canDrag ? undefined : -1}
	onpointerdown={(event) => {
		if (!canDrag) return;
		event.preventDefault();
		onPointerDragStart(event);
	}}
>
	<IconDragVertical class="h-5 w-5 text-base-content/50" aria-hidden="true" />
</button>
