<script lang="ts">
	type Props = {
		title?: string;
		items?: Array<{ image: string; alt?: string }>;
	};

	let { title, items } = $props() as Props;
</script>

<section class="my-10">
	{#if title}
		<h2 class="mb-6 text-2xl font-bold">{title}</h2>
	{/if}

	{#if items && items.length}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each items as item (item.image)}
				<div class="overflow-hidden rounded-box border bg-base-100">
					<img src={item.image} alt={item.alt ?? ''} class="h-48 w-full object-cover" />
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-warning">No gallery items.</p>
	{/if}
</section>

