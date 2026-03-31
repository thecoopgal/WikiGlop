<script lang="ts">
	import type { PageYaml } from '$lib/server/content';
	import type { ResolvedSite } from '$lib/server/sites';
	import { goto } from '$app/navigation';

	let { site, page }: any = $props();

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
</script>

{#if isModal}
	<div class="modal modal-open">
		<div class={`modal-box ${modalBoxSizeClass}`}>
			{#if form?.title || form?.intro}
				<div class="mb-5">
					<h2 class="text-2xl font-bold">{form?.title}</h2>
					{#if form?.intro}
						<p class="mt-2 opacity-80">{form?.intro}</p>
					{/if}
				</div>
			{/if}

			<form method="post" onsubmit={(e) => e.preventDefault()}>
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
									></textarea>
								{:else if field.type === 'select'}
									<select id={fieldId(field.name)} name={field.name} class="select select-bordered w-full">
										<option disabled selected value="">
											Select...
										</option>
										{#each field.options ?? [] as opt}
											<option value={opt.value}>{opt.label}</option>
										{/each}
									</select>
								{:else if field.type === 'checkbox'}
									<label class="label cursor-pointer justify-start gap-3">
										<input type="checkbox" name={field.name} class="checkbox checkbox-primary" />
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
									/>
								{/if}
							</div>
						{/each}

						<div class="mt-6 flex flex-wrap gap-3">
							<button type="submit" class="btn btn-primary">
								{form?.submit_label ?? 'Submit'}
							</button>
							<button type="button" class="btn btn-ghost" onclick={handleCancel}>
								{form?.cancel_label ?? 'Cancel'}
							</button>
						</div>
					</div>
				{:else}
					<p class="text-sm text-warning">No form fields found.</p>
				{/if}
			</form>
		</div>
	</div>
{:else}
	<div class="mx-auto w-full max-w-3xl px-6 py-12">
		<div class="card bg-base-100 shadow-md">
			<div class="card-body">
				{#if form?.title || form?.intro}
					<div class="mb-5">
						<h2 class="text-2xl font-bold">{form?.title}</h2>
						{#if form?.intro}
							<p class="mt-2 opacity-80">{form?.intro}</p>
						{/if}
					</div>
				{/if}

				<form method="post" onsubmit={(e) => e.preventDefault()}>
					{#if form?.fields && form.fields.length}
						<div class="space-y-4">
							{#each form.fields as field (field.name)}
								<div>
									<label class="mb-1 block text-sm font-medium" for={fieldId(field.name)}>
										{field.label ?? field.name}
									</label>

									{#if field.type === 'textarea'}
										<textarea
											id={fieldId(field.name)}
											name={field.name}
											rows={typeof field.rows === 'number' ? field.rows : 4}
											class="textarea textarea-bordered w-full"
											placeholder={field.placeholder}
										></textarea>
									{:else if field.type === 'select'}
										<select id={fieldId(field.name)} name={field.name} class="select select-bordered w-full">
											<option disabled selected value="">
												Select...
											</option>
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
										/>
									{/if}
								</div>
							{/each}

							<div class="mt-6 flex flex-wrap gap-3">
								<button type="submit" class="btn btn-primary">
									{form?.submit_label ?? 'Submit'}
								</button>
								<button type="button" class="btn btn-ghost" onclick={handleCancel}>
									{form?.cancel_label ?? 'Cancel'}
								</button>
							</div>
						</div>
					{:else}
						<p class="text-sm text-warning">No form fields found.</p>
					{/if}
				</form>
			</div>
		</div>
	</div>
{/if}

