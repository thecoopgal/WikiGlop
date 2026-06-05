<script lang="ts">
	import GlopSearchModal from '$lib/components/GlopSearchModal.svelte';

	type SearchButton = {
		query: string;
		label?: string;
	};

	type Props = {
		prompt?: string;
		query?: string;
		buttons?: SearchButton[];
	};

	let { prompt = 'Want to know more?', query = 'Consent', buttons }: Props = $props();

	const searchButtons = $derived.by((): SearchButton[] => {
		if (buttons?.length) {
			return buttons.filter((b) => b.query?.trim());
		}
		if (query?.trim()) {
			return [{ query: query.trim() }];
		}
		return [];
	});

	let modalOpen = $state(false);
	let activeQuery = $state('');

	function openSearch(nextQuery: string) {
		activeQuery = nextQuery.trim();
		modalOpen = true;
	}

	function buttonLabel(button: SearchButton): string {
		return button.label?.trim() || `Search for ${button.query.trim()}`;
	}
</script>

{#if searchButtons.length > 0}
	<section class="not-prose my-10 rounded-2xl border border-primary/25 bg-primary/5 px-5 py-6">
		{#if prompt?.trim()}
			<p class="text-center text-base font-semibold text-base-content">{prompt.trim()}</p>
		{/if}
		<div
			class={`flex flex-wrap justify-center gap-3 ${prompt?.trim() ? 'mt-4' : ''}`}
			role="group"
			aria-label="Search prompts"
		>
			{#each searchButtons as button (button.query + (button.label ?? ''))}
				<button
					type="button"
					class="btn border-[#5f9626] bg-[#7ac943] text-[#10210a] hover:border-[#4c7a1f] hover:bg-[#6fb93b]"
					onclick={() => openSearch(button.query)}
				>
					{buttonLabel(button)}
				</button>
			{/each}
		</div>
	</section>

	{#if modalOpen}
		<GlopSearchModal bind:open={modalOpen} initialQuery={activeQuery} />
	{/if}
{/if}
