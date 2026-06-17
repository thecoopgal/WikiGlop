<script lang="ts">
	import {
		downloadTasksCsv,
		downloadTasksPdf,
		downloadTasksXml
	} from '$lib/client/tasks-import-export';
	import type { TaskItem } from '$lib/client/tasks-state';
	import IconClose from '~icons/mdi/close';
	import IconFileDocumentOutline from '~icons/mdi/file-document-outline';
	import IconFileXmlBox from '~icons/mdi/file-xml-box';
	import IconTable from '~icons/mdi/table';

	let {
		open = $bindable(false),
		tasks
	}: {
		open?: boolean;
		tasks: TaskItem[];
	} = $props();

	let exportingPdf = $state(false);
	let exportError = $state('');

	$effect(() => {
		if (!open) {
			exportingPdf = false;
			exportError = '';
		}
	});

	async function handlePdfExport() {
		exportingPdf = true;
		exportError = '';
		try {
			await downloadTasksPdf(tasks);
		} catch {
			exportError = 'Could not create PDF.';
		} finally {
			exportingPdf = false;
		}
	}

	function handleCsvExport() {
		exportError = '';
		downloadTasksCsv(tasks);
	}

	function handleXmlExport() {
		exportError = '';
		downloadTasksXml(tasks);
	}

	function closeModal() {
		open = false;
	}
</script>

{#if open}
	<div class="modal modal-open z-[200]" role="dialog" aria-modal="true" aria-labelledby="tasks-download-title">
		<div class="modal-box relative z-[201] max-w-md">
			<div class="mb-4 flex items-start justify-between gap-3">
				<div>
					<h2 id="tasks-download-title" class="text-lg font-bold">Download your list</h2>
					<p class="mt-1 text-sm text-base-content/60">
						Export your tasks as CSV, XML, or PDF.
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

			<div class="flex flex-col gap-2">
				<button type="button" class="btn btn-outline btn-sm justify-start gap-2" onclick={handleCsvExport}>
					<IconTable class="h-4 w-4" aria-hidden="true" />
					Download CSV
				</button>
				<button type="button" class="btn btn-outline btn-sm justify-start gap-2" onclick={handleXmlExport}>
					<IconFileXmlBox class="h-4 w-4" aria-hidden="true" />
					Download XML
				</button>
				<button
					type="button"
					class="btn btn-outline btn-sm justify-start gap-2"
					disabled={exportingPdf}
					onclick={handlePdfExport}
				>
					<IconFileDocumentOutline class="h-4 w-4" aria-hidden="true" />
					{exportingPdf ? 'Creating PDF…' : 'Download PDF'}
				</button>
			</div>

			{#if exportError}
				<p class="mt-4 text-sm text-error" role="alert">{exportError}</p>
			{/if}

			<div class="modal-action">
				<button type="button" class="btn btn-ghost btn-sm" onclick={closeModal}>Done</button>
			</div>
		</div>
		<button
			type="button"
			class="modal-backdrop z-[200]"
			aria-label="Close download dialog"
			onclick={closeModal}
		></button>
	</div>
{/if}
