import type { EffectiveTheme } from '$lib/client/theme-preference';

/** Fixed chrome styling for customize-step edit controls (not tied to user-picked colors). */
export function linksCreateEditButtonClass(
	theme: EffectiveTheme,
	size: 'xs' | 'sm' = 'xs'
): string {
	const onLight = theme !== 'dark';
	return [
		'btn btn-circle border shadow-md backdrop-blur-sm transition-colors',
		size === 'sm' ? 'btn-sm' : 'btn-xs',
		onLight
			? 'border-neutral-300/80 bg-white/95 text-neutral-900 hover:border-neutral-400 hover:bg-white'
			: 'border-white/20 bg-neutral-900/82 text-white hover:border-white/35 hover:bg-neutral-900/92'
	].join(' ');
}
