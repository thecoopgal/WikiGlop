<script lang="ts">
	import { streamIframeSrc } from '$lib/stream-watch';

	const {
		streamUid,
		title = 'Video'
	}: {
		streamUid: string;
		title?: string;
	} = $props();

	const src = $derived(streamIframeSrc(streamUid));
</script>

<div class="aspect-video w-full overflow-hidden rounded-lg bg-black">
	<iframe
		{src}
		title={title}
		class="h-full w-full border-0"
		allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
		allowfullscreen
	></iframe>
</div>
