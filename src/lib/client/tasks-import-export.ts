import { TASK_TEXT_MAX_LENGTH, type TaskItem } from '$lib/client/tasks-state';

export type TasksImportMode = 'merge' | 'replace';

export type TasksImportResult =
	| { ok: true; tasks: TaskItem[]; nextId: number; count: number }
	| { ok: false; error: string };

function parseDueAt(value: unknown): string | null {
	if (typeof value !== 'string' || !value.trim()) return null;
	const ms = Date.parse(value);
	return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function parseBoolean(value: unknown): boolean {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'number') return value !== 0;
	if (typeof value !== 'string') return false;
	const normalized = value.trim().toLowerCase();
	return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function normalizeImportedTask(raw: Record<string, unknown>, fallbackId: number): TaskItem {
	return {
		id: Number.isFinite(Number(raw.id)) ? Number(raw.id) : fallbackId,
		text: String(raw.text ?? '').trim().slice(0, TASK_TEXT_MAX_LENGTH),
		done: parseBoolean(raw.done),
		deleted: parseBoolean(raw.deleted),
		dueAt: parseDueAt(raw.dueAt)
	};
}

export function computeNextTaskId(tasks: TaskItem[]): number {
	if (tasks.length === 0) return 0;
	return Math.max(...tasks.map((task) => task.id + 1));
}

export function applyImportedTasks(
	currentTasks: TaskItem[],
	currentNextId: number,
	imported: TaskItem[],
	mode: TasksImportMode
): { tasks: TaskItem[]; nextId: number } {
	const normalized = imported
		.map((task, index) => normalizeImportedTask(task, index))
		.filter((task) => task.text.length > 0);

	if (mode === 'replace') {
		const tasks = normalized.map((task, index) => ({ ...task, id: index }));
		return { tasks, nextId: tasks.length };
	}

	let nextId = currentNextId;
	const merged = normalized.map((task) => {
		const withId = { ...task, id: nextId };
		nextId += 1;
		return withId;
	});
	return { tasks: [...currentTasks, ...merged], nextId };
}

function escapeCsvField(value: string): string {
	if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
	return value;
}

function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function exportStamp(): string {
	return new Date().toISOString();
}

function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}

function datedFilename(extension: string): string {
	const date = new Date().toISOString().slice(0, 10);
	return `gloopglop-tasks-${date}.${extension}`;
}

export function downloadTasksCsv(tasks: TaskItem[]): void {
	const header = 'id,text,done,deleted,dueAt';
	const rows = tasks.map((task) =>
		[
			String(task.id),
			escapeCsvField(task.text),
			task.done ? 'true' : 'false',
			task.deleted ? 'true' : 'false',
			escapeCsvField(task.dueAt ?? '')
		].join(',')
	);
	const csv = [header, ...rows].join('\n');
	downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), datedFilename('csv'));
}

export function downloadTasksXml(tasks: TaskItem[]): void {
	const lines = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		`<tasks exportedAt="${escapeXml(exportStamp())}" version="1">`
	];
	for (const task of tasks) {
		lines.push(`  <task id="${task.id}">`);
		lines.push(`    <text>${escapeXml(task.text)}</text>`);
		lines.push(`    <done>${task.done}</done>`);
		lines.push(`    <deleted>${task.deleted}</deleted>`);
		lines.push(`    <dueAt>${escapeXml(task.dueAt ?? '')}</dueAt>`);
		lines.push('  </task>');
	}
	lines.push('</tasks>');
	downloadBlob(
		new Blob([lines.join('\n')], { type: 'application/xml;charset=utf-8' }),
		datedFilename('xml')
	);
}

function taskSectionLabel(task: TaskItem): string {
	if (task.deleted) return 'Trash';
	if (task.done) return 'Completed';
	return 'Open';
}

export async function downloadTasksPdf(tasks: TaskItem[]): Promise<void> {
	const { jsPDF } = await import('jspdf');
	const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
	const margin = 48;
	const lineHeight = 16;
	const pageHeight = pdf.internal.pageSize.getHeight();
	const maxWidth = pdf.internal.pageSize.getWidth() - margin * 2;
	let y = margin;

	const ensureSpace = (needed = lineHeight) => {
		if (y + needed <= pageHeight - margin) return;
		pdf.addPage();
		y = margin;
	};

	pdf.setFont('helvetica', 'bold');
	pdf.setFontSize(18);
	pdf.text('GloopGlop Tasks', margin, y);
	y += 24;

	pdf.setFont('helvetica', 'normal');
	pdf.setFontSize(10);
	pdf.text(`Exported ${new Date().toLocaleString()}`, margin, y);
	y += 22;

	if (tasks.length === 0) {
		pdf.text('No tasks in this list.', margin, y);
		pdf.save(datedFilename('pdf'));
		return;
	}

	for (const task of tasks) {
		const status = task.done ? '[x]' : '[ ]';
		const due = task.dueAt ? ` · due ${new Date(task.dueAt).toLocaleString()}` : '';
		const prefix = `${taskSectionLabel(task)} · ${status} `;
		const lines = pdf.splitTextToSize(`${prefix}${task.text}${due}`, maxWidth);
		for (const line of lines) {
			ensureSpace();
			pdf.text(line, margin, y);
			y += lineHeight;
		}
		y += 4;
	}

	pdf.save(datedFilename('pdf'));
}

