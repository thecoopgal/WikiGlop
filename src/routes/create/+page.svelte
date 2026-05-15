<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Icons8BoogerAttribution from '$lib/components/Icons8BoogerAttribution.svelte';
	import { fade, fly } from 'svelte/transition';
	import type { PageData } from './$types';
	import IconInstagram from '~icons/mdi/instagram';
	import IconLinkedin from '~icons/mdi/linkedin';
	import IconFacebook from '~icons/mdi/facebook';
	import IconYoutube from '~icons/mdi/youtube';
	import IconTiktok from '~icons/simple-icons/tiktok';
	import IconThreadsFallback from '~icons/mdi/at';
	import IconWeb from '~icons/mdi/web';
	import IconLink from '~icons/mdi/link-variant';

	type LinkItem = { label: string; href: string };
	type TopicItem = { id: string; label: string; default: boolean };
	const { data } = $props<{ data: PageData }>();

let creatorName = $state('');
let creatorHandle = $state('');
	let additionalCreatorNames = $state<string[]>([]);
	let shortSlug = $state('');
	let avatarUrl = $state('');
	let avatarUploadName = $state('');
	let avatarPreviewUrl = $state('');
	let avatarFileInput = $state<HTMLInputElement | null>(null);
	let tagline = $state('Creator on GloopGlop');
	let bio = $state('Welcome to my creator page.');
	let profileTheme = $state('gloopglop');
	let links = $state<LinkItem[]>([
		{ label: '', href: '' }
	]);
	let focusedLinkField = $state<{ index: number; field: 'label' | 'href' } | null>(null);
	let linkTitleInputs = $state<Array<HTMLInputElement | null>>([]);
	let topics = $state<TopicItem[]>([
		{ id: 'go_live', label: 'Go Live', default: true },
		{ id: 'updates', label: 'Updates', default: true }
	]);
	let copyState = $state<'idle' | 'copied' | 'error'>('idle');
	let step = $state(0);
	let touched = $state(false);
	let showIntro = $state(true);
	let showOneMomentText = $state(true);
	let introMessageIndex = $state(0);
	let oneMomentDots = $state(0);
	let showOkayText = $state(false);
	let showTitleText = $state(false);
	let okaySubline = $state('Gloops have been Glopped');
	/** True while the header should show the small booger inside a spinning ring (intro, “Okay”, or explicit async work). */
	let headerAsyncBusy = $state(false);

	const INTRO_MS = 2200;
	const INTRO_ICON_URL =
		'https://img.icons8.com/color/96/booger.png';
	const introMessages = [
		'Warming up the cooperative glue...',
		'Syncing gloop with glop...',
		'Gathering friendly neighborhood links...',
		'Polishing your future creator card...',
		'Brewing one fresh batch of co-op magic...'
	];

	onMount(() => {
		const messageTimer = setInterval(() => {
			introMessageIndex = (introMessageIndex + 1) % introMessages.length;
		}, 450);
		let dotsTimer: ReturnType<typeof setTimeout> | null = null;
		const scheduleDots = () => {
			const delay = oneMomentDots === 3 ? 1000 : 250;
			dotsTimer = setTimeout(() => {
				oneMomentDots = (oneMomentDots + 1) % 4;
				scheduleDots();
			}, delay);
		};
		scheduleDots();
		let swapTimer: ReturnType<typeof setTimeout> | null = null;
		let titleTimer: ReturnType<typeof setTimeout> | null = null;
		const doneTimer = setTimeout(() => {
			void (async () => {
				// Fade out "One moment..." first, then fade in "Okay".
				showOneMomentText = false;
				const introSwapTimer = setTimeout(async () => {
					clearInterval(messageTimer);
					showIntro = false;
					showOkayText = false;
					showTitleText = false;
					// Ensure the intro->form swap happens in two paints so fade transitions run.
					await tick();
					okaySubline =
						Math.random() < 0.5 ? 'Gloops have been Glopped' : 'Glops have been Glooped';
					showOkayText = true;

					// Keep "Okay" visible for 1.5 seconds, then fade out and show title.
					swapTimer = setTimeout(() => {
						showOkayText = false;
						titleTimer = setTimeout(() => {
							showTitleText = true;
						}, 400);
					}, 1500);
				}, 400);
				titleTimer = introSwapTimer;
			})();
		}, INTRO_MS);
		return () => {
			clearInterval(messageTimer);
			clearTimeout(doneTimer);
			if (swapTimer) clearTimeout(swapTimer);
			if (titleTimer) clearTimeout(titleTimer);
			if (dotsTimer) clearTimeout(dotsTimer);
			if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
		};
	});

	function normalizeId(v: string): string {
		return v.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
	}

	function slugify(v: string): string {
		return normalizeId(v).replace(/_/g, '-');
	}

	function normalizeHandle(v: string): string {
		return v.trim().toLowerCase();
	}

	const MAX_CREATOR_NAMES = 5;
	const MAX_TAGLINE_LENGTH = 80;

	function normalizePrimaryCreatorName(v: string): string {
		const trimmed = v.trim();
		if (!trimmed) return '';
		return trimmed.startsWith('@') ? trimmed : `@${trimmed.replace(/^@+/, '')}`;
	}

	function defaultCreatorNameFromHandle(handle: string): string {
		const trimmed = handle.trim();
		if (!trimmed) return '';
		return `@${trimmed.replace(/^@+/, '')}`;
	}

	function addAdditionalCreatorName() {
		if (additionalCreatorNames.length >= MAX_CREATOR_NAMES - 1) return;
		additionalCreatorNames = [...additionalCreatorNames, ''];
	}

	function updateAdditionalCreatorName(i: number, value: string) {
		additionalCreatorNames = additionalCreatorNames.map((name, idx) => (idx === i ? value : name));
	}

	function removeAdditionalCreatorName(i: number) {
		additionalCreatorNames = additionalCreatorNames.filter((_, idx) => idx !== i);
	}

	function q(v: string): string {
		return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
	}

	function addLink() {
		links = [...links, { label: '', href: '' }];
	}

	function updateLink(i: number, patch: Partial<LinkItem>) {
		links = links.map((l, idx) => (idx === i ? { ...l, ...patch } : l));
	}

	function removeLink(i: number) {
		links = links.filter((_, idx) => idx !== i);
	}

	function inferLinkIcon(href: string): string {
		const raw = href.trim().toLowerCase();
		if (!raw) return 'link';
		let host = raw;
		try {
			host = new URL(raw).hostname.toLowerCase();
		} catch {
			host = raw;
		}
		if (host.includes('instagram.com')) return 'instagram';
		if (host.includes('tiktok.com')) return 'tiktok';
		if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
		if (host.includes('facebook.com') || host.includes('fb.com')) return 'facebook';
		if (host.includes('threads.net')) return 'threads';
		if (host.includes('linkedin.com')) return 'linkedin';
		if (host.includes('x.com') || host.includes('twitter.com')) return 'threads';
		return 'web';
	}

	function linkIconComponent(icon: string) {
		switch (icon) {
			case 'instagram':
				return IconInstagram;
			case 'tiktok':
				return IconTiktok;
			case 'youtube':
				return IconYoutube;
			case 'facebook':
				return IconFacebook;
			case 'threads':
				return IconThreadsFallback;
			case 'linkedin':
				return IconLinkedin;
			case 'web':
				return IconWeb;
			default:
				return IconLink;
		}
	}

	function isLinkInUrlMode(index: number): boolean {
		return focusedLinkField?.index === index && focusedLinkField?.field === 'href';
	}

	function isLinkComplete(link: LinkItem): boolean {
		return !!link.label.trim() && !!link.href.trim();
	}

	function isLinkInTitleMode(index: number, link: LinkItem): boolean {
		if (focusedLinkField?.index === index && focusedLinkField.field === 'label') return true;
		if (focusedLinkField?.index === index && focusedLinkField.field === 'href') return false;
		return !isLinkComplete(link);
	}

	function linkLeftWidthClass(index: number): string {
		const focused = focusedLinkField;
		if (!focused || focused.index !== index) return 'basis-1/2';
		return focused.field === 'label' ? 'basis-[65%]' : 'basis-[38%]';
	}

	function linkRightWidthClass(index: number): string {
		const focused = focusedLinkField;
		if (!focused || focused.index !== index) return 'basis-1/2';
		return focused.field === 'label' ? 'basis-[35%]' : 'basis-[62%]';
	}

	async function focusLinkTitleField(index: number) {
		focusedLinkField = { index, field: 'label' };
		await tick();
		linkTitleInputs[index]?.focus();
	}

	function addTopic() {
		topics = [...topics, { id: '', label: '', default: false }];
	}

	function updateTopic(i: number, patch: Partial<TopicItem>) {
		topics = topics.map((t, idx) => (idx === i ? { ...t, ...patch } : t));
	}

	function removeTopic(i: number) {
		topics = topics.filter((_, idx) => idx !== i);
	}

	const isHeaderLoading = $derived.by(
		() => headerAsyncBusy || showIntro || (step === 0 && !showTitleText)
	);

	const normalizedCreatorHandle = $derived.by(() => normalizeHandle(creatorHandle));
	const isCreatorHandleValid = $derived.by(() => /^[a-z0-9-]+$/.test(normalizedCreatorHandle));
	const isCreatorHandleTaken = $derived.by(() =>
		!!normalizedCreatorHandle && (data.takenHandles ?? []).includes(normalizedCreatorHandle)
	);
	const normalizedShortSlug = $derived.by(() => normalizeId(shortSlug));
	const isShortSlugTooShort = $derived.by(
		() => nonEmpty(normalizedShortSlug) && normalizedShortSlug.length < 3
	);
	const isShortSlugTaken = $derived.by(() =>
		!!normalizedShortSlug && (data.takenHandles ?? []).includes(normalizedShortSlug)
	);
