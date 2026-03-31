<script lang="ts">
	import { onMount } from 'svelte';
	import IconMoon from '~icons/mdi/weather-night';
	import IconSun from '~icons/mdi/white-balance-sunny';

	type Theme = 'light' | 'dark';
	const THEME_KEY = 'wikiglop-theme';

	let theme = $state<Theme>('light');

	function applyTheme(nextTheme: Theme) {
		theme = nextTheme;
		document.documentElement.setAttribute('data-theme', nextTheme);
		localStorage.setItem(THEME_KEY, nextTheme);
	}

	function toggleTheme() {
		applyTheme(theme === 'light' ? 'dark' : 'light');
	}

	onMount(() => {
		const saved = localStorage.getItem(THEME_KEY);
		if (saved === 'light' || saved === 'dark') {
			applyTheme(saved);
			return;
		}

		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		applyTheme(prefersDark ? 'dark' : 'light');
	});
</script>

<div class="min-h-screen bg-base-200">
	<div class="navbar bg-base-100 shadow-sm">
		<div class="navbar-start">
			<a class="btn btn-ghost text-xl" href="/">GloopGlop</a>
		</div>
		<div class="navbar-center hidden md:flex">
			<ul class="menu menu-horizontal px-1">
				<li><a href="#features">Features</a></li>
				<li><a href="#pricing">Pricing</a></li>
				<li><a href="#docs">Docs</a></li>
			</ul>
		</div>
		<div class="navbar-end">
			<button
				class="btn btn-ghost btn-circle mr-2"
				type="button"
				aria-label="Toggle theme"
				onclick={toggleTheme}
			>
				{#if theme === 'dark'}
					<IconSun class="h-5 w-5" />
				{:else}
					<IconMoon class="h-5 w-5" />
				{/if}
			</button>
			<a class="btn btn-primary" href="#get-started">Get Started</a>
		</div>
	</div>

	<section class="hero py-16">
		<div class="hero-content text-center">
			<div class="max-w-2xl">
				<h1 class="text-5xl font-bold">Build fast with SvelteKit + DaisyUI</h1>
				<p class="py-6 text-base-content/80">
					A clean starter website with modern styling, ready for your content, product pages, and
					application features.
				</p>
				<div class="flex flex-wrap justify-center gap-3">
					<a class="btn btn-primary" href="#get-started">Launch Project</a>
					<a class="btn btn-outline" href="https://daisyui.com/components/" target="_blank" rel="noreferrer"
						>View Components</a
					>
				</div>
			</div>
		</div>
	</section>

	<section class="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 pb-16 md:grid-cols-3" id="features">
		<div class="card bg-base-100 shadow-md">
			<div class="card-body">
				<h2 class="card-title">SvelteKit Routing</h2>
				<p>Create pages and layouts quickly with file-based routes.</p>
			</div>
		</div>
		<div class="card bg-base-100 shadow-md">
			<div class="card-body">
				<h2 class="card-title">DaisyUI Components</h2>
				<p>Use polished UI primitives like buttons, cards, navbars, and forms.</p>
			</div>
		</div>
		<div class="card bg-base-100 shadow-md">
			<div class="card-body">
				<h2 class="card-title">Tailwind Utility Power</h2>
				<p>Customize layouts and responsive behavior without leaving your markup.</p>
			</div>
		</div>
	</section>

	<section class="mx-auto max-w-6xl px-6 pb-16" id="pricing">
		<div class="card bg-base-100 shadow-md">
			<div class="card-body text-center">
				<h2 class="card-title mx-auto">Simple pricing</h2>
				<p>Start free, then scale when your project grows.</p>
				<div class="badge badge-primary badge-outline mx-auto">Starter Friendly</div>
			</div>
		</div>
	</section>

	<footer class="footer footer-center bg-base-100 p-6 text-base-content" id="docs">
		<aside>
			<p id="get-started">Built with SvelteKit and DaisyUI.</p>
		</aside>
	</footer>
</div>
