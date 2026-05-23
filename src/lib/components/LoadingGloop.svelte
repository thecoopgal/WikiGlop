<script lang="ts">
	import { GLOOPGLOP_DEFAULT_LOGO_URL } from '$lib/glop-link-image';

	type Size = 'sm' | 'md' | 'lg';

	const {
		spinning = true,
		size = 'md',
		alt = 'GloopGlop',
		class: className = ''
	}: {
		spinning?: boolean;
		size?: Size;
		alt?: string;
		class?: string;
	} = $props();

	const sizeClasses: Record<Size, string> = {
		sm: 'h-8 w-8 rounded-xl',
		md: 'h-11 w-11 rounded-2xl sm:h-12 sm:w-12',
		lg: 'h-16 w-16 rounded-2xl sm:h-20 sm:w-20'
	};

	const pixel = $derived(size === 'lg' ? 80 : size === 'md' ? 48 : 32);
</script>

<img
	src={GLOOPGLOP_DEFAULT_LOGO_URL}
	{alt}
	width={pixel}
	height={pixel}
	decoding="async"
	class="{sizeClasses[size]} object-cover motion-safe:transition-transform motion-safe:duration-500 {spinning
		? 'motion-safe:animate-spin'
		: ''} {className}"
	role={spinning ? 'status' : undefined}
	aria-label={spinning ? 'Loading' : undefined}
/>