const canAdvanceFromName = $derived.by(
	() => active.id === 'name' && nonEmpty(normalizedCreatorHandle) && isCreatorHandleValid && !isCreatorHandleTaken
);
	const siteId = $derived.by(
		() =>
			(isCreatorHandleValid && !isCreatorHandleTaken ? normalizedCreatorHandle : '') ||
			slugify(creatorName) ||
			'newcreator'
	);
	const creatorNames = $derived.by(() => {
		const unique: string[] = [];
		const all = [normalizePrimaryCreatorName(creatorName), ...additionalCreatorNames.map((n) => n.trim())];
		for (const value of all) {
			if (!value) continue;
			if (unique.includes(value)) continue;
			unique.push(value);
			if (unique.length >= MAX_CREATOR_NAMES) break;
		}
		return unique;
	});
	const creatorPathName = $derived.by(() => creatorNames[0] || siteId);
	const safeShortSlug = $derived.by(() => normalizeId(shortSlug) || siteId.slice(0, 3));
	const names = $derived.by(() => creatorNames);
	const taglineTrimmed = $derived.by(() => tagline.trim());
	const isTaglineTooLong = $derived.by(() => tagline.length > MAX_TAGLINE_LENGTH);

	const cleanLinks = $derived.by(() =>
		links
			.map((l) => ({
				label: l.label.trim(),
				href: l.href.trim(),
				icon: inferLinkIcon(l.href)
			}))
			.filter((l) => l.label && l.href)
	);

	const cleanTopics = $derived.by(() =>
		topics
			.map((t) => ({
				id: normalizeId(t.id),
				label: t.label.trim(),
				default: !!t.default
			}))
			.filter((t) => t.id && t.label)
	);

	const siteYaml = $derived.by(
		() => `id: ${siteId}
name: ${creatorPathName}
hosts:
  - ${siteId}.localhost
  - 127.0.0.1
  - ${siteId}.gloopglop.com
  - www.${siteId}.gloopglop.com
  - ${siteId}.gloop.gg
  - www.${siteId}.gloop.gg

kind: platform

theme:
  preset: gloopglop
  mode: light
  overrides:

routing:
  default_page: index
  gloop_gg_short_slug: ${safeShortSlug}

permissions:
  view: public
  propose: members
  edit: restricted
  edit_mode: proposal_required
`
	);

	const pageYaml = $derived.by(() => {
		const namesYaml =
			names.length > 1
				? `    names:
${names.map((n) => `      - ${q(n)}`).join('\n')}
`
				: '';

		const topicsYaml = cleanTopics.length
			? `  topics:
${cleanTopics
	.map(
		(t) => `    - id: ${t.id}
      label: ${q(t.label)}
      default: ${t.default ? 'true' : 'false'}`
	)
	.join('\n')}
`
			: '  topics: []\n';

		return `id: index
title: ${creatorPathName}
path: /
layout: creator_links

seo:
  title: ${creatorPathName}
  description: Creator bio and links.
${avatarUrl.trim() ? `  image: ${avatarUrl.trim()}\n` : ''}
page_settings:
  show_header: true
  show_footer: true
  max_width: sm

notifications:
  enabled: true
  title: Follow ${creatorPathName}
  description: Choose what updates you want.
${topicsYaml}
blocks:
  - type: creator_profile
    id: profile
    name: ${q(creatorPathName)}
${namesYaml}    name_animation: all
    profile_theme: ${profileTheme}
    tagline: ${q(tagline.trim())}
${avatarUrl.trim() ? `    avatar: ${avatarUrl.trim()}\n` : ''}    bio: |
      ${bio.trim() || 'Welcome to my creator page.'}
    short_links:
${cleanLinks.map((l) => `      - label: ${q(l.label)}
        icon: ${l.icon}
        href: ${l.href}`).join('\n')}
`;
	});

	const combinedYaml = $derived.by(
		() =>
			`# content/sites/${siteId}/site.yaml\n${siteYaml}\n# content/sites/${siteId}/pages/index.yaml\n${pageYaml}`
	);

	type StepId =
		| 'name'
		| 'handle'
		| 'slug'
		| 'avatar'
		| 'tagline'
		| 'bio'
		| 'theme'
		| 'links'
		| 'review';

	const steps = $derived.by(
		() =>
			[
				{ id: 'name', title: 'What URL do you want?', kicker: 'Your brand, your choice' },
				{ id: 'handle', title: 'What name should we show?', kicker: 'This is your page title and primary display name.' },
				{
					id: 'slug',
					title: 'Choose a short slug',
					kicker: 'This will be your short URL that makes it easier to share your amazingness'
				},
				{ id: 'avatar', title: 'Upload a profile picuture', kicker: 'Let everyone know your vibe' },
				{ id: 'tagline', title: 'Choose a tagline', kicker: 'Short and skimmable. Shows under your name.' },
				{ id: 'bio', title: 'Write a quick bio', kicker: 'A few lines is perfect.' },
				{ id: 'theme', title: 'Pick a vibe', kicker: 'Choose the theme preset for your profile block.' },
				{ id: 'links', title: 'Add your links', kicker: 'Socials, shops, you can gloop anything!' },
				{ id: 'review', title: 'Review & copy', kicker: 'Copy the generated YAML and you’re done.' }
			] as { id: StepId; title: string; kicker: string }[]
	);

	const active = $derived.by(() => steps[Math.min(step, steps.length - 1)]);
	const progressPct = $derived.by(() => Math.round((step / (steps.length - 1)) * 100));

	function nonEmpty(v: string) {
		return v.trim().length > 0;
	}

	function isValidFor(id: StepId): boolean {
		switch (id) {
			case 'name':
				return nonEmpty(normalizedCreatorHandle) && isCreatorHandleValid && !isCreatorHandleTaken;
			case 'handle':
				return nonEmpty(normalizePrimaryCreatorName(creatorName).replace(/^@/, ''));
			case 'slug':
				return nonEmpty(normalizedShortSlug) && normalizedShortSlug.length >= 3 && !isShortSlugTaken;
			case 'avatar':
				return true;
			case 'tagline':
				return nonEmpty(taglineTrimmed) && !isTaglineTooLong;
			case 'bio':
				return nonEmpty(bio);
			case 'theme':
				return nonEmpty(profileTheme);
			case 'links': {
				const cl = cleanLinks;
				return cl.length > 0;
			}
			case 'review':
				return true;
		}
	}

	const canNext = $derived.by(() => isValidFor(active.id));
	const canBack = $derived.by(() => step > 0);
	const isLast = $derived.by(() => step >= steps.length - 1);

	async function goNext() {
		touched = true;
		if (!canNext) return;

		if (active.id === 'name' && !creatorName.trim()) {
			creatorName = defaultCreatorNameFromHandle(creatorHandle);
		}
		if (active.id === 'name' && !shortSlug.trim()) {
			shortSlug = normalizeId(creatorHandle);
		}

		step = Math.min(step + 1, steps.length - 1);
		touched = false;
	}

	function onCreatorHandleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;
		event.preventDefault();
		if (canAdvanceFromName) {
			void goNext();
		}
	}

	function onCreatorNameKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;
		event.preventDefault();
		if (active.id === 'handle' && canNext) {
			void goNext();
		}
	}

	function onPrimaryCreatorNameKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;
		event.preventDefault();
		const input = event.currentTarget as HTMLInputElement;
		const normalized = normalizePrimaryCreatorName(input.value);
		creatorName = normalized;
		if (active.id === 'handle' && nonEmpty(normalized.replace(/^@/, ''))) {
			void goNext();
		}
	}

	function onShortSlugKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;
		event.preventDefault();
		if (active.id === 'slug' && canNext) {
			void goNext();
		}
	}

	function onTaglineKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;
		event.preventDefault();
		if (active.id === 'tagline' && canNext) {
			void goNext();
		}
	}

	function onBioKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			if (active.id === 'bio' && canNext) {
				void goNext();
			}
		}
	}

	function onStepFieldEnterKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;
		event.preventDefault();
		if (!isLast && canNext) {
			void goNext();
		}
	}

	function onAvatarUploadChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		avatarUploadName = file?.name ?? '';
		if (avatarPreviewUrl) {
			URL.revokeObjectURL(avatarPreviewUrl);
			avatarPreviewUrl = '';
		}
		if (file) {
			avatarPreviewUrl = URL.createObjectURL(file);
		}
	}

	function triggerAvatarUpload() {
		avatarFileInput?.click();
	}

	function clearAvatarUpload() {
		avatarUploadName = '';
		if (avatarPreviewUrl) {
			URL.revokeObjectURL(avatarPreviewUrl);
			avatarPreviewUrl = '';
		}
		if (avatarFileInput) {
			avatarFileInput.value = '';
		}
	}

	function goBack() {
		step = Math.max(step - 1, 0);
		touched = false;
	}

	async function copyAllYaml() {
		try {
			await navigator.clipboard.writeText(combinedYaml);
			copyState = 'copied';
			setTimeout(() => {
				copyState = 'idle';
			}, 2000);
		} catch {
			copyState = 'error';
		}
	}
