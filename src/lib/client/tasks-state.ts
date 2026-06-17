import { browser } from '$app/environment';

const STORAGE_KEY = 'gloopglop:tasks:v2';
const LEGACY_STORAGE_KEY = 'gloopglop:tasks:v1';

export const TASK_TEXT_MAX_LENGTH = 500;

export type TaskSortBy = 'manual' | 'date-asc' | 'date-desc';

export type TaskItem = {
	id: number;
	text: string;
	done: boolean;
	deleted: boolean;
	/** ISO 8601 datetime, or null when no date is set for this task. */
	dueAt: string | null;
};

export type TaskListSection = 'open' | 'completed' | 'trash';

export type TaskViewPrefs = {
	sortBy: TaskSortBy;
	showDates: boolean;
};

type StoredTasks = {
	tasks: TaskItem[];
	nextId: number;
	sortBy: TaskSortBy;
	showDates: boolean;
};

const DEFAULT_PREFS: TaskViewPrefs = {
	sortBy: 'manual',
	showDates: true
};

function hasLocalStorage(): boolean {
	return browser && typeof localStorage !== 'undefined';
}

function isTaskSortBy(value: unknown): value is TaskSortBy {
	return value === 'manual' || value === 'date-asc' || value === 'date-desc';
}

function parseDueAt(value: unknown): string | null {
	if (typeof value !== 'string' || !value.trim()) return null;
	const ms = Date.parse(value);
	return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function reorderById<T extends { id: number }>(items: T[], fromId: number, toId: number): T[] {
	const fromIndex = items.findIndex((item) => item.id === fromId);
	const toIndex = items.findIndex((item) => item.id === toId);
	if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return items;
	const next = [...items];
	const [moved] = next.splice(fromIndex, 1);
	next.splice(toIndex, 0, moved);
	return next;
}

function parseTaskItem(item: unknown): TaskItem | null {
	if (!item || typeof item !== 'object') return null;
	const raw = item as Partial<TaskItem>;
	const id = Number(raw.id);
	const text = String(raw.text ?? '').slice(0, TASK_TEXT_MAX_LENGTH);
	const done = Boolean(raw.done);
	const deleted = Boolean(raw.deleted);
	if (!Number.isFinite(id)) return null;
	return { id, text, done, deleted, dueAt: parseDueAt(raw.dueAt) };
}

function parseStored(raw: string | null): StoredTasks | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Partial<StoredTasks> & {
			tasks?: unknown[];
		};
		if (!parsed || !Array.isArray(parsed.tasks)) return null;
		const tasks: TaskItem[] = [];
		for (const item of parsed.tasks) {
			const task = parseTaskItem(item);
			if (task) tasks.push(task);
		}
		const nextId =
			typeof parsed.nextId === 'number' && Number.isFinite(parsed.nextId)
				? Math.max(parsed.nextId, ...tasks.map((task) => task.id + 1), 0)
				: tasks.reduce((max, task) => Math.max(max, task.id + 1), 0);
		return {
			tasks,
			nextId,
			sortBy: isTaskSortBy(parsed.sortBy) ? parsed.sortBy : DEFAULT_PREFS.sortBy,
			showDates:
				typeof parsed.showDates === 'boolean' ? parsed.showDates : DEFAULT_PREFS.showDates
		};
	} catch {
		return null;
	}
}

function readStorage(): StoredTasks | null {
	if (!hasLocalStorage()) return null;
	return parseStored(localStorage.getItem(STORAGE_KEY)) ?? parseStored(localStorage.getItem(LEGACY_STORAGE_KEY));
}

export function defaultTasks(): StoredTasks {
	return { tasks: [], nextId: 0, ...DEFAULT_PREFS };
}

export function loadTasks(): StoredTasks {
	const stored = readStorage();
	if (!stored) return defaultTasks();
	if (hasLocalStorage() && !localStorage.getItem(STORAGE_KEY)) {
		saveTasksState(stored);
	}
	return stored;
}

export function saveTasksState(state: StoredTasks): void {
	if (!hasLocalStorage()) return;
	if (state.tasks.length === 0) {
		localStorage.removeItem(STORAGE_KEY);
		localStorage.removeItem(LEGACY_STORAGE_KEY);
		return;
	}
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function saveTasks(
	tasks: TaskItem[],
	nextId: number,
	prefs: TaskViewPrefs = DEFAULT_PREFS
): void {
	saveTasksState({ tasks, nextId, ...prefs });
}

export function reorderTasks(tasks: TaskItem[], fromId: number, toId: number): TaskItem[] {
	return reorderById(tasks, fromId, toId);
}

function taskInSection(task: TaskItem, section: TaskListSection): boolean {
	if (section === 'open') return !task.deleted && !task.done;
	if (section === 'completed') return !task.deleted && task.done;
	return task.deleted;
}

export function mergeReorderedSection(
	allTasks: TaskItem[],
	sectionTasks: TaskItem[],
	fromId: number,
	toId: number,
	section: TaskListSection
): TaskItem[] {
	const open = allTasks.filter((task) => taskInSection(task, 'open'));
	const completed = allTasks.filter((task) => taskInSection(task, 'completed'));
	const trash = allTasks.filter((task) => taskInSection(task, 'trash'));
	const reordered = reorderTasks(sectionTasks, fromId, toId);
	if (section === 'open') return [...reordered, ...completed, ...trash];
	if (section === 'completed') return [...open, ...reordered, ...trash];
	return [...open, ...completed, ...reordered];
}

export function sortTasks(tasks: TaskItem[], sortBy: TaskSortBy): TaskItem[] {
	if (sortBy === 'manual') return tasks;
	const direction = sortBy === 'date-asc' ? 1 : -1;
	return [...tasks].sort((a, b) => {
		const aMs = a.dueAt ? Date.parse(a.dueAt) : null;
		const bMs = b.dueAt ? Date.parse(b.dueAt) : null;
		if (aMs == null && bMs == null) return 0;
		if (aMs == null) return 1;
		if (bMs == null) return -1;
		if (aMs === bMs) return 0;
		return aMs < bMs ? -direction : direction;
	});
}

export function createTask(
	text: string,
	nextId: number,
	dueAt: string | null = null
): { task: TaskItem; nextId: number } {
	const trimmed = text.trim().slice(0, TASK_TEXT_MAX_LENGTH);
	return {
		task: { id: nextId, text: trimmed, done: false, deleted: false, dueAt: parseDueAt(dueAt) },
		nextId: nextId + 1
	};
}

export function isoToDatetimeLocal(iso: string | null): string {
	if (!iso) return '';
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function datetimeLocalToIso(value: string): string | null {
	if (!value.trim()) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function formatTaskDueAt(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});
}