function parseCsvLine(line: string): string[] {
	const fields: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i += 1) {
		const char = line[i];
		if (inQuotes) {
			if (char === '"') {
				if (line[i + 1] === '"') {
					current += '"';
					i += 1;
				} else {
					inQuotes = false;
				}
			} else {
				current += char;
			}
			continue;
		}
		if (char === '"') {
			inQuotes = true;
			continue;
		}
		if (char === ',') {
			fields.push(current);
			current = '';
			continue;
		}
		current += char;
	}
	fields.push(current);
	return fields;
}

export function parseTasksCsv(content: string): TasksImportResult {
	const lines = content
		.replace(/^\uFEFF/, '')
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);

	if (lines.length === 0) return { ok: false, error: 'CSV file is empty.' };

	const header = parseCsvLine(lines[0]).map((cell) => cell.trim().toLowerCase());
	const textIndex = header.indexOf('text');
	if (textIndex === -1) {
		return { ok: false, error: 'CSV must include a "text" column.' };
	}

	const idIndex = header.indexOf('id');
	const doneIndex = header.indexOf('done');
	const deletedIndex = header.indexOf('deleted');
	const dueAtIndex = header.indexOf('dueat');

	const imported: TaskItem[] = [];
	for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
		const cells = parseCsvLine(lines[lineIndex]);
		const text = (cells[textIndex] ?? '').trim();
		if (!text) continue;
		imported.push(
			normalizeImportedTask(
				{
					id: idIndex >= 0 ? Number(cells[idIndex]) : lineIndex,
					text,
					done: doneIndex >= 0 ? cells[doneIndex] : undefined,
					deleted: deletedIndex >= 0 ? cells[deletedIndex] : undefined,
					dueAt: dueAtIndex >= 0 ? cells[dueAtIndex] || null : null
				} as Record<string, unknown>,
				lineIndex
			)
		);
	}

	if (imported.length === 0) return { ok: false, error: 'No tasks found in CSV.' };
	return { ok: true, tasks: imported, nextId: computeNextTaskId(imported), count: imported.length };
}

function readXmlText(parent: Element, tag: string): string {
	return parent.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';
}

export function parseTasksXml(content: string): TasksImportResult {
	let doc: Document;
	try {
		doc = new DOMParser().parseFromString(content, 'application/xml');
	} catch {
		return { ok: false, error: 'Could not read XML file.' };
	}

	if (doc.getElementsByTagName('parsererror').length > 0) {
		return { ok: false, error: 'XML file is not valid.' };
	}

	const taskNodes = Array.from(doc.getElementsByTagName('task'));
	if (taskNodes.length === 0) return { ok: false, error: 'No <task> entries found in XML.' };

	const imported: TaskItem[] = [];
	for (const [index, node] of taskNodes.entries()) {
		const text = readXmlText(node, 'text');
		if (!text) continue;
		const idAttr = node.getAttribute('id');
		imported.push(
			normalizeImportedTask(
				{
					id: idAttr ? Number(idAttr) : index,
					text,
					done: node.getAttribute('done') ?? readXmlText(node, 'done'),
					deleted: node.getAttribute('deleted') ?? readXmlText(node, 'deleted'),
					dueAt: readXmlText(node, 'dueAt') || null
				},
				index
			)
		);
	}

	if (imported.length === 0) return { ok: false, error: 'No tasks with text found in XML.' };
	return { ok: true, tasks: imported, nextId: computeNextTaskId(imported), count: imported.length };
}

export async function importTasksFromFile(
	file: File,
	currentTasks: TaskItem[],
	currentNextId: number,
	mode: TasksImportMode
): Promise<TasksImportResult> {
	const content = await file.text();
	const lowerName = file.name.toLowerCase();
	const parsed =
		lowerName.endsWith('.xml') || file.type.includes('xml')
			? parseTasksXml(content)
			: parseTasksCsv(content);

	if (!parsed.ok) return parsed;

	const applied = applyImportedTasks(currentTasks, currentNextId, parsed.tasks, mode);
	return {
		ok: true,
		tasks: applied.tasks,
		nextId: applied.nextId,
		count: parsed.count
	};
}

const TASK_IMPORT_FILE_TYPES: Array<{ description: string; accept: Record<string, string[]> }> = [
	{
		description: 'CSV task list',
		accept: { 'text/csv': ['.csv'] }
	},
	{
		description: 'XML task list',
		accept: { 'text/xml': ['.xml'], 'application/xml': ['.xml'] }
	}
];

type TasksImportFilePicker = (
	options: {
		startIn?: 'downloads';
		multiple?: boolean;
		types?: Array<{ description: string; accept: Record<string, string[]> }>;
	}
) => Promise<FileSystemFileHandle[]>;

/** Opens the import picker in Downloads when the browser supports it. */
export async function pickTasksImportFile(): Promise<File | null | 'unsupported'> {
	const showOpenFilePicker = (window as Window & { showOpenFilePicker?: TasksImportFilePicker })
		.showOpenFilePicker;
	if (!showOpenFilePicker) return 'unsupported';

	try {
		const [handle] = await showOpenFilePicker({
			startIn: 'downloads',
			multiple: false,
			types: TASK_IMPORT_FILE_TYPES
		});
		return await handle.getFile();
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') return null;
		throw error;
	}
}