</script>

<svelte:head>
	<title>Create Page Builder</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-gradient-to-b from-base-200 via-base-200 to-base-300/40">
	<main class="flex flex-1 items-center justify-center px-4 py-8 md:px-6 md:py-12">
		<div class="mx-auto flex w-full max-w-[800px] flex-col gap-3 md:items-center">
			<div class="w-full shrink-0 md:w-[500px]">
				<div class="flex items-center justify-between text-xs opacity-70">
					<span>{step + 1} / {steps.length}</span>
					<span>{progressPct}%</span>
				</div>
				<progress class="progress progress-primary mt-2 w-full" value={progressPct} max="100"></progress>
			</div>

			<div class="card w-full min-h-screen shrink-0 rounded-none border-0 bg-base-100 shadow-none md:h-[500px] md:w-[500px] md:min-h-0 md:rounded-3xl md:border md:border-base-300 md:shadow-md">
				<div class="card-body grid h-full min-h-0 grid-rows-[1fr_auto_1fr] p-5 md:p-6">
					<div class="min-h-0" aria-hidden="true"></div>
					<header class="flex w-full shrink-0 flex-col items-center text-center">
						<div
							class="relative mx-auto mb-5 grid h-24 w-24 shrink-0 place-items-center overflow-visible rounded-full border-4 border-primary/20 transition-[border-color] duration-300 {isHeaderLoading
								? 'border-t-primary animate-spin'
								: ''}"
						>
							<img
								src={INTRO_ICON_URL}
								alt="GloopGlop booger icon"
								class="h-10 w-10 origin-center object-contain transition-transform duration-300 ease-out will-change-transform {isHeaderLoading
									? 'scale-100'
									: 'scale-[2]'}"
							/>
						</div>
						<div class="mb-6 w-full min-h-[7.75rem] text-center">
							{#if showIntro}
								{#if showOneMomentText}
									<div in:fade={{ duration: 400 }} out:fade={{ duration: 400 }}>
										<h2 class="text-2xl font-extrabold tracking-tight">One moment{'.'.repeat(oneMomentDots)}</h2>
										<p class="mt-3 min-h-[2.75rem] text-sm leading-snug opacity-75">{introMessages[introMessageIndex]}</p>
									</div>
								{/if}
							{:else}
								<div class="min-h-[2.25rem] flex items-center justify-center">
									{#if step === 0}
										{#if showOkayText}
											<h2 in:fade={{ duration: 400 }} out:fade={{ duration: 400 }} class="text-2xl font-extrabold tracking-tight">
												Okay
											</h2>
										{:else if showTitleText}
											<h2 in:fade={{ duration: 400 }} out:fade={{ duration: 400 }} class="text-2xl font-bold">
												{active.title}
											</h2>
										{/if}
									{:else}
										<h2 class="text-2xl font-bold">{active.title}</h2>
									{/if}
								</div>
								<div class="mt-2 min-h-[1.5rem] flex items-center justify-center">
									{#if step === 0 && showOkayText}
										<p in:fade={{ duration: 400 }} out:fade={{ duration: 400 }} class="text-sm opacity-75">
											{okaySubline}
										</p>
									{:else if step !== 0 && active.kicker}
										<p class="text-xs font-semibold tracking-wide text-primary/80">{active.kicker}</p>
									{/if}
								</div>
							{/if}
						</div>
					</header>

					<div class="min-h-0 w-full overflow-y-auto overscroll-contain">
					{#if !showIntro}
						{#if step !== 0 || showTitleText}
							<div transition:fade={{ duration: 400 }}>
								{#key active.id}
									<div in:fly={{ y: 18, duration: 260 }} out:fly={{ y: -14, duration: 200 }}>
									{#if active.id === 'name'}
						<label class="form-control relative">
							<div class="flex w-full justify-center">
								<div in:fly={{ y: -32, duration: 420, delay: 500 }} class="join join-horizontal w-full max-w-[500px]">
									<input
										class="peer join-item input input-bordered h-12 min-h-12 w-full min-w-0 flex-1 rounded-l-2xl rounded-r-none text-base focus:z-10"
										bind:value={creatorHandle}
										placeholder="thecoopgal"
										onkeydown={onCreatorHandleKeydown}
									/>
									<span
										class="join-item input input-bordered flex h-12 min-h-12 shrink-0 items-center justify-center rounded-none bg-base-200 px-3 text-sm opacity-80"
										aria-hidden="true"
									>
										.gloopglop.com
									</span>
									<button
										class={`join-item flex h-12 min-h-12 shrink-0 items-center justify-center rounded-l-none rounded-r-2xl border px-4 transition-colors focus:z-10 focus:outline-none ${
											canAdvanceFromName
												? 'border-[#5f9626] bg-[#7ac943] text-[#10210a] hover:border-[#4c7a1f] hover:bg-[#6fb93b]'
												: 'border-base-300 bg-base-200 text-base-content/50'
										}`}
										type="button"
										aria-label="Next"
										disabled={!canAdvanceFromName}
										onclick={goNext}
									>
										&rarr;
									</button>
								</div>
							</div>
							<div class="pointer-events-none absolute -top-11 left-0 z-10 hidden rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-xs shadow-sm peer-hover:block">
								type in what you would like your URL to be
							</div>
							{#if nonEmpty(normalizedCreatorHandle)}
								{#if isCreatorHandleTaken}
									<p class="mt-2 text-center text-sm text-error">That URL is already taken. Try another one.</p>
								{:else if !isCreatorHandleValid}
									<p class="mt-2 text-center text-sm text-error">Use only letters, numbers, and dashes (no spaces or symbols).</p>
								{/if}
							{/if}
						</label>
							{:else if active.id === 'handle'}
						<label class="form-control">
							<div class="mx-auto w-full max-w-[500px] space-y-3">
								<div class="join join-horizontal w-full">
									<input
										class="join-item input input-bordered h-12 min-h-12 w-full min-w-0 flex-1 rounded-l-2xl rounded-r-none text-center text-base focus:z-10"
										value={creatorName}
										placeholder="@thecoopgal"
										oninput={(e) => (creatorName = normalizePrimaryCreatorName((e.currentTarget as HTMLInputElement).value))}
										onblur={() => (creatorName = normalizePrimaryCreatorName(creatorName))}
										onkeydown={onPrimaryCreatorNameKeydown}
									/>
									<button
										class={`join-item flex h-12 min-h-12 shrink-0 items-center justify-center rounded-l-none rounded-r-2xl border px-4 transition-colors focus:z-10 focus:outline-none ${
											canNext
												? 'border-[#5f9626] bg-[#7ac943] text-[#10210a] hover:border-[#4c7a1f] hover:bg-[#6fb93b]'
												: 'border-base-300 bg-base-200 text-base-content/50'
										}`}
										type="button"
										aria-label="Next"
										disabled={!canNext}
										onclick={goNext}
									>
										&rarr;
									</button>
								</div>
								{#each additionalCreatorNames as additionalName, i}
									<div class="join join-horizontal w-full">
										<input
											class="join-item input input-bordered h-12 min-h-12 w-full min-w-0 flex-1 rounded-l-2xl rounded-r-none text-base focus:z-10"
											value={additionalName}
											placeholder={`Extra name ${i + 2} (optional)`}
											oninput={(e) => updateAdditionalCreatorName(i, (e.currentTarget as HTMLInputElement).value)}
											onkeydown={onCreatorNameKeydown}
										/>
										<button
											class="join-item flex h-12 min-h-12 shrink-0 items-center justify-center rounded-l-none rounded-r-2xl border border-base-300 bg-base-200 px-4 text-base-content/70 transition-colors hover:bg-base-300 focus:z-10 focus:outline-none"
											type="button"
											aria-label="Remove name"
											onclick={() => removeAdditionalCreatorName(i)}
										>
											&times;
										</button>
									</div>
								{/each}
								{#if additionalCreatorNames.length < MAX_CREATOR_NAMES - 1}
									<div class="text-center">
										<button
											class="btn btn-sm rounded-2xl border-[#5f9626] bg-[#7ac943] text-[#10210a] hover:border-[#4c7a1f] hover:bg-[#6fb93b]"
											type="button"
											onclick={addAdditionalCreatorName}
										>
											Add another name ({additionalCreatorNames.length + 1}/{MAX_CREATOR_NAMES})
										</button>
									</div>
								{/if}
							</div>
						</label>
							{:else if active.id === 'slug'}
						<label class="form-control">
							<div class="mx-auto flex w-full max-w-[500px] justify-center">
								<div class="join join-horizontal w-full">
									<span
										class="join-item input input-bordered flex h-12 min-h-12 shrink-0 items-center justify-center rounded-l-2xl rounded-r-none bg-base-200 px-3 text-sm opacity-80"
										aria-hidden="true"
									>
										gloop.gg/
									</span>
									<input
										class="join-item input input-bordered h-12 min-h-12 w-full min-w-0 flex-1 rounded-none text-base focus:z-10"
										bind:value={shortSlug}
										placeholder="ggg"
										onkeydown={onShortSlugKeydown}
									/>
									<button
										class={`join-item flex h-12 min-h-12 shrink-0 items-center justify-center rounded-l-none rounded-r-2xl border px-4 transition-colors focus:z-10 focus:outline-none ${
											canNext
												? 'border-[#5f9626] bg-[#7ac943] text-[#10210a] hover:border-[#4c7a1f] hover:bg-[#6fb93b]'
												: 'border-base-300 bg-base-200 text-base-content/50'
										}`}
										type="button"
										aria-label="Next"
										disabled={!canNext}
										onclick={goNext}
									>
										&rarr;
									</button>
								</div>
							</div>
							{#if isShortSlugTooShort}
								<p class="mt-2 text-center text-sm text-error">Short slug must be at least 3 characters.</p>
							{:else if nonEmpty(normalizedShortSlug) && isShortSlugTaken}
								<p class="mt-2 text-center text-sm text-error">That short slug is already taken. Try another one.</p>
							{/if}
						</label>
							{:else if active.id === 'avatar'}
						<label class="form-control">
							<div class="mx-auto w-full max-w-[500px]">
								<div class="join w-full">
									<input
										class="input input-bordered join-item w-full rounded-l-2xl rounded-r-none text-base"
										readonly
										value={avatarUploadName || 'No file selected'}
									/>
									{#if avatarUploadName}
										<button
											class="join-item inline-flex h-12 items-center justify-center rounded-none border-y border-r border-base-300 bg-base-100 px-3 text-lg leading-none text-base-content/60 transition-colors hover:bg-base-100 hover:text-error"
											type="button"
											aria-label="Clear selected image"
											onclick={clearAvatarUpload}
										>
											&times;
										</button>
									{/if}
									<button
										class="join-item inline-flex h-12 cursor-pointer select-none items-center justify-center rounded-none border border-base-300 bg-base-200 px-4 font-medium text-base-content/85 transition-all hover:border-base-content/30 hover:bg-base-300 active:scale-[0.98] active:bg-base-300"
										type="button"
										onclick={triggerAvatarUpload}
									>
										Upload
									</button>
									<button
										class={`join-item inline-flex h-12 items-center justify-center rounded-l-none rounded-r-2xl border px-4 transition-colors ${
											canNext
												? 'border-[#5f9626] bg-[#7ac943] text-[#10210a] hover:border-[#4c7a1f] hover:bg-[#6fb93b]'
												: 'border-base-300 bg-base-200 text-base-content/50'
										}`}
										type="button"
										aria-label="Next"
										disabled={!canNext}
										onclick={goNext}
									>
										&rarr;
									</button>
								</div>
								<input
									class="hidden"
									type="file"
									accept="image/*"
									bind:this={avatarFileInput}
									onchange={onAvatarUploadChange}
								/>
								{#if avatarPreviewUrl}
									<div class="mt-4 flex justify-center">
										<img
											src={avatarPreviewUrl}
											alt="Avatar preview"
											class="h-28 w-28 rounded-2xl border border-base-300 object-cover"
										/>
									</div>
								{/if}
							</div>
						</label>
							{:else if active.id === 'tagline'}
						<label class="form-control">
							<div class="mx-auto w-full max-w-[500px]">
								<div class="join w-full">
									<input
										class="input input-bordered join-item w-full rounded-l-2xl rounded-r-none text-center text-base"
										bind:value={tagline}
										placeholder="e.g. Baking, thrifting, and cozy chaos"
										onkeydown={onTaglineKeydown}
									/>
									<button
										class={`join-item inline-flex h-12 items-center justify-center rounded-l-none rounded-r-2xl border px-4 transition-colors ${
											canNext
												? 'border-[#5f9626] bg-[#7ac943] text-[#10210a] hover:border-[#4c7a1f] hover:bg-[#6fb93b]'
												: 'border-base-300 bg-base-200 text-base-content/50'
										}`}
										type="button"
										aria-label="Next"
										disabled={!canNext}
										onclick={goNext}
									>
										&rarr;
									</button>
								</div>
								<div class="mt-2 text-left text-xs">
									<span class={isTaglineTooLong ? 'text-error font-semibold' : 'opacity-70'}>
										{tagline.length}/{MAX_TAGLINE_LENGTH}
									</span>
									{#if isTaglineTooLong}
										<span class="ml-2 text-error">Tagline must be {MAX_TAGLINE_LENGTH} characters or fewer.</span>
									{/if}
								</div>
							</div>
						</label>
							{:else if active.id === 'bio'}
						<label class="form-control">
							<div class="mx-auto w-full max-w-[500px]">
								<div class="join w-full">
									<textarea
										class="textarea textarea-bordered join-item min-h-[8rem] w-full rounded-l-2xl rounded-r-none text-left text-base"
										rows="5"
										bind:value={bio}
										placeholder="A few lines about you…"
										onkeydown={onBioKeydown}
									></textarea>
									<button
										class={`join-item inline-flex h-auto min-h-[8rem] items-center justify-center rounded-l-none rounded-r-2xl border px-4 transition-colors ${
											canNext
												? 'border-[#5f9626] bg-[#7ac943] text-[#10210a] hover:border-[#4c7a1f] hover:bg-[#6fb93b]'
												: 'border-base-300 bg-base-200 text-base-content/50'
										}`}
										type="button"
										aria-label="Next"
										disabled={!canNext}
										onclick={goNext}
									>
										&rarr;
									</button>
								</div>
							</div>
						</label>
							{:else if active.id === 'theme'}
						<label class="form-control">
							<div class="mx-auto w-full max-w-[500px]">
								<div class="join w-full">
									<select
										class="select select-bordered join-item w-full rounded-l-2xl rounded-r-none text-base"
										bind:value={profileTheme}
										onkeydown={onStepFieldEnterKeydown}
									>
										<option value="gloopglop">gloopglop</option>
										<option value="coopgal_cosmic">coopgal_cosmic</option>
									</select>
									<button
										class={`join-item inline-flex h-12 items-center justify-center rounded-l-none rounded-r-2xl border px-4 transition-colors ${
											canNext
												? 'border-[#5f9626] bg-[#7ac943] text-[#10210a] hover:border-[#4c7a1f] hover:bg-[#6fb93b]'
												: 'border-base-300 bg-base-200 text-base-content/50'
										}`}
										type="button"
										aria-label="Next"
										disabled={!canNext}
										onclick={goNext}
									>
										&rarr;
									</button>
								</div>
							</div>
						</label>
							{:else if active.id === 'links'}
						<div class="mx-auto mt-4 w-full max-w-[500px] space-y-3">
							{#each links as link, i}
								{@const Icon = linkIconComponent(inferLinkIcon(link.href))}
								<div class="flex items-center gap-2">
									<div class="join flex-1">
										{#if !isLinkInTitleMode(i, link)}
											<button
												class={`join-item input input-bordered input-sm inline-flex min-w-0 grow items-center justify-start gap-2 rounded-l-xl rounded-r-none bg-base-200 px-3 text-left transition-all duration-200 hover:bg-base-300 ${linkLeftWidthClass(i)}`}
												type="button"
												aria-label="Edit title"
												onclick={() => focusLinkTitleField(i)}
											>
												<Icon class="h-4 w-4 opacity-80" />
												{#if isLinkComplete(link)}
													<span class="truncate text-xs font-medium">{link.label}</span>
												{/if}
											</button>
										{:else}
											<input
												class={`join-item input input-bordered input-sm min-w-0 grow rounded-l-xl rounded-r-none transition-all duration-200 ${linkLeftWidthClass(i)}`}
												placeholder="Title"
												value={link.label}
												bind:this={linkTitleInputs[i]}
												oninput={(e) => updateLink(i, { label: (e.currentTarget as HTMLInputElement).value })}
												onfocus={() => (focusedLinkField = { index: i, field: 'label' })}
												onblur={() => {
													if (focusedLinkField?.index === i && focusedLinkField?.field === 'label') {
														focusedLinkField = isLinkComplete(link) ? { index: i, field: 'href' } : null;
													}
												}}
												onkeydown={onStepFieldEnterKeydown}
											/>
										{/if}
										<input
											class={`join-item input input-bordered input-sm min-w-0 grow rounded-l-none rounded-r-xl transition-all duration-200 ${linkRightWidthClass(i)}`}
											placeholder="https://"
											value={link.href}
											oninput={(e) => updateLink(i, { href: (e.currentTarget as HTMLInputElement).value })}
											onfocus={() => (focusedLinkField = { index: i, field: 'href' })}
											onkeydown={onStepFieldEnterKeydown}
										/>
									</div>
									<button class="btn btn-sm btn-ghost rounded-xl" type="button" onclick={() => removeLink(i)}>
										Remove
									</button>
								</div>
							{/each}
							<button
								class="btn w-full rounded-2xl border-[#5f9626] bg-[#7ac943] text-[#10210a] hover:border-[#4c7a1f] hover:bg-[#6fb93b]"
								type="button"
								onclick={addLink}
							>
								Add link
							</button>
							{#if cleanLinks.length > 0}
								<div class="flex justify-center pt-1">
									<button
										class={`inline-flex h-12 items-center justify-center rounded-2xl border px-5 transition-colors ${
											canNext
												? 'border-[#5f9626] bg-[#7ac943] text-[#10210a] hover:border-[#4c7a1f] hover:bg-[#6fb93b]'
												: 'border-base-300 bg-base-200 text-base-content/50'
										}`}
										type="button"
										aria-label="Next"
										disabled={!canNext}
										onclick={goNext}
									>
										&rarr;
									</button>
								</div>
							{/if}
						</div>

							{:else if active.id === 'review'}
						<div class="rounded-2xl border border-primary/25 bg-primary/5 p-4">
							<div class="flex flex-wrap items-center justify-between gap-3">
								<div class="text-sm">
									<div class="font-semibold">Ready to create</div>
									<div class="opacity-75">Copy this YAML into your repo content.</div>
								</div>
								<button class="btn rounded-2xl border-[#5f9626] bg-[#7ac943] text-[#10210a] hover:border-[#4c7a1f] hover:bg-[#6fb93b]" type="button" onclick={copyAllYaml}>
									Copy YAML
								</button>
							</div>
							{#if copyState === 'copied'}
								<p class="mt-3 text-success text-sm">Copied to clipboard.</p>
							{:else if copyState === 'error'}
								<p class="mt-3 text-error text-sm">Copy failed — copy manually below.</p>
							{/if}
						</div>

						<div class="mt-4 rounded-2xl border border-base-300 bg-[#0f172a] p-3">
							<textarea
								class="textarea h-[360px] w-full border-0 bg-transparent font-mono text-xs text-slate-100 focus:outline-none md:h-[520px]"
								readonly
								value={combinedYaml}
							></textarea>
						</div>
							{/if}
									</div>
								{/key}
							</div>
						{/if}

						{#if touched && !canNext}
							{#if active.id === 'name'}
								{#if isCreatorHandleTaken}
									<p class="mt-3 text-sm text-error">That URL is already taken. Try another one.</p>
								{:else}
									<p class="mt-3 text-sm text-error">Use only letters, numbers, and dashes (no spaces or symbols).</p>
								{/if}
							{:else if active.id === 'links'}
								<p class="mt-3 text-sm text-error">Add at least one complete link (label + URL).</p>
							{:else}
								<p class="mt-3 text-sm text-error">Please answer this before continuing.</p>
							{/if}
						{/if}
					{/if}
					</div>
				</div>
			</div>
		</div>
	</main>

	<Icons8BoogerAttribution />
</div>
