<script lang="ts">
	import { goto } from '$app/navigation';
	import type { SiteNavLink } from '$lib/server/sites';
	import type { PageYaml } from '$lib/server/content';
	import LandingPage from '$lib/components/page-layouts/LandingPage.svelte';
	import FormPage from '$lib/components/page-layouts/FormPage.svelte';
	import DocumentPage from '$lib/components/page-layouts/DocumentPage.svelte';
	import PublicationPage from '$lib/components/page-layouts/PublicationPage.svelte';
	import CreatorLinksPage from '$lib/components/page-layouts/CreatorLinksPage.svelte';
	import { collectFormFieldValues, postFormEmail } from '$lib/form-submit-client';
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';

	let { data } = $props();

	const themeName = $derived(
		data.site?.theme?.preset && (data.site.theme.preset === 'light' || data.site.theme.preset === 'dark')
			? data.site.theme.preset
			: data.site?.theme?.mode === 'light' || data.site?.theme?.mode === 'dark'
				? data.site.theme.mode
				: 'light'
	);
	const pageBg = $derived(
		typeof data.site?.theme?.overrides?.['base-200'] === 'string' ? data.site.theme.overrides['base-200'] : undefined
	);

	const layout = $derived(data.page.layout);
	const renderMode = $derived(data.page.render_mode ?? 'page');
	const isModalForm = $derived(data.page.layout === 'form' && (data.page.render_mode ?? 'page') === 'modal');
	let activeModalId = $state<string | null>(null);
	const activeModal = $derived(
		activeModalId && data.modals ? (data.modals[activeModalId] as PageYaml | undefined) : undefined
	);

	$effect(() => {
		activeModalId = data.initialModalId ?? null;
	});

	function modalIdFromPath(pathname: string): string | null {
		const slug = pathname.replace(/^\/+|\/+$/g, '');
		if (!slug) return null;
		return data.modals && data.modals[slug] ? slug : null;
	}

	function navLinkAttrs(link: SiteNavLink) {
		return {
			'data-open-mode': link.open_mode ?? undefined,
			'data-modal': link.modal ?? undefined
		};
	}

	function handleRootClick(event: MouseEvent) {
		const target = event.target as HTMLElement | null;
		const anchor = target?.closest('a[data-open-mode="modal"]') as HTMLAnchorElement | null;
		if (!anchor) return;

		const modalId = anchor.dataset.modal;
		if (!modalId) return;

		event.preventDefault();
		if (typeof window !== 'undefined') {
			const nextPath = `/${modalId}`;
			if (window.location.pathname !== nextPath) window.history.pushState({}, '', nextPath);
		}
		activeModalId = modalId;
	}

	function closeModal() {
		const currentModalPath = activeModalId ? `/${activeModalId}` : null;
		activeModalId = null;
		if (typeof window !== 'undefined' && currentModalPath && window.location.pathname === currentModalPath) {
			if (window.history.length > 1) window.history.back();
			else goto('/');
		}
	}

	$effect(() => {
		if (typeof window === 'undefined') return;
		const onClick = (event: MouseEvent) => handleRootClick(event);
		const onPopState = () => {
			activeModalId = modalIdFromPath(window.location.pathname);
		};
		window.addEventListener('click', onClick);
		window.addEventListener('popstate', onPopState);
		return () => {
			window.removeEventListener('click', onClick);
			window.removeEventListener('popstate', onPopState);
		};
	});

	function fieldId(name: string) {
		return `modal-field-${name}`;
	}

	let modalSubmitState = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let modalSubmitError = $state('');

	$effect(() => {
		activeModalId;
		modalSubmitState = 'idle';
		modalSubmitError = '';
	});

	async function handleModalFormSubmit(e: SubmitEvent) {
		e.preventDefault();
		const m = activeModal;
		if (!m?.send_email?.trim() || !m.form?.fields?.length) return;
		const id = activeModalId;
		if (!id) return;
		const formEl = e.currentTarget as HTMLFormElement;
		modalSubmitState = 'loading';
		modalSubmitError = '';
		const values = collectFormFieldValues(formEl, m.form.fields);
		const result = await postFormEmail({ kind: 'modal', modalId: id }, values);
		if (!result.ok) {
			modalSubmitState = 'error';
			modalSubmitError = result.error;
			return;
		}
		modalSubmitState = 'success';
		formEl.reset();
	}
</script>

