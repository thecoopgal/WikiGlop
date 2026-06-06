<script lang="ts">
	import { onMount } from 'svelte';
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';
	import {
		fetchMyLinksSubmissions,
		type LinksPageSubmissionSummary
	} from '$lib/client/links-create-dashboard';

	let loading = $state(true);
	let loadError = $state('');
	let submissions = $state<LinksPageSubmissionSummary[]>([]);

	onMount(async () => {
		const result = await fetchMyLinksSubmissions();
		loading = false;
		if (!result.ok) {
			loadError = result.error;
			return;
		}
		submissions = result.submissions;
	});

	function formatWhen(iso: string): string {
		const date = new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
		if (Number.isNaN(date.getTime())) return iso;
		return date.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function statusBadgeClass(status: LinksPageSubmissionSummary['approvalStatus']): string {
		if (status === 'approved') return 'badge-success';
		if (status === 'rejected') return 'badge-error';
		return 'badge-warning';
	}

	function statusLabel(status: LinksPageSubmissionSummary['approvalStatus']): string {
		if (status === 'approved') return 'Approved';
		if (status === 'rejected') return 'Not approved';
		return 'Pending review';
	}
</script>

<svelte:head>
	<title>Links · GloopGlop</title>
	<meta name="description" content="Your GloopGlop Links page submissions." />
</svelte:head>

<div class="flex min-h-screen flex-col">
	<div class="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10">
		<header class="mb-8 text-center">
			<h1 class="text-2xl font-semibold tracking-tight">Your Links pages</h1>
			<p class="mt-2 text-sm opacity-70">
				Pages you submitted from this browser. We review each one before it goes live.
			</p>
		</header>

		<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
			<a href="/links/start" class="btn btn-primary rounded-2xl">Gloop my Glop</a>
			<a href="/links/start" class="btn btn-outline rounded-2xl">Edit existing page</a>
		</div>

		{#if loading}
			<div class="flex flex-1 items-center justify-center py-16">
				<span class="loading loading-spinner loading-lg text-primary"></span>
			</div>
		{:else if loadError}
			<div class="rounded-2xl border border-error/30 bg-base-100 p-6 text-center">
				<p class="text-error">{loadError}</p>
			</div>
		{:else if submissions.length === 0}
			<div class="rounded-2xl border border-base-content/10 bg-base-100 p-8 text-center shadow-sm">
				<p class="font-medium">No submissions yet</p>
				<p class="mt-2 text-sm opacity-70">
					Create a page and tap <span class="font-medium">Submit page for review</span> on the
					customize step.
				</p>
			</div>
		{:else}
			<ul class="flex flex-col gap-3">
				{#each submissions as submission (submission.id)}
					<li
						class="rounded-2xl border border-base-content/10 bg-base-100 p-5 shadow-sm"
					>
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<p class="truncate text-lg font-medium">{submission.primaryName}</p>
								{#if submission.tagline}
									<p class="mt-1 truncate text-sm opacity-70">{submission.tagline}</p>
								{/if}
							</div>
							<span class={`badge badge-sm ${statusBadgeClass(submission.approvalStatus)}`}>
								{statusLabel(submission.approvalStatus)}
							</span>
						</div>
						<dl class="mt-4 grid gap-1 text-sm opacity-70 sm:grid-cols-2">
							<div>
								<dt class="sr-only">Submitted</dt>
								<dd>Submitted {formatWhen(submission.createdAt)}</dd>
							</div>
							<div>
								<dt class="sr-only">Links</dt>
								<dd>{submission.linkCount} link{submission.linkCount === 1 ? '' : 's'}</dd>
							</div>
							{#if submission.approvalStatus === 'approved' && submission.approvedAt}
								<div>
									<dt class="sr-only">Approved</dt>
									<dd>Approved {formatWhen(submission.approvedAt)}</dd>
								</div>
							{/if}
							{#if submission.creatorId}
								<div>
									<dt class="sr-only">Page slug</dt>
									<dd>{submission.creatorId}.gloopglop.com</dd>
								</div>
							{/if}
						</dl>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<Icons8BoogerAttribution />
</div>
