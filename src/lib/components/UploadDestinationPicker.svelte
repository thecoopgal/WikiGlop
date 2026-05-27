<script lang="ts" module>
	export type UploadDestinationId = 'gloopglop' | 'youtube' | 'tiktok';
</script>

<script lang="ts">
	import { GLOOPGLOP_DEFAULT_LOGO_URL } from '$lib/glop-link-image';
	import IconYoutube from '~icons/mdi/youtube';
	import IconTiktok from '~icons/simple-icons/tiktok';
	import IconCheck from '~icons/mdi/check-circle';

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

	const optionalOptions: Array<{
		id: Exclude<UploadDestinationId, 'gloopglop'>;
		label: string;
		comingSoon?: boolean;
	}> = [
		{ id: 'youtube', label: 'YouTube' },
		{ id: 'tiktok', label: 'TikTok', comingSoon: true }
	];

	$effect(() => {
		if (!selected.has('gloopglop')) {
			const next = new Set(selected);
			next.add('gloopglop');
			onSelectedChange(next);
		}
	});

	function toggle(id: Exclude<UploadDestinationId, 'gloopglop'>) {
		if (disabled) return;
		const opt = optionalOptions.find((o) => o.id === id);
		if (opt?.comingSoon) return;

		const next = new Set(selected);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		next.add('gloopglop');
		onSelectedChange(next);
	}
</script>

<fieldset class="w-full {compact ? 'mt-2' : ''}">
	<legend class="mb-3 text-sm font-semibold text-base-content/80">Upload to:</legend>
	<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
		<div
			class="btn btn-primary flex-1 cursor-default justify-start gap-2 sm:min-w-[9rem]"
			aria-label="GloopGlop — always included"
		>
			<img
				src={GLOOPGLOP_DEFAULT_LOGO_URL}
				alt=""
				class="size-5 shrink-0 rounded object-cover"
				width="20"
				height="20"
			/>
			<span class="min-w-0 truncate">GloopGlop</span>
			<span class="badge badge-sm ml-auto border-0 bg-primary-content/20 text-primary-content">
				Always included
			</span>
			<IconCheck class="size-5 shrink-0 opacity-90" aria-hidden="true" />
		</div>

		{#each optionalOptions as opt (opt.id)}
			{@const on = selected.has(opt.id)}
			<button
				type="button"
				class="btn flex-1 justify-start gap-2 sm:min-w-[9rem] {on && !opt.comingSoon
					? 'btn-primary'
					: 'btn-outline'} {opt.comingSoon ? 'btn-disabled opacity-60' : ''}"
				disabled={disabled || opt.comingSoon}
				aria-pressed={on}
				onclick={() => toggle(opt.id)}
			>
				{#if opt.id === 'youtube'}
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
	{#if !compact}
		<p class="mt-2 text-xs text-base-content/60">
			Every upload is saved on GloopGlop (Cloudflare Stream). Toggle YouTube to also publish there.
		</p>
	{/if}
	{#if !compact && selected.has('youtube') && googleConfigured && !googleConnected}
		<p class="mt-1 text-xs text-base-content/60">
			You’ll connect Google after your video finishes uploading.
		</p>
	{/if}
</fieldset>
