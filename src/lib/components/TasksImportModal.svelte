<script lang="ts">
	import {
		computeNextTaskId,
		importTasksFromFile,
		pickTasksImportFile,
		type TasksImportMode
	} from '$lib/client/tasks-import-export';
	import type { TaskItem } from '$lib/client/tasks-state';
	import IconClose from '~icons/mdi/close';
	import IconFileUpload from '~icons/mdi/file-upload';

	let {
		open = $bindable(false),
		tasks,
		onImport
	}: {
		open?: boolean;
		tasks: TaskItem[];
		onImport: (result: { tasks: TaskItem[]; nextId: number; count: number }) => void;
	} = $props();

	let importMode = $state<TasksImportMode>('merge');
	let importError = $state('');
	let importMessage = $state('');
	let importing = $state(false);
	let fileInputEl = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (!open) {
			importError = '';
			importMessage = '';
			importing = false;
		}
	});

	async function importChosenFile(file: File) {
		importing = true;
		importError = '';
		importMessage = '';
		try {
			const result = await importTasksFromFile(file, tasks, computeNextTaskId(tasks), importMode);
			if (!result.ok) {
				importError = result.error;
				return;
			}
			onImport({ tasks: result.tasks, nextId: result.nextId, count: result.count });
			importMessage =
				importMode === 'replace'
					? `Replaced your list with ${result.count} imported task${result.count === 1 ? '' : 's'}.`
					: `Added ${result.count} imported task${result.count === 1 ? '' : 's'} to your list.`;
		} catch {
			importError = 'Could not read that file.';
		} finally {
			importing = false;
		}
	}

	async function handleFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		await importChosenFile(file);
	}

	async function chooseImportFile() {
		if (importing) return;
		importError = '';
		try {
			const picked = await pickTasksImportFile();
			if (picked === 'unsupported') {
				fileInputEl?.click();
				return;
			}
			if (picked) await importChosenFile(picked);
		} catch {
			importError = 'Could not open your Downloads folder.';
		}
	}

	function closeModal() {
		open = false;
	}
</script>

{#if open}
	<div class="modal modal-open z-[200]" role="dialog" aria-modal="true" aria-labelledby="tasks-import-title">
		<div class="modal-box relative z-[201] max-w-md">
			<div class="mb-4 flex items-start justify-between gap-3">
				<div>
					<h2 id="tasks-import-title" class="text-lg font-bold">Import your list</h2>
					<p class="mt-1 text-sm text-base-content/60">
						Bring tasks in from a CSV or XML file.
					</p>
				</div>
				<button
					type="button"
					class="btn btn-ghost btn-sm btn-circle shrink-0"
					aria-label="Close"
					onclick={closeModal}
				>
					<IconClose class="h-4 w-4" aria-hidden="true" />
				</button>
			</div>

			<fieldset class="mb-3 flex flex-col gap-2">
				<legend class="sr-only">Import mode</legend>
				<label class="flex cursor-pointer items-center gap-2 text-sm">
					<input
						type="radio"
						class="radio radio-sm radio-primary"
						name="tasks-import-mode"
						value="merge"
						checked={importMode === 'merge'}
						onchange={() => (importMode = 'merge')}
					/>
					Merge into current list
				</label>
				<label class="flex cursor-pointer items-center gap-2 text-sm">
					<input
						type="radio"
						class="radio radio-sm radio-primary"
						name="tasks-import-mode"
						value="replace"
						checked={importMode === 'replace'}
						onchange={() => (importMode = 'replace')}
					/>
					Replace current list
				</label>
			</fieldset>

			<input
				bind:this={fileInputEl}
				type="file"
				accept=".csv,.xml,text/csv,text/xml,application/xml"
				class="hidden"
				onchange={handleFileChange}
			/>
			<button
				type="button"
				class="btn btn-primary btn-sm w-full gap-2"
				disabled={importing}
				onclick={chooseImportFile}
			>
				<IconFileUpload class="h-4 w-4" aria-hidden="true" />
				{importing ? 'Importing…' : 'Choose CSV or XML file'}
			</button>

			{#if importMessage}
				<p class="mt-4 text-sm text-success" role="status">{importMessage}</p>
			{/if}
			{#if importError}
				<p class="mt-4 text-sm text-error" role="alert">{importError}</p>
			{/if}

			<div class="modal-action">
				<button type="button" class="btn btn-ghost btn-sm" onclick={closeModal}>Done</button>
			</div>
		</div>
		<button
			type="button"
			class="modal-backdrop z-[200]"
			aria-label="Close import dialog"
			onclick={closeModal}
		></button>
	</div>
{/if}
