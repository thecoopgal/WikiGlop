<script lang="ts">
	import { GLOOPGLOP_DEFAULT_LOGO_URL } from '$lib/glop-link-image';
	import IconYoutube from '~icons/mdi/youtube';
	import IconTiktok from '~icons/simple-icons/tiktok';

	export type UploadDestinationId = 'gloopglop' | 'youtube' | 'tiktok';

	const {
		selected,
		onSelectedChange,
		disabled = false,
		googleConnected = false,
		googleConfigured = true,
		compact = false
	}: {
		selected: Set<UploadDestinationId>;
		onSelectedChange: (next: Set<UploadDestinationId>) => void;
		disabled?: boolean;
		googleConnected?: boolean;
		googleConfigured?: boolean;
		compact?: boolean;
	} = $props();

	const options: Array<{
		id: UploadDestinationId;
		label: string;
		comingSoon?: boolean;
		alwaysOn?: boolean;
	}> = [
		{ id: 'gloopglop', label: 'GloopGlop', alwaysOn: true },
		{ id: 'youtube', label: 'YouTube' },
		{ id: 'tiktok', label: 'TikTok', comingSoon: true }
	];

	function isSelected(id: UploadDestinationId): boolean {
		return selected.has(id);
	}

	function toggle(id: UploadDestinationId) {
		if (disabled) return;
		const opt = options.find((o) => o.id === id);
		if (opt?.alwaysOn || opt?.comingSoon) return;

		const next = new Set(selected);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		onSelectedChange(next);
	}
</script>

<fieldset class="w-full {compact ? 'mt-2' : ''}">
	<legend class="mb-3 text-sm font-semibold text-base-content/80">Upload to:</legend>
	<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
		{#each options as opt (opt.id)}
			{@const on = isSelected(opt.id)}
			{@const locked = opt.alwaysOn || opt.comingSoon}
			<button
				type="button"
				class="btn flex-1 justify-start gap-2 sm:min-w-[9rem] {on && !opt.comingSoon
					? 'btn-primary'
					: 'btn-outline'} {opt.comingSoon ? 'btn-disabled opacity-60' : ''}"
				disabled={disabled || locked}
				aria-pressed={on}
				onclick={() => toggle(opt.id)}
			>
				{#if opt.id === 'gloopglop'}
					<img
						src={GLOOPGLOP_DEFAULT_LOGO_URL}
						alt=""
						class="size-5 shrink-0 rounded object-cover"
						width="20"
						height="20"
					/>
				{:else if opt.id === 'youtube'}
					<IconYoutube class="size-5 shrink-0 text-[#FF0000]" aria-hidden="true" />
				{:else}
					<IconTiktok class="size-5 shrink-0" aria-hidden="true" />
				{/if}
				<span class="min-w-0 truncate">{opt.label}</span>
				{#if opt.comingSoon}
					<span class="badge badge-ghost badge-sm ml-auto">Soon</span>
				{:else if opt.id === 'youtube' && on && googleConfigured && !googleConnected}
					<span class="badge badge-warning badge-sm ml-auto">Sign in</span>
				{/if}
			</button>
		{/each}
	</div>
	{#if !compact && selected.has('youtube') && googleConfigured && !googleConnected}
		<p class="mt-2 text-xs text-base-content/60">
			You’ll connect Google after your video finishes uploading.
		</p>
	{/if}
</fieldset>
