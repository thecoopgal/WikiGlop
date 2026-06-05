<script lang="ts">
	import CreatorLinkIcon from '$lib/components/CreatorLinkIcon.svelte';
	import {
		canChooseCreatorLinkIcon,
		type CreatorLinkIconMode
	} from '$lib/creator-link-icon';
	import { GLOOPGLOP_DEFAULT_LOGO_URL } from '$lib/glop-link-image';
	import IconCloseCircleOutline from '~icons/mdi/close-circle-outline';

	let {
		href = '',
		mode = 'basic',
		onModeChange,
		disabled = false
	}: {
		href?: string;
		mode?: CreatorLinkIconMode;
		onModeChange: (mode: CreatorLinkIconMode) => void;
		disabled?: boolean;
	} = $props();

	let open = $state(false);

	const canChoose = $derived(canChooseCreatorLinkIcon(href));

	const menuOptions: Array<{ mode: CreatorLinkIconMode; label: string }> = [
		{ mode: 'basic', label: 'Basic Icon' },
		{ mode: 'official', label: 'Official logo' },
		{ mode: 'gloopglop', label: 'GloopGlop icon' },
		{ mode: 'none', label: 'No icon' }
	];

	function toggle(event: MouseEvent) {
		event.stopPropagation();
		if (disabled || !canChoose) return;
		open = !open;
	}

	function select(next: CreatorLinkIconMode, event: MouseEvent) {
		event.stopPropagation();
		onModeChange(next);
		open = false;
	}

	$effect(() => {
		if (!open) return;
		const close = () => {
			open = false;
		};
		const timer = window.setTimeout(() => {
			document.addEventListener('click', close, { once: true });
		}, 0);
		return () => {
			window.clearTimeout(timer);
			document.removeEventListener('click', close);
		};
	});

	$effect(() => {
		href;
		open = false;
	});
</script>

{#snippet optionPreview(optionMode: CreatorLinkIconMode)}
	{#if optionMode === 'none'}
		<IconCloseCircleOutline
			class="h-5 w-5 shrink-0 text-base-content/60"
			aria-hidden="true"
		/>
	{:else if optionMode === 'gloopglop'}
		<img
			src={GLOOPGLOP_DEFAULT_LOGO_URL}
			alt=""
			class="h-5 w-5 shrink-0 rounded object-cover"
			width="20"
			height="20"
			decoding="async"
		/>
	{:else}
		<CreatorLinkIcon {href} mode={optionMode} fallback="form" />
	{/if}
{/snippet}

{#if canChoose}
	<div class="dropdown dropdown-start relative shrink-0 {open ? 'dropdown-open z-50' : ''}">
		<button
			type="button"
			class="btn btn-ghost btn-xs btn-circle h-7 w-7 min-h-0 hover:bg-base-content/10"
			aria-label="Choose link icon style"
			aria-haspopup="menu"
			aria-expanded={open}
			tabindex={disabled ? -1 : undefined}
			onclick={toggle}
		>
			{@render optionPreview(mode)}
		</button>
		<ul
			class="dropdown-content menu menu-horizontal z-[100] mt-1 flex w-auto gap-1 rounded-box border border-base-content/10 bg-base-100 p-2 shadow-lg"
			role="menu"
		>
			{#each menuOptions as option (option.mode)}
				<li role="none">
					<button
						type="button"
						role="menuitemradio"
						aria-checked={mode === option.mode}
						aria-label={option.label}
						title={option.label}
						class="btn btn-ghost btn-sm btn-square h-8 w-8 min-h-0 {mode === option.mode
							? 'bg-base-content/10'
							: ''}"
						onclick={(event) => select(option.mode, event)}
					>
						{@render optionPreview(option.mode)}
					</button>
				</li>
			{/each}
		</ul>
	</div>
{:else}
	<CreatorLinkIcon {href} {mode} fallback="form" />
{/if}