<svelte:head>
	<title>{data.page.seo?.title ?? data.page.title ?? data.site.name ?? data.site.id}</title>
	{#if data.page.seo?.description}
		<meta name="description" content={data.page.seo.description} />
	{/if}
</svelte:head>

<div
	class="flex min-h-screen flex-col bg-base-200"
	data-theme={themeName}
	style={pageBg ? `background-color: ${pageBg};` : undefined}
>
	{#if !isModalForm && data.site.navigation?.header}
		<div class="navbar bg-base-100 shadow-sm">
			<div class="navbar-start">
				<a class="btn btn-ghost text-xl" href="/">{data.site.name ?? data.site.id}</a>
			</div>
			<div class="navbar-center hidden md:flex">
				<ul class="menu menu-horizontal px-1">
					{#each data.site.navigation.header as link}
						<li>
							<a href={link.href} {...navLinkAttrs(link)}>{link.label}</a>
						</li>
					{/each}
				</ul>
			</div>
			<div class="navbar-end"></div>
		</div>
	{/if}

	<main class="flex-1">
		{#if layout === 'landing'}
			<LandingPage site={data.site} page={data.page} />
		{:else if layout === 'form'}
			<FormPage site={data.site} page={data.page} formSlugParts={data.formSlugParts ?? []} />
		{:else if layout === 'document'}
			<DocumentPage site={data.site} page={data.page} />
		{:else if layout === 'publication'}
			<PublicationPage site={data.site} page={data.page} />
		{:else if layout === 'creator_links'}
			<CreatorLinksPage site={data.site} page={data.page} />
		{:else}
			<LandingPage site={data.site} page={data.page} />
		{/if}
	</main>

	<Icons8BoogerAttribution />

	{#if activeModal}
		{#if activeModal.layout === 'form'}
			<div class="modal modal-open">
				<div class="modal-box max-w-xl">
					<h3 class="text-2xl font-bold">{activeModal.form?.title ?? activeModal.title ?? activeModal.id}</h3>
					{#if activeModal.form?.intro}
						<p class="mt-2 opacity-80">{activeModal.form.intro}</p>
					{/if}

					{#if modalSubmitState === 'success'}
						<p class="mt-4 text-success font-medium">
							{activeModal.form?.success_message ?? 'Thanks — your submission was sent.'}
						</p>
						<div class="mt-6 flex gap-3">
							<button type="button" class="btn btn-primary" onclick={closeModal}>Done</button>
						</div>
					{:else}
						<form method="post" class="mt-4 space-y-4" onsubmit={handleModalFormSubmit}>
							{#each activeModal.form?.fields ?? [] as field}
								<div>
									<label class="mb-1 block text-sm font-medium" for={fieldId(field.name)}
										>{field.label ?? field.name}</label
									>
									{#if field.type === 'textarea'}
										<textarea
											id={fieldId(field.name)}
											class="textarea textarea-bordered w-full"
											name={field.name}
											rows={typeof field.rows === 'number' ? field.rows : 4}
											placeholder={field.placeholder}
											disabled={modalSubmitState === 'loading'}
										></textarea>
									{:else if field.type === 'select'}
										<select
											id={fieldId(field.name)}
											class="select select-bordered w-full"
											name={field.name}
											disabled={modalSubmitState === 'loading'}
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
												class="checkbox checkbox-primary"
												name={field.name}
												disabled={modalSubmitState === 'loading'}
											/>
											<span class="label-text">{field.label ?? field.name}</span>
										</label>
									{:else}
										<input
											id={fieldId(field.name)}
											class="input input-bordered w-full"
											type={field.type === 'email' ? 'email' : 'text'}
											name={field.name}
											placeholder={field.placeholder}
											autocomplete="off"
											disabled={modalSubmitState === 'loading'}
										/>
									{/if}
								</div>
							{/each}

							{#if modalSubmitState === 'error' && modalSubmitError}
								<p class="text-sm text-error">{modalSubmitError}</p>
							{/if}

							<div class="mt-6 flex gap-3">
								<button type="submit" class="btn btn-primary" disabled={modalSubmitState === 'loading'}>
									{modalSubmitState === 'loading'
										? 'Sending…'
										: (activeModal.form?.submit_label ?? 'Submit')}
								</button>
								<button
									type="button"
									class="btn btn-ghost"
									onclick={closeModal}
									disabled={modalSubmitState === 'loading'}
								>
									{activeModal.form?.cancel_label ?? 'Cancel'}
								</button>
							</div>
						</form>
					{/if}
				</div>
				<div class="modal-backdrop">
					<button type="button" onclick={closeModal}>close</button>
				</div>
			</div>
		{:else}
			<div class="modal modal-open">
				<div class="modal-box max-w-xl">
					<h3 class="text-2xl font-bold">{activeModal.title ?? activeModal.id}</h3>
					<p class="mt-2 opacity-80">Unsupported modal layout: {activeModal.layout}</p>
					<div class="modal-action">
						<button type="button" class="btn" onclick={closeModal}>Close</button>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>

