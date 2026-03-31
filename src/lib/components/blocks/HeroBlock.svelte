<script lang="ts">
	type Props = {
		headline?: string;
		subheadline?: string;
		cta?:
			| Array<{ label: string; href: string; open_mode?: string; modal?: string }>
			| undefined;
	};

	let { headline, subheadline, cta } = $props() as Props;

</script>

<section class="hero bg-base-200">
	<div class="hero-content text-center">
		<div class="max-w-2xl">
			{#if headline}
				<h1 class="text-4xl font-bold md:text-5xl">{headline}</h1>
			{/if}
			{#if subheadline}
				<p class="mt-4 text-base-content/80">{subheadline}</p>
			{/if}

			{#if cta && cta.length}
				<div class="mt-6 flex flex-wrap justify-center gap-3">
					{#each cta as item}
						<a
							class={`btn ${item.open_mode ? 'btn-primary' : 'btn-primary'}`}
							href={item.href}
							data-open-mode={item.open_mode ?? undefined}
							data-modal={item.modal ?? undefined}
						>
							{item.label}
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</section>

