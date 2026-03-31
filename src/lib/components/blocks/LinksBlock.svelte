<script lang="ts">
	type Props = {
		title?: string;
		style?: string;
		items?: Array<{
			label?: string;
			href?: string;
			open_mode?: string;
			modal?: string;
			open_in?: 'same_tab' | 'new_tab' | string;
			status?: string;
			message?: string;
		}>;
	};

	let { title, style, items } = $props() as Props;

	const mode = $derived(style === 'inline' ? 'inline' : style === 'cards' ? 'cards' : 'stacked');
	const GLOOPGLOP_LOGO_URL =
		'https://imagedelivery.net/zdMtZgMUbYs7-R4-dRSl-Q/907061a8-51ae-454c-c739-83935616f900/public';

	function getHostname(href: string | undefined): string | null {
		if (!href) return null;
		try {
			return new URL(href).hostname;
		} catch {
			return null;
		}
	}

	function getFavicon(href: string | undefined): string | null {
		const hostname = getHostname(href);
		if (!hostname) return null;
		// Google S2 favicon endpoint gives a consistent 64px icon per domain.
		return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
	}

	function isInternalPath(href: string | undefined): boolean {
		if (!href) return false;
		return href.startsWith('/');
	}

	function getCardIcon(href: string | undefined): string | null {
		if (isInternalPath(href)) return GLOOPGLOP_LOGO_URL;
		const hostname = getHostname(href);
		if (
			hostname &&
			(hostname === 'gloopglop.com' ||
				hostname.endsWith('.gloopglop.com') ||
				hostname === 'localhost' ||
				hostname.endsWith('.localhost') ||
				hostname === '127.0.0.1')
		) {
			return GLOOPGLOP_LOGO_URL;
		}
		return getFavicon(href);
	}

	function isExternal(href: string | undefined): boolean {
		if (!href) return false;
		return /^https?:\/\//i.test(href);
	}

	function itemLabel(item: NonNullable<Props['items']>[number]): string {
		return (item.label && item.label.trim()) || 'Untitled link';
	}

	function shouldOpenSameTab(item: NonNullable<Props['items']>[number]): boolean {
		if (item.open_mode === 'modal') return true;
		return (item.open_in ?? '').toLowerCase() === 'same_tab';
	}

	function linkTarget(item: NonNullable<Props['items']>[number]): '_blank' | undefined {
		return shouldOpenSameTab(item) ? undefined : '_blank';
	}

	function linkRel(item: NonNullable<Props['items']>[number]): string | undefined {
		return shouldOpenSameTab(item) ? undefined : 'noreferrer';
	}
</script>

<section class="my-6">
	{#if title}
		<h2 class="mb-3 text-2xl font-bold">{title}</h2>
	{/if}

	{#if items && items.length}
		{#if mode === 'inline'}
			<ul class="menu menu-horizontal bg-base-200 rounded-box">
				{#each items as item}
					<li>
						{#if item.status === 'not_found' || !item.href}
							<span class="opacity-70">{itemLabel(item)} - {item.message ?? 'Page not found'}</span>
						{:else}
							<a
								href={item.href}
								data-open-mode={item.open_mode ?? undefined}
								data-modal={item.modal ?? undefined}
								target={linkTarget(item)}
								rel={linkRel(item)}
							>{itemLabel(item)}</a>
						{/if}
					</li>
				{/each}
			</ul>
		{:else if mode === 'cards'}
			<div class="grid gap-3">
				{#each items as item}
					{#if item.status === 'not_found' || !item.href}
						<div class="card border border-warning/40 bg-base-100">
							<div class="card-body p-4">
								<div class="font-medium">{itemLabel(item)}</div>
								<div class="text-sm text-warning">{item.message ?? 'Page not found'}</div>
							</div>
						</div>
					{:else}
						<a
							class="card bg-base-100 border border-base-300 transition hover:border-primary hover:shadow-sm"
							href={item.href}
							data-open-mode={item.open_mode ?? undefined}
							data-modal={item.modal ?? undefined}
							target={linkTarget(item)}
							rel={linkRel(item)}
						>
							<div class="card-body p-4">
								<div class="flex items-center gap-3">
									{#if getCardIcon(item.href)}
										<img
											src={getCardIcon(item.href) ?? undefined}
											alt=""
											class="h-6 w-6 rounded"
											loading="lazy"
											decoding="async"
										/>
									{/if}
									<div>
										<div class="font-medium">{itemLabel(item)}</div>
									</div>
								</div>
							</div>
						</a>
					{/if}
				{/each}
			</div>
		{:else}
			<ul class="menu bg-base-200 rounded-box">
				{#each items as item}
					<li>
						{#if item.status === 'not_found' || !item.href}
							<span class="opacity-70">{itemLabel(item)} - {item.message ?? 'Page not found'}</span>
						{:else}
							<a
								href={item.href}
								data-open-mode={item.open_mode ?? undefined}
								data-modal={item.modal ?? undefined}
								target={linkTarget(item)}
								rel={linkRel(item)}
							>{itemLabel(item)}</a>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	{:else}
		<p class="text-sm text-warning">No links defined.</p>
	{/if}
</section>

