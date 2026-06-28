<script lang="ts">
	import IconChevronLeft from '~icons/mdi/chevron-left';
	import IconChevronRight from '~icons/mdi/chevron-right';

	type SlideItem = {
		image: string;
		alt?: string;
		caption?: string;
	};

	type Props = {
		title?: string;
		items?: SlideItem[];
		/** Shorthand: list of image URLs (same order as `items`). */
		images?: string[];
		start_index?: number;
		show_counter?: boolean;
		show_nav?: boolean;
		/** How images fit in the frame. Webcomics usually want `contain`. */
		fit?: 'contain' | 'cover';
	};

	let {
		title,
		items,
		images,
		start_index = 0,
		show_counter = true,
		show_nav = true,
		fit = 'contain'
	} = $props() as Props;

	const slides = $derived.by((): SlideItem[] => {
		if (items?.length) {
			return items
				.map((item) => ({
					image: typeof item.image === 'string' ? item.image.trim() : '',
					alt: typeof item.alt === 'string' ? item.alt.trim() : undefined,
					caption: typeof item.caption === 'string' ? item.caption.trim() : undefined
				}))
				.filter((item) => !!item.image);
		}
		if (images?.length) {
			return images
				.map((url, i) => ({
					image: typeof url === 'string' ? url.trim() : '',
					alt: `Slide ${i + 1}`
				}))
				.filter((item) => !!item.image);
		}
		return [];
	});

	let currentIndex = $state(0);
	let touchStartX = $state(0);
	let touchActive = $state(false);
	let rootEl = $state<HTMLElement | null>(null);

	$effect(() => {
		const max = Math.max(slides.length - 1, 0);
		const start = Number.isFinite(start_index) ? Math.floor(start_index) : 0;
		currentIndex = Math.min(Math.max(start, 0), max);
	});

	const currentSlide = $derived(slides[currentIndex] ?? null);
	const hasMultiple = $derived(slides.length > 1);
	const fitClass = $derived(fit === 'cover' ? 'object-cover' : 'object-contain');

	function goTo(index: number) {
		if (!slides.length) return;
		currentIndex = Math.min(Math.max(index, 0), slides.length - 1);
	}

	function goPrev() {
		goTo(currentIndex - 1);
	}

	function goNext() {
		goTo(currentIndex + 1);
	}

	function onKeydown(e: KeyboardEvent) {
		if (!hasMultiple) return;
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			goPrev();
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			goNext();
		}
	}

	function onTouchStart(e: TouchEvent) {
		const touch = e.touches?.[0];
		if (!touch) return;
		touchStartX = touch.clientX;
		touchActive = true;
	}

	function onTouchEnd(e: TouchEvent) {
		if (!touchActive || !hasMultiple) return;
		touchActive = false;
		const touch = e.changedTouches?.[0];
		if (!touch) return;
		const deltaX = touch.clientX - touchStartX;
		const SWIPE_THRESHOLD_PX = 40;
		if (deltaX <= -SWIPE_THRESHOLD_PX) goNext();
		if (deltaX >= SWIPE_THRESHOLD_PX) goPrev();
	}

	function onImageClick(e: MouseEvent) {
		if (!hasMultiple || !rootEl) return;
		const rect = rootEl.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const third = rect.width / 3;
		if (x < third) goPrev();
		else if (x > rect.width - third) goNext();
	}
</script>

<section class="my-6 first:mt-0">
	{#if title}
		<h2 class="mb-3 text-2xl font-bold">{title}</h2>
	{/if}

	{#if slides.length}
		<div
			bind:this={rootEl}
			class="relative overflow-hidden rounded-box border border-base-300 bg-base-200/40"
			role="group"
			aria-roledescription="carousel"
			aria-label={title?.trim() || 'Image slideshow'}
		>
			{#if currentSlide}
				<button
					type="button"
					class="block w-full cursor-pointer border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
					onclick={onImageClick}
					onkeydown={onKeydown}
					ontouchstart={onTouchStart}
					ontouchend={onTouchEnd}
					aria-label={`Slide ${currentIndex + 1} of ${slides.length}. Use arrow keys or tap sides to navigate.`}
				>
					<img
						src={currentSlide.image}
						alt={currentSlide.alt ?? `Slide ${currentIndex + 1}`}
						class={`mx-auto block max-h-[80vh] w-full ${fitClass}`}
						loading={currentIndex === 0 ? 'eager' : 'lazy'}
						decoding="async"
					/>
				</button>
			{/if}

			{#if show_nav && hasMultiple}
				<button
					type="button"
					class="btn btn-circle btn-sm absolute left-2 top-1/2 -translate-y-1/2 border-0 bg-base-100/90 shadow-md backdrop-blur-sm"
					onclick={goPrev}
					disabled={currentIndex === 0}
					aria-label="Previous slide"
				>
					<IconChevronLeft class="h-5 w-5" />
				</button>
				<button
					type="button"
					class="btn btn-circle btn-sm absolute right-2 top-1/2 -translate-y-1/2 border-0 bg-base-100/90 shadow-md backdrop-blur-sm"
					onclick={goNext}
					disabled={currentIndex === slides.length - 1}
					aria-label="Next slide"
				>
					<IconChevronRight class="h-5 w-5" />
				</button>
			{/if}

			{#if show_counter && slides.length}
				<div
					class="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-base-100/90 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur-sm"
					aria-live="polite"
				>
					{currentIndex + 1} / {slides.length}
				</div>
			{/if}
		</div>

		{#if currentSlide?.caption}
			<p class="mt-2 text-center text-sm text-base-content/70">{currentSlide.caption}</p>
		{/if}
	{:else}
		<p class="text-sm text-warning">No slideshow images.</p>
	{/if}
</section>
