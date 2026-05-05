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
	const creatorPages = $derived(Array.isArray(data.creatorPages) ? data.creatorPages : []);

	let selectedPath = $state('/');
	let apiKey = $state('');
	let title = $state('');
	let message = $state('');
	let destinationUrl = $state('');
	let sendState = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let feedback = $state('');

	$effect(() => {
		if (selectedPath) return;
		selectedPath = creatorPages[0]?.path ?? '/';
	});

	function selectedCreatorName(): string {
		const match = creatorPages.find((p: any) => p.path === selectedPath);
		return match?.title ?? data.site?.name ?? data.site?.id ?? 'Creator';
	}

	async function sendNotification(e: SubmitEvent) {
		e.preventDefault();
		if (!apiKey.trim() || !selectedPath.trim() || !title.trim() || !message.trim()) {
			sendState = 'error';
			feedback = 'Please fill API key, creator page, title, and message.';
			return;
		}

		sendState = 'loading';
		feedback = '';
		try {
			const res = await fetch('/api/creator/notifications/send', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'x-creator-notify-key': apiKey.trim()
				},
				body: JSON.stringify({
					pagePath: selectedPath,
					title: title.trim(),
					message: message.trim(),
					url: destinationUrl.trim() || selectedPath,
					creatorName: selectedCreatorName()
				})
			});
			const body = (await res.json().catch(() => null)) as
				| { ok?: boolean; sent?: number; failed?: number; total?: number; message?: string }
				| null;
			if (!res.ok || !body?.ok) {
				throw new Error(body?.message || 'Could not send notification.');
			}
			sendState = 'success';
			feedback = `Sent ${body.sent ?? 0} of ${body.total ?? 0} subscriptions.`;
			title = '';
			message = '';
			destinationUrl = '';
		} catch (err) {
			sendState = 'error';
			feedback = err instanceof Error ? err.message : 'Could not send notification.';
		}
	}
</script>

<svelte:head>
	<title>Creator Notifications — {data.site.name ?? data.site.id}</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-base-200" data-theme={themeName} style={pageBg ? `background-color: ${pageBg};` : undefined}>
	<div class="navbar bg-base-100 shadow-sm">
		<div class="navbar-start">
			<a class="btn btn-ghost text-xl" href="/">{data.site.name ?? data.site.id}</a>
		</div>
	</div>

	<main class="flex flex-1 items-center justify-center px-4 py-12">
		<div class="card bg-base-100 w-full max-w-2xl shadow-xl">
			<div class="card-body">
				<h1 class="card-title text-2xl">Creator Notification Sender</h1>
				<p class="text-sm opacity-80">
					Send push notifications to followers of a specific creator page.
				</p>

				<form class="mt-4 space-y-4" onsubmit={sendNotification}>
					<label class="form-control w-full">
						<div class="label">
							<span class="label-text">Creator API key</span>
						</div>
						<input class="input input-bordered w-full" type="password" bind:value={apiKey} placeholder="Enter CREATOR_NOTIFY_API_KEY" />
					</label>

					<label class="form-control w-full">
						<div class="label">
							<span class="label-text">Creator page</span>
						</div>
						<select class="select select-bordered w-full" bind:value={selectedPath}>
							{#each creatorPages as page}
								<option value={page.path}>{page.title} ({page.path})</option>
							{/each}
						</select>
					</label>

					<label class="form-control w-full">
						<div class="label">
							<span class="label-text">Notification title</span>
						</div>
						<input class="input input-bordered w-full" type="text" maxlength="120" bind:value={title} placeholder="New drop just launched" />
					</label>

					<label class="form-control w-full">
						<div class="label">
							<span class="label-text">Notification message</span>
						</div>
						<textarea class="textarea textarea-bordered w-full" rows="4" maxlength="280" bind:value={message} placeholder="Tap to see the latest update"></textarea>
					</label>

					<label class="form-control w-full">
						<div class="label">
							<span class="label-text">Click destination URL (optional)</span>
						</div>
						<input class="input input-bordered w-full" type="text" bind:value={destinationUrl} placeholder="/ or full URL" />
					</label>

					<button class="btn btn-primary w-full" type="submit" disabled={sendState === 'loading'}>
						{sendState === 'loading' ? 'Sending...' : 'Send notification'}
					</button>
				</form>

				{#if sendState === 'success'}
					<p class="mt-3 text-success text-sm">{feedback}</p>
				{:else if sendState === 'error'}
					<p class="mt-3 text-error text-sm">{feedback}</p>
				{/if}
			</div>
		</div>
	</main>
</div>
