<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import {
		createTask,
		datetimeLocalToIso,
		formatTaskDueAt,
		isoToDatetimeLocal,
		loadTasks,
		mergeReorderedSection,
		saveTasks,
		TASK_TEXT_MAX_LENGTH,
		type TaskItem
	} from '$lib/client/tasks-state';
	import GlopSearchFooter from '$lib/components/GlopSearchFooter.svelte';
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';
	import LinksCreateReorderList from '$lib/components/LinksCreateReorderList.svelte';
	import TasksDownloadModal from '$lib/components/TasksDownloadModal.svelte';
	import TasksImportModal from '$lib/components/TasksImportModal.svelte';
	import IconCalendarPlus from '~icons/mdi/calendar-plus';
	import IconCalendarRemove from '~icons/mdi/calendar-remove';
	import IconCheckboxBlankOutline from '~icons/mdi/checkbox-blank-outline';
	import IconCheckboxMarked from '~icons/mdi/checkbox-marked';
	import IconChevronDown from '~icons/mdi/chevron-down';
	import IconCloseBox from '~icons/mdi/close-box';
	import IconContentCopy from '~icons/mdi/content-copy';
	import IconDeleteEmpty from '~icons/mdi/delete-empty';
	import IconFormatListChecks from '~icons/mdi/format-list-checks';
	import IconPlus from '~icons/mdi/plus';
	import IconRecycle from '~icons/mdi/recycle';
	import IconTrashCanOutline from '~icons/mdi/trash-can-outline';

	let tasks = $state<TaskItem[]>([]);
	let nextTaskId = $state(0);
	let showDates = $state(true);
	let newTaskText = $state('');
	let expandedTaskId = $state<number | null>(null);
	let downloadModalOpen = $state(false);
	let importModalOpen = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);
	let useFinePointer = $state(true);

	const activeTasks = $derived(tasks.filter((task) => !task.deleted));
	const openTasks = $derived(tasks.filter((task) => !task.deleted && !task.done));
	const completedTasks = $derived(tasks.filter((task) => !task.deleted && task.done));
	const trashedTasks = $derived(tasks.filter((task) => task.deleted));
	const pendingCount = $derived(openTasks.length);
	const doneCount = $derived(completedTasks.length);
	const trashCount = $derived(trashedTasks.length);
	const canAddTask = $derived(newTaskText.trim().length > 0);
	const reorderHint = $derived(useFinePointer ? 'Drag to reorder.' : 'Long-press to reorder.');

	onMount(() => {
		const query = window.matchMedia('(hover: hover) and (pointer: fine)');
		const sync = () => {
			useFinePointer = query.matches;
		};
		sync();
		query.addEventListener('change', sync);
		return () => query.removeEventListener('change', sync);
	});

	$effect(() => {
		if (!browser) return;
		const stored = loadTasks();
		tasks = stored.tasks;
		nextTaskId = stored.nextId;
		showDates = stored.showDates;
	});

	$effect(() => {
		if (expandedTaskId != null && !tasks.some((task) => task.id === expandedTaskId)) {
			expandedTaskId = null;
		}
	});

	function persist() {
		saveTasks(tasks, nextTaskId, { sortBy: 'manual', showDates });
	}

	function addTask() {
		const trimmed = newTaskText.trim();
		if (!trimmed) return;
		const created = createTask(trimmed, nextTaskId);
		tasks = [...tasks, created.task];
		nextTaskId = created.nextId;
		newTaskText = '';
		expandedTaskId = created.task.id;
		persist();
		inputEl?.focus();
	}

	function updateTaskText(taskId: number, event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		tasks = tasks.map((task) =>
			task.id === taskId ? { ...task, text: value.slice(0, TASK_TEXT_MAX_LENGTH) } : task
		);
		persist();
	}

	function updateTaskDueAt(taskId: number, event: Event) {
		const dueAt = datetimeLocalToIso((event.currentTarget as HTMLInputElement).value);
		tasks = tasks.map((task) => (task.id === taskId ? { ...task, dueAt } : task));
		persist();
	}

	function clearTaskDueAt(taskId: number) {
		tasks = tasks.map((task) => (task.id === taskId ? { ...task, dueAt: null } : task));
		persist();
	}

	function addTaskDueAt(taskId: number) {
		const now = new Date();
		now.setSeconds(0, 0);
		tasks = tasks.map((task) =>
			task.id === taskId ? { ...task, dueAt: now.toISOString() } : task
		);
		persist();
	}

	function toggleTask(taskId: number, event?: MouseEvent) {
		event?.stopPropagation();
		tasks = tasks.map((task) =>
			task.id === taskId && !task.deleted ? { ...task, done: !task.done } : task
		);
		persist();
	}

	function trashTask(taskId: number, event?: MouseEvent) {
		event?.stopPropagation();
		tasks = tasks.map((task) => (task.id === taskId ? { ...task, deleted: true } : task));
		if (expandedTaskId === taskId) expandedTaskId = null;
		persist();
	}

	function duplicateTask(taskId: number) {
		const sourceIndex = tasks.findIndex((task) => task.id === taskId);
		if (sourceIndex === -1) return;
		const source = tasks[sourceIndex];
		const duplicate: TaskItem = {
			id: nextTaskId,
			text: source.text,
			done: source.done,
			deleted: source.deleted,
			dueAt: source.dueAt
		};
		const next = [...tasks];
		next.splice(sourceIndex + 1, 0, duplicate);
		tasks = next;
		nextTaskId += 1;
		expandedTaskId = duplicate.id;
		persist();
	}

	function restoreTask(taskId: number, event?: MouseEvent) {
		event?.stopPropagation();
		tasks = tasks.map((task) => (task.id === taskId ? { ...task, deleted: false } : task));
		persist();
	}

	function emptyTrash() {
		const trashedIds = new Set(trashedTasks.map((task) => task.id));
		tasks = tasks.filter((task) => !task.deleted);
		if (expandedTaskId != null && trashedIds.has(expandedTaskId)) expandedTaskId = null;
		persist();
	}

	function clearCompleted() {
		const completedIds = new Set(completedTasks.map((task) => task.id));
		tasks = tasks.map((task) =>
			completedIds.has(task.id) ? { ...task, deleted: true } : task
		);
		if (expandedTaskId != null && completedIds.has(expandedTaskId)) expandedTaskId = null;
		persist();
	}

	function reorderOpen(fromId: number, toId: number) {
		tasks = mergeReorderedSection(tasks, openTasks, fromId, toId, 'open');
		persist();
	}

	function reorderCompleted(fromId: number, toId: number) {
		tasks = mergeReorderedSection(tasks, completedTasks, fromId, toId, 'completed');
		persist();
	}

	function reorderTrash(fromId: number, toId: number) {
		tasks = mergeReorderedSection(tasks, trashedTasks, fromId, toId, 'trash');
		persist();
	}

	function toggleExpanded(taskId: number) {
		expandedTaskId = expandedTaskId === taskId ? null : taskId;
	}

	function onNewTaskKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			addTask();
		}
	}

	function onDocumentKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && expandedTaskId != null) {
			expandedTaskId = null;
		}
	}

	function setShowDates(value: boolean) {
		showDates = value;
		persist();
	}

	function handleImportedTasks(result: { tasks: TaskItem[]; nextId: number; count: number }) {
		tasks = result.tasks;
		nextTaskId = result.nextId;
		expandedTaskId = null;
		persist();
	}
