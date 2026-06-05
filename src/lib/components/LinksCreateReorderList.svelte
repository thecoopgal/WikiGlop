<script lang="ts" generics="T extends { id: number }">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import LinksCreateReorderControls from '$lib/components/LinksCreateReorderControls.svelte';
	import {
		fieldIdAtPoint,
		LINKS_CREATE_REORDER_LONG_PRESS_MS
	} from '$lib/links-create-reorder';

	let {
		items,
		enabled = true,
		itemLabel,
		listLabel,
		listClass = '',
		itemClass = '',
		gapClass = 'gap-1',
		onReorder,
		item
	}: {
		items: T[];
		enabled?: boolean;
		itemLabel: string;
		listLabel: string;
		listClass?: string;
		itemClass?: string;
		gapClass?: string;
		onReorder: (fromId: number, toId: number) => void;
		item: Snippet<[{ field: T; index: number }]>;
	} = $props();

	let listEl = $state<HTMLDivElement | null>(null);
	let editMode = $state(false);
	let useFinePointer = $state(true);
	let draggedFieldId = $state<number | null>(null);
	let dropTargetFieldId = $state<number | null>(null);
	let touchDragId = $state<number | null>(null);
	let longPressTimer = $state<ReturnType<typeof setTimeout> | null>(null);
	let longPressStart = $state<{ x: number; y: number } | null>(null);
	const itemEls = new Map<number, HTMLDivElement>();

	const canReorder = $derived(items.length > 1);
	const mobileEditMode = $derived(editMode && !useFinePointer && canReorder);

	onMount(() => {
		const query = window.matchMedia('(hover: hover) and (pointer: fine)');
		const sync = () => {
			useFinePointer = query.matches;
			if (useFinePointer) exitEditMode();
		};
		sync();
		query.addEventListener('change', sync);
		return () => query.removeEventListener('change', sync);
	});

	function bindItemEl(node: HTMLDivElement, id: number) {
		itemEls.set(id, node);
		return {
			destroy() {
				itemEls.delete(id);
			}
		};
	}

	function clearLongPress() {
		if (longPressTimer) clearTimeout(longPressTimer);
		longPressTimer = null;
		longPressStart = null;
	}

	function exitEditMode() {
		editMode = false;
		touchDragId = null;
		draggedFieldId = null;
		dropTargetFieldId = null;
		clearLongPress();
	}

	function startLongPress(fieldId: number, x: number, y: number) {
		if (!enabled || !canReorder || useFinePointer || editMode) return;
		clearLongPress();
		longPressStart = { x, y };
		longPressTimer = setTimeout(() => {
			editMode = true;
			touchDragId = fieldId;
			draggedFieldId = fieldId;
			navigator.vibrate?.(12);
			clearLongPress();
		}, LINKS_CREATE_REORDER_LONG_PRESS_MS);
	}

	function onItemTouchStart(fieldId: number, event: TouchEvent) {
		if (!enabled || !canReorder || useFinePointer) return;
		const touch = event.touches[0];
		if (!touch) return;

		if (editMode) {
			touchDragId = fieldId;
			draggedFieldId = fieldId;
			dropTargetFieldId = null;
			return;
		}

		startLongPress(fieldId, touch.clientX, touch.clientY);
	}

	function onItemTouchMove(event: TouchEvent) {
		const touch = event.touches[0];
		if (!touch) return;

		if (longPressStart && longPressTimer) {
			const dx = touch.clientX - longPressStart.x;
			const dy = touch.clientY - longPressStart.y;
			if (Math.hypot(dx, dy) > 8) clearLongPress();
		}

		if (!editMode || touchDragId == null) return;

		event.preventDefault();
		const targetId = fieldIdAtPoint(itemEls, touch.clientX, touch.clientY);
		if (targetId != null && targetId !== touchDragId) {
			onReorder(touchDragId, targetId);
			dropTargetFieldId = targetId;
		}
	}

	function onItemTouchEnd() {
		clearLongPress();
		touchDragId = null;
		draggedFieldId = null;
		dropTargetFieldId = null;
	}

	function onDragStart(fieldId: number, event: DragEvent) {
		if (!enabled || !useFinePointer) return;
		draggedFieldId = fieldId;
		dropTargetFieldId = null;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', String(fieldId));
		}
	}

	function onDragOver(fieldId: number, event: DragEvent) {
		if (!enabled || !useFinePointer) return;
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
		dropTargetFieldId = fieldId;
	}

	function onDrop(fieldId: number, event: DragEvent) {
		if (!enabled || !useFinePointer) return;
		event.preventDefault();
		if (draggedFieldId == null) return;
		onReorder(draggedFieldId, fieldId);
		draggedFieldId = null;
		dropTargetFieldId = null;
	}

	function onDragEnd() {
		draggedFieldId = null;
		dropTargetFieldId = null;
	}

	$effect(() => {
		if (!editMode) return;
		const onPointerDown = (event: PointerEvent) => {
			if (listEl?.contains(event.target as Node)) return;
			exitEditMode();
		};
		document.addEventListener('pointerdown', onPointerDown, true);
		return () => document.removeEventListener('pointerdown', onPointerDown, true);
	});

	$effect(() => {
		if (!enabled) exitEditMode();
	});

	function listTouchMove(node: HTMLDivElement) {
		const handler = (event: TouchEvent) => {
			onItemTouchMove(event);
		};
		node.addEventListener('touchmove', handler, { passive: false });
		return {
			destroy() {
				node.removeEventListener('touchmove', handler);
			}
		};
	}
</script>

<div
	bind:this={listEl}
	use:listTouchMove
	class="links-reorder-list flex flex-col {gapClass} {listClass} {mobileEditMode
		? 'links-reorder-edit-mode'
		: ''}"
	role="list"
	aria-label={listLabel}
>
	{#if mobileEditMode}
		<p class="sr-only" aria-live="polite">
			Reorder mode on. Drag items to reorder. Tap outside to finish.
		</p>
	{/if}

	{#each items as field, index (field.id)}
		<div
			use:bindItemEl={field.id}
			role="listitem"
			class="relative flex items-stretch {gapClass} {itemClass} {draggedFieldId === field.id
				? 'links-reorder-dragging z-10 opacity-60'
				: ''}"
			ontouchstart={(event) => onItemTouchStart(field.id, event)}
			ontouchend={onItemTouchEnd}
			ontouchcancel={onItemTouchEnd}
			ondragover={(event) => onDragOver(field.id, event)}
			ondrop={(event) => onDrop(field.id, event)}
		>
			{#if dropTargetFieldId === field.id && draggedFieldId !== field.id}
				<div
					class="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 rounded-full bg-primary"
					aria-hidden="true"
				></div>
			{/if}

			{#if canReorder && useFinePointer}
				<LinksCreateReorderControls
					{index}
					total={items.length}
					{enabled}
					{itemLabel}
					dragging={draggedFieldId === field.id}
					onDragStart={(event) => onDragStart(field.id, event)}
					onDragEnd={onDragEnd}
				/>
			{/if}

			<div class="min-w-0 flex-1 links-reorder-item-contents">
				{@render item({ field, index })}
			</div>
		</div>
	{/each}
</div>
