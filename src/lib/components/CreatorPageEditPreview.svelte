<script lang="ts">
	import { browser } from '$app/environment';
	import {
		getThemePreference,
		resolveEffectiveTheme,
		subscribeThemePreference,
		type EffectiveTheme
	} from '$lib/client/theme-preference';
	import {
		LINKS_CREATOR_PROFILE_PICTURE_ACCEPT,
		uploadProfilePicture
	} from '$lib/client/links-create-profile-picture';
	import {
		LINKS_CREATOR_LINK_LABEL_MAX_LENGTH,
		LINKS_CREATOR_LINK_URL_MAX_LENGTH,
		LINKS_CREATOR_NAME_MAX_LENGTH,
		LINKS_CREATOR_NAMES_MAX_COUNT,
		LINKS_CREATOR_PAGE_DESCRIPTION_MAX_LENGTH,
		LINKS_CREATOR_TAGLINE_MAX_LENGTH
	} from '$lib/client/links-create-state';
	import type { CreatorPageEditLink } from '$lib/content-page-edit';
	import CreatorLinkIcon from '$lib/components/CreatorLinkIcon.svelte';
	import { linksCreateEditButtonClass } from '$lib/links-create-edit-button';
	import { GLOOPGLOP_DEFAULT_LOGO_URL } from '$lib/glop-link-image';
	import IconCameraPlus from '~icons/mdi/camera-plus-outline';
	import IconClose from '~icons/mdi/close';
	import IconPencilOutline from '~icons/mdi/pencil-outline';

	type EditSection = 'photo' | 'name' | 'tagline' | 'bio' | 'links';

	let {
		names = $bindable<string[]>(['']),
		tagline = $bindable(''),
		bio = $bindable(''),
		avatar = $bindable(''),
		links = $bindable<CreatorPageEditLink[]>([{ label: '', href: '' }]),
		cardStyle = ''
	}: {
		names?: string[];
		tagline?: string;
		bio?: string;
		avatar?: string;
		links?: CreatorPageEditLink[];
		/** CSS vars for card / button colors (theme overrides). */
		cardStyle?: string;
	} = $props();

	let runtimeTheme = $state<EffectiveTheme>('light');
	let activeNameIndex = $state(0);
	let section = $state<EditSection | null>(null);
	let photoInputEl = $state<HTMLInputElement | null>(null);
	let photoUploading = $state(false);
	let photoError = $state('');

	const pencilClass = $derived(linksCreateEditButtonClass(runtimeTheme));
	const avatarSrc = $derived(avatar.trim() || GLOOPGLOP_DEFAULT_LOGO_URL);

	const nameOptions = $derived.by(() => {
		const out: string[] = [];
		for (const value of names) {
			const trimmed = value.trim();
			if (!trimmed || out.includes(trimmed)) continue;
			out.push(trimmed);
		}
		return out.length > 0 ? out : ['Your name'];
	});

	const displayedName = $derived(nameOptions[activeNameIndex] ?? nameOptions[0] ?? 'Your name');
	const rotatesNames = $derived(nameOptions.length > 1);

	const previewLinks = $derived(
		links.filter((l) => l.href.trim().length > 0).map((l) => ({
			label: l.label.trim() || l.href.trim(),
			href: l.href.trim()
		}))
	);

	const modalTitle = $derived(
		section === 'photo'
			? 'Edit photo'
			: section === 'name'
				? 'Edit names'
				: section === 'tagline'
					? 'Edit tagline'
					: section === 'bio'
						? 'Edit bio'
						: section === 'links'
							? 'Edit links'
							: ''
	);

	$effect(() => {
		if (!browser) return;
		const refresh = () => {
			runtimeTheme = resolveEffectiveTheme(getThemePreference());
		};
		refresh();
		return subscribeThemePreference(refresh);
	});

	$effect(() => {
		nameOptions;
		activeNameIndex = 0;
	});

	$effect(() => {
		if (nameOptions.length <= 1) return;
		const timer = setInterval(() => {
			activeNameIndex = (activeNameIndex + 1) % nameOptions.length;
		}, 2600);
		return () => clearInterval(timer);
	});

	function openSection(next: EditSection) {
		section = next;
	}

	function closeModal() {
		section = null;
	}

	$effect(() => {
		if (!section || !browser) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') closeModal();
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	});

	function addName() {
		if (names.length >= LINKS_CREATOR_NAMES_MAX_COUNT) return;
		names = [...names, ''];
	}

	function removeName(index: number) {
		if (names.length <= 1) return;
		names = names.filter((_, i) => i !== index);
	}

	function addLink() {
		links = [...links, { label: '', href: '' }];
	}

	function removeLink(index: number) {
		links = links.filter((_, i) => i !== index);
		if (links.length === 0) links = [{ label: '', href: '' }];
	}

	function openPhotoPicker() {
		if (photoUploading) return;
		photoError = '';
		photoInputEl?.click();
	}

	async function onPhotoSelected(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		photoUploading = true;
		photoError = '';
		try {
			avatar = await uploadProfilePicture(file);
		} catch (e) {
			photoError = e instanceof Error ? e.message : 'Could not upload that image.';
		} finally {
			photoUploading = false;
		}
	}