</script>

<svelte:window onkeydown={onDocumentKeydown} />

{#snippet taskCard(task: TaskItem, index: number, completed: boolean, trashed: boolean)}
	{@const expanded = expandedTaskId === task.id}
	<div
		class="overflow-visible rounded-2xl border bg-base-100 shadow-sm transition-colors {expanded
			? 'border-primary ring-2 ring-primary/20'
			: 'border-base-content/10'} {trashed ? 'opacity-80' : ''}"
	>
		<div class="flex items-center gap-2 p-3">
			<button
				type="button"
				class="group btn btn-ghost btn-sm btn-square shrink-0 px-1 {trashed
					? 'tooltip text-error hover:text-primary'
					: task.done
						? 'text-primary'
						: 'text-base-content/50'}"
				data-tip={trashed ? 'Restore' : undefined}
				aria-label={trashed
					? `Restore task ${index + 1} from trash`
					: task.done
						? `Mark task ${index + 1} incomplete`
						: `Mark task ${index + 1} complete`}
				aria-pressed={!trashed && task.done}
				onclick={(event) => (trashed ? restoreTask(task.id, event) : toggleTask(task.id, event))}
			>
				{#if trashed}
					<IconCloseBox class="h-5 w-5 group-hover:hidden" aria-hidden="true" />
					<IconRecycle class="hidden h-5 w-5 group-hover:block" aria-hidden="true" />
				{:else if task.done}
					<IconCheckboxMarked class="h-5 w-5" aria-hidden="true" />
				{:else}
					<IconCheckboxBlankOutline class="h-5 w-5" aria-hidden="true" />
				{/if}
			</button>

			<button
				type="button"
				class="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-base-200/80"
				aria-expanded={expanded}
				onclick={() => toggleExpanded(task.id)}
			>
				<span class="flex items-start gap-1.5">
					<span
						class="min-w-0 flex-1 text-sm {completed || trashed
							? 'text-base-content/50 line-through'
							: 'text-base-content'}"
					>
						{task.text || 'Untitled task'}
					</span>
					<IconChevronDown
						class="mt-0.5 h-4 w-4 shrink-0 text-base-content/40 transition-transform {expanded
							? 'rotate-180'
							: ''}"
						aria-hidden="true"
					/>
				</span>
				{#if showDates && task.dueAt && !expanded}
					<span class="mt-0.5 block text-xs text-base-content/50">
						{formatTaskDueAt(task.dueAt)}
					</span>
				{/if}
			</button>
		</div>

		{#if expanded}
			<div class="border-t border-base-content/10 px-3 pb-3 pt-3 pl-14">
				<label class="form-control mb-3 w-full">
					<span class="sr-only">Task title</span>
					<input
						type="text"
						value={task.text}
						placeholder="Task description"
						class="input input-bordered w-full bg-base-100"
						autocomplete="off"
						maxlength={TASK_TEXT_MAX_LENGTH}
						oninput={(event) => updateTaskText(task.id, event)}
					/>
				</label>

				{#if showDates}
					{#if task.dueAt}
						<div class="flex w-full items-center gap-2">
							<label class="input input-bordered flex min-w-0 flex-1 items-center bg-base-100">
								<span class="sr-only">Due date and time</span>
								<input
									type="datetime-local"
									value={isoToDatetimeLocal(task.dueAt)}
									class="min-w-0 grow text-sm"
									oninput={(event) => updateTaskDueAt(task.id, event)}
								/>
							</label>
							<button
								type="button"
								class="btn btn-ghost btn-sm btn-square shrink-0 text-base-content/50 hover:text-base-content"
								aria-label="Remove date"
								onclick={() => clearTaskDueAt(task.id)}
							>
								<IconCalendarRemove class="h-5 w-5" aria-hidden="true" />
							</button>
						</div>
					{:else}
						<button
							type="button"
							class="btn btn-ghost btn-xs gap-1 text-base-content/60"
							onclick={() => addTaskDueAt(task.id)}
						>
							<IconCalendarPlus class="h-4 w-4" aria-hidden="true" />
							Add date
						</button>
					{/if}
				{:else}
					<p class="text-xs text-base-content/45">
						Dates are hidden. Turn on “Show dates” to set one for this task.
					</p>
				{/if}

				<div class="mt-3 flex flex-wrap gap-2">
					{#if trashed}
						<button type="button" class="btn btn-ghost btn-xs" onclick={() => restoreTask(task.id)}>
							Restore
						</button>
						<button
							type="button"
							class="btn btn-ghost btn-xs gap-1"
							onclick={() => duplicateTask(task.id)}
						>
							<IconContentCopy class="h-4 w-4" aria-hidden="true" />
							Duplicate task
						</button>
					{:else}
						<button
							type="button"
							class="btn btn-ghost btn-xs gap-1"
							onclick={() => duplicateTask(task.id)}
						>
							<IconContentCopy class="h-4 w-4" aria-hidden="true" />
							Duplicate task
						</button>
						<button
							type="button"
							class="btn btn-ghost btn-xs gap-1 text-error"
							onclick={() => trashTask(task.id)}
						>
							<IconTrashCanOutline class="h-4 w-4" aria-hidden="true" />
							Move to trash
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/snippet}

<div class="flex min-h-screen flex-col bg-base-200">
	<main class="flex-1 overflow-y-auto">
		<div class="mx-auto w-full max-w-xl px-4 py-4 sm:px-5 sm:py-6">
			<div class="mb-4 flex items-center justify-between gap-3">
				<div class="flex items-center gap-2">
					<IconFormatListChecks class="h-5 w-5 text-base-content/70" aria-hidden="true" />
					<h1 class="text-lg font-bold">Tasks</h1>
				</div>
				{#if activeTasks.length > 0 || trashCount > 0}
					<p class="text-sm text-base-content/60">
						{pendingCount} open{#if doneCount > 0}
							· {doneCount} done{/if}{#if trashCount > 0}
							· {trashCount} trashed{/if}
					</p>
				{/if}
			</div>

			<div class="mb-5">
				<form
					class="flex items-stretch gap-2"
					onsubmit={(event) => {
						event.preventDefault();
						addTask();
					}}
				>
					<label class="input input-bordered flex min-w-0 flex-1 items-center gap-2 bg-base-100">
						<span class="sr-only">New task</span>
						<input
							bind:this={inputEl}
							type="text"
							bind:value={newTaskText}
							placeholder="Add a task…"
							class="min-w-0 grow"
							autocomplete="off"
							maxlength={TASK_TEXT_MAX_LENGTH}
							onkeydown={onNewTaskKeydown}
						/>
					</label>
					<button
						type="submit"
						class="btn btn-primary shrink-0"
						disabled={!canAddTask}
						aria-label="Add task"
					>
						<IconPlus class="h-5 w-5" aria-hidden="true" />
					</button>
				</form>
				<p class="mt-2 text-center text-xs text-base-content/50">
					<button
						type="button"
						class="link link-hover text-xs text-base-content/55"
						onclick={() => (importModalOpen = true)}
					>
						Import tasks
					</button>
				</p>
			</div>

			{#if activeTasks.length === 0 && trashCount === 0}
				<div
					class="rounded-2xl border border-dashed border-base-content/15 bg-base-100 px-4 py-10 text-center text-sm text-base-content/60"
				>
					No tasks yet. Add one above. They stay in this browser only.
				</div>
			{:else}
				{#if activeTasks.length > 0}
					<section class="mb-6" aria-labelledby="tasks-open-heading">
						<div class="mb-3 flex items-center justify-between gap-3">
							<h2 id="tasks-open-heading" class="text-sm font-semibold text-base-content/70">
								Open
							</h2>
							<label class="flex cursor-pointer items-center gap-2 text-sm">
								<input
									type="checkbox"
									class="toggle toggle-sm toggle-primary"
									checked={showDates}
									onchange={(event) =>
										setShowDates((event.currentTarget as HTMLInputElement).checked)}
								/>
								<span class="text-base-content/70">Show dates</span>
							</label>
						</div>
						{#if openTasks.length > 0}
							<LinksCreateReorderList
								items={openTasks}
								itemLabel="task"
								listLabel="Open tasks"
								gapClass="gap-3"
								itemClass="overflow-visible"
								onReorder={reorderOpen}
							>
								{#snippet item({ field: task, index })}
									{@render taskCard(task, index, false, false)}
								{/snippet}
							</LinksCreateReorderList>
						{/if}
					</section>
				{/if}

				{#if completedTasks.length > 0}
					<section class="mb-6" aria-labelledby="tasks-completed-heading">
						<div class="mb-3 flex items-center justify-between gap-3">
							<h2 id="tasks-completed-heading" class="text-sm font-semibold text-base-content/70">
								Completed
							</h2>
							<button type="button" class="btn btn-ghost btn-xs" onclick={clearCompleted}>
								Move all to trash
							</button>
						</div>
						<LinksCreateReorderList
							items={completedTasks}
							itemLabel="completed task"
							listLabel="Completed tasks"
							gapClass="gap-3"
							itemClass="overflow-visible"
							onReorder={reorderCompleted}
						>
							{#snippet item({ field: task, index })}
								{@render taskCard(task, index, true, false)}
							{/snippet}
						</LinksCreateReorderList>
					</section>
				{/if}

				{#if trashedTasks.length > 0}
					<section aria-labelledby="tasks-trash-heading">
						<div class="mb-3 flex items-center justify-between gap-3">
							<h2 id="tasks-trash-heading" class="text-sm font-semibold text-base-content/70">
								Trash
							</h2>
							<button
								type="button"
								class="btn btn-ghost btn-xs gap-1"
								aria-label="Empty trash"
								onclick={emptyTrash}
							>
								<IconDeleteEmpty class="h-4 w-4" aria-hidden="true" />
								Empty trash
							</button>
						</div>
						<LinksCreateReorderList
							items={trashedTasks}
							itemLabel="trashed task"
							listLabel="Trashed tasks"
							gapClass="gap-3"
							itemClass="overflow-visible"
							onReorder={reorderTrash}
						>
							{#snippet item({ field: task, index })}
								{@render taskCard(task, index, false, true)}
							{/snippet}
						</LinksCreateReorderList>
					</section>
				{/if}

				{#if openTasks.length === 0 && completedTasks.length === 0 && trashCount === 0}
					<p class="mt-4 text-center text-sm text-base-content/50">All caught up.</p>
				{/if}
			{/if}

			<p class="mt-6 text-center text-xs text-base-content/45">
				Saved in this browser only. {reorderHint}
				<br />
				<button
					type="button"
					class="link link-hover text-xs text-base-content/55"
					onclick={() => (downloadModalOpen = true)}
				>
					Download a backup of your tasks
				</button>
			</p>
		</div>
	</main>
	<TasksDownloadModal bind:open={downloadModalOpen} {tasks} />
	<TasksImportModal bind:open={importModalOpen} {tasks} onImport={handleImportedTasks} />
	<GlopSearchFooter />
	<Icons8BoogerAttribution />
</div>
