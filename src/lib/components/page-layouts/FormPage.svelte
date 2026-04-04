<script lang="ts">
	import type { PageYaml } from '$lib/server/content';
	import type { ResolvedSite } from '$lib/server/sites';
	import { goto } from '$app/navigation';
	import { collectFormFieldValues, postFormEmail } from '$lib/form-submit-client';

	let {
		site,
		page,
		formSlugParts = []
	}: {
		site: ResolvedSite;
		page: PageYaml;
		formSlugParts?: string[];
	} = $props();

	const renderMode = $derived(page.render_mode ?? 'page');
	const isModal = $derived(renderMode === 'modal');

	const modalSize = $derived(page.page_settings?.modal_size ?? 'md');
	const modalBoxSizeClass = $derived(
		modalSize === 'sm'
			? 'max-w-lg'
			: modalSize === 'md'
				? 'max-w-xl'
				: modalSize === 'lg'
					? 'max-w-2xl'
					: modalSize === 'xl'
						? 'max-w-3xl'
						: 'max-w-xl'
	);

	const form = $derived(page.form);
	const sendEmailEnabled = $derived(Boolean(page.send_email?.trim()));

	let submitState = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let submitError = $state('');

	function fieldClasses() {
		return 'input input-bordered w-full';
	}

	function fieldId(name: string) {
		return `field-${name}`;
	}

	async function handleCancel() {
		if (typeof window !== 'undefined' && window.history.length > 1) {
			window.history.back();
			return;
		}
		await goto('/');
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const formEl = e.currentTarget as HTMLFormElement;
		if (!sendEmailEnabled || !form?.fields?.length) return;

		submitState = 'loading';
		submitError = '';
		const values = collectFormFieldValues(formEl, form.fields);
		const result = await postFormEmail({ kind: 'page', slugParts: formSlugParts }, values);
		if (!result.ok) {
			submitState = 'error';
			submitError = result.error;
			return;
		}
		submitState = 'success';
		formEl.reset();
	}
</script>

{#snippet formInner()}
	{#if form?.title || form?.intro}
		<div class="mb-5">
			<h2 class="text-2xl font-bold">{form?.title}</h2>
			{#if form?.intro}
				<p class="mt-2 opacity-80">{form?.intro}</p>
			{/if}
		</div>
	{/if}

	{#if submitState === 'success'}
		<p class="text-success font-medium">
			{form?.success_message ?? 'Thanks — your submission was sent.'}
		</p>
		<div class="mt-4">
			<button type="button" class="btn btn-ghost" onclick={handleCancel}>
				{form?.cancel_label ?? 'Close'}
			</button>
		</div>
	{:else}
		<form method="post" data-site={site.siteId} onsubmit={handleSubmit}>
			{#if form?.fields && form.fields.length}
				<div class="space-y-4">
					{#each form.fields as field (field.name)}
						<div>
							<label class="mb-1 block text-sm font-medium" for={fieldId(field.name)}
								>{field.label ?? field.name}</label
							>

							{#if field.type === 'textarea'}
								<textarea
									id={fieldId(field.name)}
									name={field.name}
									rows={typeof field.rows === 'number' ? field.rows : 4}
									class="textarea textarea-bordered w-full"
									placeholder={field.placeholder}
									disabled={submitState === 'loading'}
								></textarea>
							{:else if field.type === 'select'}
								<select
									id={fieldId(field.name)}
									name={field.name}
									class="select select-bordered w-full"
									disabled={submitState === 'loading'}
								>
									<option disabled selected value="">Select...</option>
									{#each field.options ?? [] as opt}
										<option value={opt.value}>{opt.label}</option>
									{/each}
								</select>
							{:else if field.type === 'checkbox'}
								<label class="label cursor-pointer justify-start gap-3">
									<input
										type="checkbox"
										name={field.name}
										class="checkbox checkbox-primary"
										disabled={submitState === 'loading'}
									/>
									<span class="label-text">{field.label ?? field.name}</span>
								</label>
							{:else}
								<input
									id={fieldId(field.name)}
									type={field.type === 'email' ? 'email' : 'text'}
									name={field.name}
									class={fieldClasses()}
									placeholder={field.placeholder}
									autocomplete="off"
									disabled={submitState === 'loading'}
								/>
							{/if}
						</div>
					{/each}

					{#if submitState === 'error' && submitError}
						<p class="text-sm text-error">{submitError}</p>
					{/if}

					<div class="mt-6 flex flex-wrap gap-3">
						<button type="submit" class="btn btn-primary" disabled={submitState === 'loading'}>
							{submitState === 'loading' ? 'Sending…' : (form?.submit_label ?? 'Submit')}
						</button>
						<button type="button" class="btn btn-ghost" onclick={handleCancel} disabled={submitState === 'loading'}>
							{form?.cancel_label ?? 'Cancel'}
						</button>
					</div>
				</div>
			{:else}
				<p class="text-sm text-warning">No form fields found.</p>
			{/if}
		</form>
	{/if}
{/snippet}

{#if isModal}
	<div class="modal modal-open">
		<div class={`modal-box ${modalBoxSizeClass}`}>
			{@render formInner()}
		</div>
	</div>
{:else}
	<div class="mx-auto w-full max-w-3xl px-6 py-12">
		<div class="card bg-base-100 shadow-md">
			<div class="card-body">
				{@render formInner()}
			</div>
		</div>
	</div>
{/if}
