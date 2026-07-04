<script lang="ts">
	import type { PageData } from './$types';
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';
	import { GLOOPGLOP_DEFAULT_LOGO_URL } from '$lib/glop-link-image';

	let { data }: { data: PageData } = $props();

	let email = $state('');
	let submitting = $state(false);
	let message = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let sent = $state(false);

	async function onSubmit(e: Event) {
		e.preventDefault();
		if (submitting) return;
		submitting = true;
		message = null;
		errorMessage = null;

		try {
			const res = await fetch('/api/auth/magic-link', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email, next: data.next })
			});
			const body = (await res.json().catch(() => null)) as { message?: string } | null;

			if (!res.ok) {
				errorMessage = body?.message?.trim() || 'Could not send login link.';
				return;
			}

			sent = true;
			message = body?.message?.trim() || 'We sent a secure link. Open it to continue.';
		} catch {
			errorMessage = 'Could not send login link.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Sign in · GloopGlop</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-base-200">
	<main class="flex flex-1 items-center justify-center px-4 py-10">
		<div class="card w-full max-w-md bg-base-100 shadow-md">
			<div class="card-body gap-4">
				<div class="flex flex-col items-center gap-2 text-center">
					<img
						src={GLOOPGLOP_DEFAULT_LOGO_URL}
						alt=""
						class="h-12 w-12 rounded-full"
						width="48"
						height="48"
					/>
					{#if sent}
						<h1 class="text-xl font-bold">Continue from your email</h1>
						<p class="text-sm opacity-70">{message}</p>
					{:else}
						<h1 class="text-xl font-bold">Sign in</h1>
					{/if}
				</div>

				{#if sent}
					<button
						type="button"
						class="btn btn-ghost btn-sm"
						onclick={() => {
							sent = false;
							message = null;
						}}
					>
						Use a different email
					</button>
				{:else}
					<form class="flex flex-col gap-3" onsubmit={onSubmit}>
						<label class="form-control w-full">
							<span class="label-text mb-1">Email</span>
							<input
								type="email"
								name="email"
								class="input input-bordered w-full"
								placeholder="you@example.com"
								autocomplete="email"
								required
								bind:value={email}
								disabled={submitting}
							/>
						</label>

						{#if errorMessage}
							<div class="alert alert-error text-sm">
								<span>{errorMessage}</span>
							</div>
						{/if}

						<button type="submit" class="btn btn-primary" disabled={submitting || !email.trim()}>
							{#if submitting}
								<span class="loading loading-spinner loading-sm"></span>
								Sending…
							{:else}
								Email me a login link
							{/if}
						</button>
					</form>
				{/if}

				<p class="text-center text-xs opacity-50">
					<a href="/" class="link link-hover">Back home</a>
				</p>
			</div>
		</div>
	</main>
	<Icons8BoogerAttribution />
</div>
