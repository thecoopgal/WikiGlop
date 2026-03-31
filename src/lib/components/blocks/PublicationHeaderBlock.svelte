<script lang="ts">
	type Props = {
		title?: string;
		subtitle?: string;
		cover_image?: string;
	};

	let { title, subtitle, cover_image } = $props() as Props;
</script>

<header class="my-10">
	{#if cover_image}
		<img
			src={cover_image}
			alt={title ? `${title} cover` : 'Publication cover'}
			class="mx-auto mb-6 aspect-[16/9] w-full max-w-3xl rounded-box object-cover"
		/>
	{/if}

	{#if title}
		<h1 class="text-4xl font-bold text-center">{title}</h1>
	{/if}
	{#if subtitle}
		<p class="mt-3 text-base-content/80 text-center">{subtitle}</p>
	{/if}
</header>