</script>

<section class="my-6 w-full text-left">
	<div
		class="gloopglop-card-gradient gloopglop-card-border card relative overflow-visible border shadow-md"
		style={cardStyle || undefined}
	>
		<div class="card-body items-center p-5 text-center sm:p-6">
			<div class="grid w-full grid-cols-1 items-start gap-2 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
				<div class="hidden h-8 w-8 sm:block" aria-hidden="true"></div>

				<div
					class="flex min-w-0 w-full flex-col items-center gap-3 sm:flex-1 sm:flex-row sm:items-center sm:justify-center sm:gap-4"
				>
					<button
						type="button"
						class="group relative h-24 w-24 shrink-0 overflow-hidden rounded-full sm:h-16 sm:w-16"
						aria-label="Edit profile picture"
						onclick={() => openSection('photo')}
					>
						<img
							src={avatarSrc}
							alt=""
							class="h-full w-full object-cover"
							width="96"
							height="96"
							decoding="async"
						/>
						<span
							class="absolute inset-0 flex items-center justify-center bg-base-content/45 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
						>
							<IconPencilOutline class="h-8 w-8 text-base-100 sm:h-6 sm:w-6" aria-hidden="true" />
						</span>
					</button>

					<div class="min-w-0 w-full text-center sm:flex-1 sm:text-left">
						<button
							type="button"
							class="group relative w-full min-w-0 rounded-lg text-left"
							aria-label="Edit names"
							onclick={() => openSection('name')}
						>
							<h2
								class="profile-name-heading w-full min-w-0 max-w-full text-xl font-bold sm:text-2xl"
								class:grid={rotatesNames}
								class:grid-cols-1={rotatesNames}
							>
								{#if rotatesNames}
									{#each nameOptions as option (option)}
										<span
											class="profile-name-measure invisible col-start-1 row-start-1 block min-w-0 max-w-full pointer-events-none select-none"
											aria-hidden="true"
										>{option}</span>
									{/each}
								{/if}
								{#key activeNameIndex}
									<span
										class="profile-name-measure block min-w-0 max-w-full profile-name-anim profile-name-anim-fade"
										class:col-start-1={rotatesNames}
										class:row-start-1={rotatesNames}
									>{displayedName}</span>
								{/key}
							</h2>
							<span
								class="absolute right-0 top-1/2 z-10 -translate-y-1/2 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
							>
								<span class={pencilClass}>
									<IconPencilOutline class="h-4 w-4 shrink-0" aria-hidden="true" />
								</span>
							</span>
						</button>

						<button
							type="button"
							class="group relative mx-auto mt-3 block w-full max-w-sm rounded-lg text-left sm:mx-0 sm:mt-5"
							aria-label="Edit tagline"
							onclick={() => openSection('tagline')}
						>
							<p class="gloopglop-subheading w-full text-sm opacity-80 sm:text-left">
								{tagline.trim() || 'Add a tagline'}
							</p>
							<span
								class="absolute right-0 top-1/2 z-10 -translate-y-1/2 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
							>
								<span class={pencilClass}>
									<IconPencilOutline class="h-4 w-4 shrink-0" aria-hidden="true" />
								</span>
							</span>
						</button>
					</div>
				</div>
			</div>

			<button
				type="button"
				class="group relative mx-auto mt-3 block w-full max-w-md rounded-lg text-left"
				aria-label="Edit bio"
				onclick={() => openSection('bio')}
			>
				<p
					class="gloopglop-text-box-text w-full whitespace-pre-line text-center text-sm opacity-80"
					class:min-h-8={!bio.trim()}
				>
					{bio.trim() || 'Add a bio'}
				</p>
				<span
					class="absolute bottom-0 right-0 z-10 translate-x-1/4 translate-y-1/4 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
				>
					<span class={pencilClass}>
						<IconPencilOutline class="h-4 w-4 shrink-0" aria-hidden="true" />
					</span>
				</span>
			</button>

			<div class="mt-3 flex w-full justify-center">
				<div
					class="gloopglop-share-background gloopglop-share-border gloopglop-button-text btn btn-sm pointer-events-none rounded-full border"
					aria-hidden="true"
				>
					Share profile
				</div>
			</div>

			<div class="relative mx-auto mt-5 flex w-full max-w-md flex-col gap-2">
				<button
					type="button"
					class="{pencilClass} absolute -top-1 right-0 z-10"
					aria-label="Edit links"
					onclick={() => openSection('links')}
				>
					<IconPencilOutline class="h-4 w-4 shrink-0" aria-hidden="true" />
				</button>

				{#each previewLinks as link (link.label + link.href)}
					<button
						type="button"
						class="gloopglop-link-background gloopglop-link-border btn btn-sm btn-outline h-auto min-h-10 w-full min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2 font-medium normal-case"
						onclick={() => openSection('links')}
					>
						<CreatorLinkIcon href={link.href} mode="basic" fallback="link" />
						<span class="gloopglop-link-text truncate text-center text-xs leading-tight"
							>{link.label}</span
						>
					</button>
				{:else}
					<button
						type="button"
						class="btn btn-outline btn-sm h-auto min-h-10 w-full rounded-xl border-dashed normal-case opacity-70"
						onclick={() => openSection('links')}
					>
						Add links
					</button>
				{/each}
			</div>
		</div>
	</div>
</section>

{#if section}
	<div class="modal modal-open" role="dialog" aria-modal="true" aria-label={modalTitle}>
		<button
			type="button"
			class="modal-backdrop bg-black/40"
			aria-label="Close"
			onclick={closeModal}
		></button>
		<div class="modal-box max-w-md">
			<div class="mb-4 flex items-center justify-between gap-3">
				<h3 class="text-lg font-bold">{modalTitle}</h3>
				<button type="button" class="btn btn-ghost btn-sm btn-circle" onclick={closeModal}>
					<IconClose class="h-5 w-5" aria-hidden="true" />
				</button>
			</div>

			{#if section === 'photo'}
				<input
					bind:this={photoInputEl}
					type="file"
					accept={LINKS_CREATOR_PROFILE_PICTURE_ACCEPT}
					class="sr-only"
					tabindex={-1}
					onchange={(event) => void onPhotoSelected(event)}
				/>
				<div class="flex flex-col items-center">
					<button
						type="button"
						class="group relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-base-content/20 bg-base-100 shadow-sm transition hover:border-primary/40"
						aria-label="Upload profile picture"
						disabled={photoUploading}
						onclick={openPhotoPicker}
					>
						<img
							src={avatarSrc}
							alt=""
							class="h-full w-full object-cover"
							width="144"
							height="144"
							decoding="async"
						/>
						<span
							class="absolute inset-0 flex items-center justify-center bg-base-content/45 opacity-0 transition group-hover:opacity-100"
						>
							<IconCameraPlus class="h-10 w-10 text-base-100" aria-hidden="true" />
						</span>
					</button>
					<button
						type="button"
						class="btn btn-primary btn-sm mt-4"
						disabled={photoUploading}
						onclick={openPhotoPicker}
					>
						{photoUploading ? 'Uploading…' : 'Upload photo'}
					</button>
					{#if photoUploading}
						<p class="mt-3 text-sm opacity-70">Uploading to Cloudflare Images…</p>
					{:else if photoError}
						<p class="mt-3 text-sm text-error">{photoError}</p>
					{:else}
						<p class="mt-3 text-center text-xs opacity-60">
							JPEG, PNG, WebP, or GIF. Saved as a hosted image URL.
						</p>
					{/if}
				</div>
			{:else if section === 'name'}
				<div class="flex flex-col gap-2">
					{#each names as _name, i (i)}
						<div class="flex gap-2">
							<input
								class="input input-bordered w-full"
								bind:value={names[i]}
								placeholder="Display name"
								maxlength={LINKS_CREATOR_NAME_MAX_LENGTH}
							/>
							{#if names.length > 1}
								<button type="button" class="btn btn-ghost btn-square" onclick={() => removeName(i)}>
									×
								</button>
							{/if}
						</div>
					{/each}
				</div>
				{#if names.length < LINKS_CREATOR_NAMES_MAX_COUNT}
					<button type="button" class="btn btn-ghost btn-sm mt-2" onclick={addName}>Add name</button>
				{/if}
			{:else if section === 'tagline'}
				<input
					class="input input-bordered w-full"
					bind:value={tagline}
					placeholder="Short tagline"
					maxlength={LINKS_CREATOR_TAGLINE_MAX_LENGTH}
				/>
			{:else if section === 'bio'}
				<textarea
					class="textarea textarea-bordered min-h-28 w-full"
					bind:value={bio}
					placeholder="About you"
					maxlength={LINKS_CREATOR_PAGE_DESCRIPTION_MAX_LENGTH}
				></textarea>
			{:else if section === 'links'}
				<div class="flex flex-col gap-3">
					{#each links as _link, i (i)}
						<div class="flex flex-col gap-2 rounded-box border border-base-300 p-3">
							<input
								class="input input-bordered input-sm w-full"
								bind:value={links[i].label}
								placeholder="Label"
								maxlength={LINKS_CREATOR_LINK_LABEL_MAX_LENGTH}
							/>
							<input
								class="input input-bordered input-sm w-full"
								bind:value={links[i].href}
								placeholder="https://…"
								maxlength={LINKS_CREATOR_LINK_URL_MAX_LENGTH}
							/>
							<button
								type="button"
								class="btn btn-ghost btn-xs self-end"
								onclick={() => removeLink(i)}
							>
								Remove
							</button>
						</div>
					{/each}
				</div>
				<button type="button" class="btn btn-ghost btn-sm mt-2" onclick={addLink}>Add link</button>
			{/if}

			<div class="modal-action">
				<button type="button" class="btn btn-primary" onclick={closeModal}>Done</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.profile-name-heading {
		line-height: 1.2;
	}
	.profile-name-measure {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.profile-name-anim-fade {
		animation: profile-name-fade 0.45s ease;
	}
	@keyframes profile-name-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
