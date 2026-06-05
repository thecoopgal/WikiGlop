<script lang="ts">
	import LoadingGloop from '$lib/components/LoadingGloop.svelte';

	export type GlopSubmitState = 'idle' | 'loading' | 'error';

	type Props = {
		query?: string;
		gloopUrl?: string;
		submitState?: GlopSubmitState;
		errorMessage?: string;
		onsubmit?: () => void;
		class?: string;
	};

	let {
		query = '',
		gloopUrl = $bindable(''),
		submitState = 'idle',
		errorMessage = '',
		onsubmit,
		class: className = ''
	}: Props = $props();
</script>

<div
	class="space-y-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-4 {className}"
>
	<p class="text-sm font-medium">Add a glop for this search</p>
	{#if query}
		<p class="text-xs text-base-content/65">{query}</p>
	{/if}
	<label class="form-control w-full">
		<input
			type="text"
			class="input input-bordered w-full input-sm"
			placeholder="YouTube, TikTok, Instagram, Wikipedia, Reddit, or Facebook link"
			aria-label="Paste a public link"
			bind:value={gloopUrl}
			inputmode="url"
			autocomplete="off"
			disabled={submitState === 'loading'}
		/>
	</label>
	{#if submitState === 'error' && errorMessage}
		<p class="text-sm text-error">{errorMessage}</p>
	{/if}
	<button
		type="button"
		class="btn btn-primary btn-sm mt-3"
		disabled={submitState === 'loading' || !gloopUrl.trim()}
		onclick={() => onsubmit?.()}
	>
		{#if submitState === 'loading'}
			<span class="inline-flex items-center gap-2">
				<LoadingGloop spinning size="sm" />
				Saving…
			</span>
		{:else}
			Submit
		{/if}
	</button>
</div>
