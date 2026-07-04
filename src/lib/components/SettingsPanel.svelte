<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import {
		getThemePreference,
		setThemePreference,
		subscribeThemePreference,
		THEME_OPTIONS,
		type ThemePreference
	} from '$lib/client/theme-preference';

	import IconLaptop from '~icons/mdi/laptop';
	import IconWeatherNight from '~icons/mdi/weather-night';
	import IconWeatherSunny from '~icons/mdi/weather-sunny';

	const gloopglopGreenButtonClass =
		'border-[#5f9626] bg-[#7ac943] hover:border-[#4c7a1f] hover:bg-[#6fb93b]';
	const hoverHintClass =
		'pointer-events-none absolute z-[120] rounded-md bg-neutral px-2 py-0.5 text-[10px] font-medium text-neutral-content opacity-0 shadow-md transition group-hover:opacity-100 group-focus-visible:opacity-100';
	const secondaryButtonClass =
		'btn-ghost border border-base-300 bg-transparent hover:border-primary/30 hover:bg-base-300/30';

	const themeOptions = THEME_OPTIONS.filter((option) => option.id !== 'custom');

	type Props = {
		active?: boolean;
		onDone?: () => void;
	};

	let { active = true, onDone }: Props = $props();

	const user = $derived(
		page.data && typeof page.data === 'object' && 'user' in page.data
			? ((page.data as { user?: { email: string } | null }).user ?? null)
			: null
	);

	let theme = $state<ThemePreference>('system');
	let signingOut = $state(false);

	function refreshFromStorage() {
		let preference = getThemePreference();
		if (preference === 'custom') {
			setThemePreference('system');
			preference = 'system';
		}
		theme = preference;
	}

	$effect(() => {
		if (!active) return;
		refreshFromStorage();
		const stopPreference = subscribeThemePreference(refreshFromStorage);
		return () => stopPreference();
	});

	function selectTheme(next: ThemePreference) {
		if (next === 'custom') return;
		theme = next;
		setThemePreference(next);
	}

	async function signOut() {
		if (signingOut) return;
		signingOut = true;
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			await invalidateAll();
		} finally {
			signingOut = false;
		}
	}
</script>

{#if user}
	<p class="mb-3 truncate text-center text-sm opacity-70">{user.email}</p>
	<button
		type="button"
		class="btn btn-block mb-6 h-12 {secondaryButtonClass}"
		disabled={signingOut}
		onclick={() => void signOut()}
	>
		{signingOut ? 'Signing out…' : 'Sign out'}
	</button>
{:else}
	<a class="btn btn-block mb-6 h-12 {secondaryButtonClass}" href="/login?next=/settings">
		Sign in
	</a>
{/if}

<div class="relative z-40 flex w-full items-start gap-2 pb-9">
	{#each themeOptions as option (option.id)}
		<div class="group relative z-40 min-w-0 flex-1">
			<button
				type="button"
				class="btn h-12 w-full {theme === option.id
					? 'btn-primary'
					: secondaryButtonClass}"
				aria-pressed={theme === option.id}
				aria-label={option.label}
				onclick={() => selectTheme(option.id)}
			>
				{#if option.id === 'light'}
					<IconWeatherSunny class="h-5 w-5" aria-hidden="true" />
				{:else if option.id === 'dark'}
					<IconWeatherNight class="h-5 w-5" aria-hidden="true" />
				{:else}
					<IconLaptop class="h-5 w-5" aria-hidden="true" />
				{/if}
			</button>
			<span
				class="{hoverHintClass} left-1/2 top-full mt-1 w-max max-w-[8.5rem] -translate-x-1/2 py-1 text-center leading-snug group-focus-within:opacity-100"
			>
				{option.label}
			</span>
		</div>
	{/each}
</div>

<button type="button" class="btn btn-block mt-6 h-12 {gloopglopGreenButtonClass}" onclick={() => onDone?.()}>
	Done
</button>
