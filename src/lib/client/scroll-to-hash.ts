/** Scroll to `location.hash` target after the page has rendered (client navigations). */
export function scrollToLocationHash(behavior: ScrollBehavior = 'smooth'): void {
	if (typeof window === 'undefined') return;
	const id = window.location.hash.replace(/^#/, '').trim();
	if (!id) return;

	const run = () => {
		document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
	};

	requestAnimationFrame(() => requestAnimationFrame(run));
}
