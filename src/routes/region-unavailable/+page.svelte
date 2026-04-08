<script lang="ts">
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
</script>

<svelte:head>
	<title>Unavailable — {data.site.name ?? data.site.id}</title>
	<meta
		name="description"
		content="This page is not available in your region, or the link may be invalid."
	/>
</svelte:head>

<div
	class="flex min-h-screen flex-col bg-base-200"
	data-theme={themeName}
	style={pageBg ? `background-color: ${pageBg};` : undefined}
>
	{#if data.site.navigation?.header}
		<div class="navbar bg-base-100 shadow-sm">
			<div class="navbar-start">
				<a class="btn btn-ghost text-xl" href="/">{data.site.name ?? data.site.id}</a>
			</div>
		</div>
	{/if}

	<main class="flex flex-1 items-center justify-center px-4 py-16">
		<div class="card bg-base-100 max-w-lg shadow-xl">
			<div class="card-body">
				<h1 class="card-title text-2xl">Page unavailable</h1>
				<p class="opacity-90">
					Sorry — that page does not exist, or you are outside the region it is intended for.
				</p>
				{#if data.fromPath}
					<p class="text-sm opacity-70">Requested path: <code class="text-base-content">{data.fromPath}</code></p>
				{/if}
				<div class="card-actions mt-4 justify-start">
					<a href="/" class="btn btn-primary">Go to home</a>
				</div>
			</div>
		</div>
	</main>
</div>
