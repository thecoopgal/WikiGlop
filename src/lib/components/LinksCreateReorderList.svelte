<script lang="ts" generics="T extends { id: number }">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import LinksCreateReorderControls from '$lib/components/LinksCreateReorderControls.svelte';
	import {
		resolveReorderDrop,
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
	let dropLineBeforeId = $state<number | null>(null);
	let dropLineAfterId = $state<number | null>(null);
	let touchDragId = $state<number | null>(null);
	let pointerDragId = $state<number | null>(null);
	let longPressTimer = $state<ReturnType<typeof setTimeout> | null>(null);
	let longPressStart = $state<{ x: number; y: number } | null>(null);
	const itemEls = new Map<number, HTMLDivElement>();

	const canReorder = $derived(items.length > 1);
	const mobileEditMode = $derived(editMode && !useFinePointer && canReorder);
	const isDragging = $derived(draggedFieldId != null);

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

	function clearDragState() {
		touchDragId = null;
		pointerDragId = null;
		draggedFieldId = null;
		dropLineBeforeId = null;
		dropLineAfterId = null;
	}

	function exitEditMode() {
		editMode = false;
		clearDragState();
		clearLongPress();
	}

	function reorderTowardTarget(activeDragId: number, clientX: number, clientY: number) {
		const orderedIds = items.map((item) => item.id);
		const drop = resolveReorderDrop(itemEls, orderedIds, clientX, clientY, activeDragId);
		if (!drop) {
			dropLineBeforeId = null;
			dropLineAfterId = null;
			return;
		}

		dropLineBeforeId = drop.lineBeforeId;
		dropLineAfterId = drop.lineAfterId;

		if (drop.reorderId == null) return;

		const fromIndex = orderedIds.indexOf(activeDragId);
		const toIndex = orderedIds.indexOf(drop.reorderId);
		if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

		onReorder(activeDragId, drop.reorderId);
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
			dropLineBeforeId = null;
			dropLineAfterId = null;
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
		reorderTowardTarget(touchDragId, touch.clientX, touch.clientY);
	}

	function onItemTouchEnd() {
		clearLongPress();
		clearDragState();
	}

	function onHandlePointerDown(fieldId: number, event: PointerEvent) {
		if (!enabled || !useFinePointer || !canReorder || event.button !== 0) return;
		event.preventDefault();
		pointerDragId = fieldId;
		draggedFieldId = fieldId;
		dropLineBeforeId = null;
		dropLineAfterId = null;
	}

	$effect(() => {
		if (pointerDragId == null) return;

		const onPointerMove = (event: PointerEvent) => {
			if (pointerDragId == null) return;
			event.preventDefault();
			reorderTowardTarget(pointerDragId, event.clientX, event.clientY);
		};

		const onPointerEnd = () => {
			clearDragState();
		};

		document.addEventListener('pointermove', onPointerMove);
		document.addEventListener('pointerup', onPointerEnd);
		document.addEventListener('pointercancel', onPointerEnd);
		return () => {
			document.removeEventListener('pointermove', onPointerMove);
			document.removeEventListener('pointerup', onPointerEnd);
			document.removeEventListener('pointercancel', onPointerEnd);
		};
	});

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
		: ''} {isDragging ? 'links-reorder-active' : ''}"
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
				? 'links-reorder-dragging z-20'
				: ''}"
			ontouchstart={(event) => onItemTouchStart(field.id, event)}
			ontouchend={onItemTouchEnd}
			ontouchcancel={onItemTouchEnd}
		>
			{#if dropLineBeforeId === field.id && draggedFieldId !== field.id}
				<div
					class="pointer-events-none absolute inset-x-0 top-0 z-10 -translate-y-2"
					aria-hidden="true"
				>
					<div class="h-1 rounded-full bg-primary shadow-[0_0_0_3px] shadow-primary/20"></div>
				</div>
			{/if}
			{#if dropLineAfterId === field.id}
				<div
					class="pointer-events-none absolute inset-x-0 bottom-0 z-10 translate-y-2"
					aria-hidden="true"
				>
					<div class="h-1 rounded-full bg-primary shadow-[0_0_0_3px] shadow-primary/20"></div>
				</div>
			{/if}

			{#if useFinePointer}
				<LinksCreateReorderControls
					{index}
					total={items.length}
					{enabled}
					{itemLabel}
					dragging={draggedFieldId === field.id}
					onPointerDragStart={(event) => onHandlePointerDown(field.id, event)}
				/>
			{/if}

			<div class="min-w-0 flex-1 links-reorder-item-contents">
				{@render item({ field, index })}
			</div>
		</div>
	{/each}
</div>
