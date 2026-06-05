<script lang="ts">
	const RADIUS = 45;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

	let {
		iconUrl,
		progress,
		spinOnce = false
	}: {
		iconUrl: string;
		progress: number;
		spinOnce?: boolean;
	} = $props();

	const clampedProgress = $derived(Math.min(1, Math.max(0, progress)));
	const strokeOffset = $derived(CIRCUMFERENCE * (1 - clampedProgress));
</script>

<div
	class="relative mx-auto mb-6 h-28 w-28"
	class:links-ring-spin-once={spinOnce}
>
	<svg
		viewBox="0 0 100 100"
		class="absolute inset-0 h-full w-full -rotate-90"
		aria-hidden="true"
	>
		<circle
			cx="50"
			cy="50"
			r={RADIUS}
			fill="none"
			class="stroke-primary/20"
			stroke-width="4"
		/>
		<circle
			cx="50"
			cy="50"
			r={RADIUS}
			fill="none"
			class="stroke-primary transition-[stroke-dashoffset] duration-700 ease-out"
			stroke-width="4"
			stroke-linecap="round"
			stroke-dasharray={CIRCUMFERENCE}
			stroke-dashoffset={strokeOffset}
		/>
	</svg>
	<div class="absolute inset-0 grid place-items-center">
		<img
			src={iconUrl}
			alt=""
			class="h-12 w-12 rounded-xl object-cover"
			width="48"
			height="48"
			decoding="async"
		/>
	</div>
</div>

<style>
	@keyframes links-ring-spin-once {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.links-ring-spin-once {
		animation: links-ring-spin-once 1s ease-out 1 forwards;
	}

	@media (prefers-reduced-motion: reduce) {
		.links-ring-spin-once {
			animation: none;
		}
	}
</style>
