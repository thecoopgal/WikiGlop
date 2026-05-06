<script lang="ts">
	import IconInstagram from '~icons/mdi/instagram';
	import IconLinkedin from '~icons/mdi/linkedin';
	import IconFacebook from '~icons/mdi/facebook';
	import IconYoutube from '~icons/mdi/youtube';
	import IconTiktok from '~icons/simple-icons/tiktok';
	import IconThreadsFallback from '~icons/mdi/at';
	import IconHome from '~icons/mdi/home';
	import IconDocument from '~icons/mdi/file-document-outline';
	import IconUsers from '~icons/mdi/account-group';
	import IconShop from '~icons/mdi/cart-outline';
	import IconCash from '~icons/mdi/cash';
	import IconCoffee from '~icons/mdi/coffee-outline';
	import IconWeb from '~icons/mdi/web';
	import IconLink from '~icons/mdi/link-variant';
import IconCopy from '~icons/mdi/content-copy';
import IconQrCode from '~icons/mdi/qrcode';
import IconProfile from '~icons/mdi/account-circle-outline';
import IconMore from '~icons/mdi/dots-horizontal-circle-outline';
import IconDownload from '~icons/mdi/download';
import IconBell from '~icons/mdi/bell-outline';
import IconDownloadMobile from '~icons/mdi/cellphone-arrow-down';
import {
	isMobileDevice,
	isStandaloneDisplayMode,
	registerForCreatorNotifications
} from '$lib/push-client';

	/** Flip to `true` to show the creator notification bell + modal again. */
	const CREATOR_NOTIFICATIONS_UI_ENABLED = false;

	type Props = {
		name?: string;
		tagline?: string;
		avatar?: string;
		bio?: string;
		short_links?: Array<{
			label?: string;
			href: string;
			icon?: string;
			open_in?: 'same_tab' | 'new_tab' | string;
		}>;
		notifications?: {
			enabled?: boolean;
			title?: string;
			description?: string;
			topics?: Array<{
				id: string;
				label: string;
				default?: boolean;
			}>;
		};
	site?: {
		id?: string;
		siteId?: string;
		name?: string;
		hosts?: string[];
		theme?: {
			preset?: string;
			mode?: string;
		};
		routing?: {
			gloop_gg_short_slug?: string;
		};
	};
	};

let { name, tagline, avatar, bio, short_links, notifications, site } = $props() as Props;

	const cardShadow = 'shadow-[0px_1px_3px_rgba(0,0,0,0.15)]';
const GLOOP_SHORT_HOST = 'gloop.gg';
const SHARE_ICON_LIGHT_URL =
	'https://imagedelivery.net/zdMtZgMUbYs7-R4-dRSl-Q/20ec55d3-136b-4ad6-f33a-12de645f5800/public';
const SHARE_ICON_DARK_URL =
	'https://imagedelivery.net/zdMtZgMUbYs7-R4-dRSl-Q/7b2e7e40-67c2-4618-c73b-b97537901e00/public';
const BRAND_ICON_URL =
	'https://imagedelivery.net/zdMtZgMUbYs7-R4-dRSl-Q/907061a8-51ae-454c-c739-83935616f900/public';

// Business-card PDF design tokens (single source for easy tweaking).
const CARD_W_IN = 3.5;
const CARD_H_IN = 2;
const CARD_BORDER = {
	x: 0.02,
	y: 0.02,
	w: 3.46,
	h: 1.96,
	lineWidth: 0.01,
	radius: 0
};
const CARD_BG_RGB: [number, number, number] = [244, 247, 250];
const CARD_BORDER_RGB: [number, number, number] = [124, 58, 237];
const TITLE_RGB: [number, number, number] = [10, 10, 10];
const URL_RGB: [number, number, number] = [10, 10, 10];
const PROFILE_FRAME_RGB: [number, number, number] = [40, 40, 40];
const TITLE_FONT_IN = 0.22;
const URL_FONT_IN = 0.2;
const TITLE_POS = { x: 1.75, y: 0.42 };
const PROFILE_IMAGE = { x: 0.22, y: 0.76, w: 0.62, h: 0.62 };
const PROFILE_FRAME = { cx: 0.53, cy: 1.07, r: 0.31, lineWidth: 0.02 };
const QR_IMAGE = { x: 1.33, y: 0.56, w: 0.84, h: 0.84 };
const BRAND_IMAGE = { x: 2.52, y: 0.79, w: 0.56, h: 0.56 };
const URL_POS = { x: 1.75, y: 1.78 };

let showShareModal = $state(false);
let copyState = $state<'idle' | 'copied' | 'error'>('idle');
let qrCopyState = $state<'idle' | 'copied' | 'error'>('idle');
let showQrCode = $state(false);
let shareTouchStartX = 0;
let shareTouchActive = false;
let linkCopied = $state(false);
let linkCopiedTimer: ReturnType<typeof setTimeout> | null = null;
let downloadState = $state<'idle' | 'loading' | 'error'>('idle');
let showNotifyModal = $state(false);
let notifyState = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
let notifyMessage = $state('');
let selectedTopicIds = $state<string[]>([]);
let deferredInstallPrompt: any = null;

$effect(() => {
	if (typeof window === 'undefined') return;
	const onBeforeInstallPrompt = (event: Event) => {
		event.preventDefault();
		deferredInstallPrompt = event;
	};
	window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
	return () => {
		window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
	};
});

function isLocalLikeHost(hostname: string): boolean {
	return hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1';
}

function currentShortUrl(): string {
	if (typeof window === 'undefined') return '';

	const u = new URL(window.location.href);
	const key =
		site?.routing?.gloop_gg_short_slug?.trim() ||
		site?.siteId?.trim() ||
		site?.id?.trim();

	if (!key) return u.toString();

	const pagePath = u.pathname === '/' ? '' : u.pathname;

	// In local dev, preserve localhost + port but keep shortened path semantics.
	if (isLocalLikeHost(u.hostname)) {
		return `${u.protocol}//${u.host}/${encodeURIComponent(key)}${pagePath}${u.search}`;
	}

	return `${u.protocol}//${GLOOP_SHORT_HOST}/${encodeURIComponent(key)}${pagePath}${u.search}`;
}

const shortUrl = $derived(currentShortUrl());
const canonicalHostLabel = $derived.by(() => {
	const hosts = Array.isArray(site?.hosts) ? site.hosts.map((h) => h.trim().toLowerCase()).filter(Boolean) : [];
	if (hosts.length) {
		const preferred =
			hosts.find((h) => h.endsWith('.gloopglop.com') && !h.startsWith('www.')) ??
			hosts.find((h) => h === 'gloopglop.com') ??
			hosts.find((h) => h.endsWith('.localhost')) ??
			hosts.find((h) => h === 'localhost' || h === '127.0.0.1') ??
			hosts[0];
		if (preferred) return preferred;
	}
	if (typeof window !== 'undefined') return window.location.hostname;
	return '';
});
const shortPathLabel = $derived.by(() => {
	if (typeof window === 'undefined') return '';
	const key =
		site?.routing?.gloop_gg_short_slug?.trim() ||
		site?.siteId?.trim() ||
		site?.id?.trim();
	if (!key) return '';
	const u = new URL(window.location.href);
	const pagePath = u.pathname === '/' ? '' : u.pathname;
	return `${GLOOP_SHORT_HOST}/${encodeURIComponent(key)}${pagePath}${u.search}`;
});
const shareIconUrl = $derived.by(() => {
	const preset = site?.theme?.preset?.toLowerCase();
	const mode = site?.theme?.mode?.toLowerCase();
	const effectiveTheme = preset === 'light' || preset === 'dark' ? preset : mode;
	return effectiveTheme === 'dark' ? SHARE_ICON_DARK_URL : SHARE_ICON_LIGHT_URL;
});
const qrUrl = $derived(
	shortUrl
		? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shortUrl)}`
		: ''
);
const notificationTopics = $derived.by(() =>
	(notifications?.topics ?? [])
		.map((t) => ({
			id: typeof t.id === 'string' ? t.id.trim().toLowerCase() : '',
			label: typeof t.label === 'string' ? t.label.trim() : '',
			default: t.default === true
		}))
		.filter((t) => !!t.id && !!t.label)
);

function seedDefaultTopics() {
	const defaults = notificationTopics.filter((t) => t.default).map((t) => t.id);
	selectedTopicIds = defaults.length ? Array.from(new Set(defaults)) : notificationTopics.map((t) => t.id);
}

function toggleTopic(topicId: string) {
	if (selectedTopicIds.includes(topicId)) {
		selectedTopicIds = selectedTopicIds.filter((x) => x !== topicId);
		return;
	}
	selectedTopicIds = [...selectedTopicIds, topicId];
}

	function normalizeIconKey(value: string | undefined): string {
		return (value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
	}

	function iconComponent(icon: string | undefined) {
		const key = normalizeIconKey(icon);
		switch (key) {
			case 'instagram':
				return IconInstagram;
			case 'linkedin':
				return IconLinkedin;
			case 'facebook':
				return IconFacebook;
			case 'youtube':
			case 'yt':
				return IconYoutube;
			case 'tiktok':
				return IconTiktok;
			case 'threads':
				return IconThreadsFallback;
			case 'home':
				return IconHome;
			case 'document':
			case 'doc':
				return IconDocument;
			case 'users':
			case 'people':
				return IconUsers;
			case 'shop':
			case 'store':
				return IconShop;
			case 'cashapp':
			case 'venmo':
			case 'cash':
				return IconCash;
			case 'kofi':
			case 'coffee':
				return IconCoffee;
			case 'website':
			case 'web':
				return IconWeb;
			default:
				return IconLink;
		}
	}

	function shouldOpenSameTab(openIn: string | undefined): boolean {
		return (openIn ?? '').toLowerCase() === 'same_tab';
	}

async function copyShortUrl() {
	if (!shortUrl) return;
	try {
		await navigator.clipboard.writeText(shortUrl);
		copyState = 'copied';
	} catch {
		copyState = 'error';
	}
}

async function copyShortUrlFromLinkAction() {
	await copyShortUrl();
	if (copyState !== 'copied') return;
	linkCopied = true;
	if (linkCopiedTimer) clearTimeout(linkCopiedTimer);
	linkCopiedTimer = setTimeout(() => {
		linkCopied = false;
	}, 5000);
}

async function shareMore() {
	if (!shortUrl) return;
	if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
		try {
			await navigator.share({
				title: name ?? site?.name ?? site?.id ?? 'Share This Glop',
				url: shortUrl
			});
			return;
		} catch {
			// User cancelled or share failed; do not treat as an error.
			return;
		}
	}
	await copyShortUrl();
}

async function copyQrImageToClipboard() {
	if (!qrUrl) return;
	try {
		if (typeof navigator === 'undefined' || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
			throw new Error('Clipboard image API unavailable');
		}
		const res = await fetch(qrUrl);
		if (!res.ok) throw new Error(`QR fetch failed: ${res.status}`);
		const blob = await res.blob();
		await navigator.clipboard.write([new ClipboardItem({ [blob.type || 'image/png']: blob })]);
		qrCopyState = 'copied';
		setTimeout(() => {
			qrCopyState = 'idle';
		}, 5000);
	} catch {
		qrCopyState = 'error';
	}
}

function slugifyForFileName(v: string): string {
	return v
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'glop';
}

async function imageUrlToDataUrl(url: string): Promise<string> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
	const blob = await res.blob();
	return await new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result ?? ''));
		reader.onerror = () => reject(new Error('Could not read image data'));
		reader.readAsDataURL(blob);
	});
}

async function circularImageDataUrl(sourceDataUrl: string, size = 512): Promise<string> {
	return await new Promise<string>((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			try {
				const canvas = document.createElement('canvas');
				canvas.width = size;
				canvas.height = size;
				const ctx = canvas.getContext('2d');
				if (!ctx) throw new Error('Canvas context unavailable');

				ctx.clearRect(0, 0, size, size);
				ctx.save();
				ctx.beginPath();
				ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
				ctx.closePath();
				ctx.clip();
				ctx.drawImage(img, 0, 0, size, size);
				ctx.restore();

				resolve(canvas.toDataURL('image/png'));
			} catch (e) {
				reject(e instanceof Error ? e : new Error('Could not create circular image'));
			}
		};
		img.onerror = () => reject(new Error('Could not load avatar image'));
		img.src = sourceDataUrl;
	});
}

async function downloadBusinessCardPdf() {
	if (!shortUrl || !qrUrl || downloadState === 'loading') return;
	downloadState = 'loading';
	try {
		const { jsPDF } = await import('jspdf');

		const [avatarDataUrl, qrDataUrl, brandDataUrl] = await Promise.all([
			avatar ? imageUrlToDataUrl(avatar) : Promise.resolve(''),
			imageUrlToDataUrl(qrUrl),
			imageUrlToDataUrl(BRAND_ICON_URL)
		]);
		const avatarCircleDataUrl = avatarDataUrl ? await circularImageDataUrl(avatarDataUrl, 600) : '';

		// Standard US business card. Styled by tokens above.
		const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [CARD_W_IN, CARD_H_IN] });
		pdf.setFillColor(...CARD_BG_RGB);
		pdf.rect(0, 0, CARD_W_IN, CARD_H_IN, 'F');
		pdf.setDrawColor(...CARD_BORDER_RGB);
		pdf.setLineWidth(CARD_BORDER.lineWidth);
		pdf.roundedRect(
			CARD_BORDER.x,
			CARD_BORDER.y,
			CARD_BORDER.w,
			CARD_BORDER.h,
			CARD_BORDER.radius,
			CARD_BORDER.radius,
			'S'
		);

		pdf.setFont('helvetica', 'bold');
		pdf.setFontSize(TITLE_FONT_IN * 72);
		pdf.setTextColor(...TITLE_RGB);
		pdf.text(name ?? site?.name ?? site?.id ?? 'Glop', TITLE_POS.x, TITLE_POS.y, { align: 'center' });

		if (avatarCircleDataUrl) {
			pdf.addImage(avatarCircleDataUrl, 'PNG', PROFILE_IMAGE.x, PROFILE_IMAGE.y, PROFILE_IMAGE.w, PROFILE_IMAGE.h);
			pdf.setDrawColor(...PROFILE_FRAME_RGB);
			pdf.setLineWidth(PROFILE_FRAME.lineWidth);
			pdf.circle(PROFILE_FRAME.cx, PROFILE_FRAME.cy, PROFILE_FRAME.r, 'S');
		}

		pdf.addImage(qrDataUrl, 'PNG', QR_IMAGE.x, QR_IMAGE.y, QR_IMAGE.w, QR_IMAGE.h);
		if (brandDataUrl) {
			pdf.addImage(brandDataUrl, 'PNG', BRAND_IMAGE.x, BRAND_IMAGE.y, BRAND_IMAGE.w, BRAND_IMAGE.h);
		}

		pdf.setFont('helvetica', 'bold');
		pdf.setFontSize(URL_FONT_IN * 72);
		pdf.setTextColor(...URL_RGB);
		pdf.text(shortPathLabel || '', URL_POS.x, URL_POS.y, { align: 'center' });

		const base = slugifyForFileName(name ?? site?.siteId ?? site?.id ?? 'glop');
		const blob = pdf.output('blob');
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${base}-business-cards.pdf`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
		downloadState = 'idle';
	} catch {
		downloadState = 'error';
	}
}

function onShareTouchStart(e: TouchEvent) {
	const touch = e.touches?.[0];
	if (!touch) return;
	shareTouchStartX = touch.clientX;
	shareTouchActive = true;
}

function onShareTouchEnd(e: TouchEvent) {
	if (!shareTouchActive) return;
	shareTouchActive = false;
	const touch = e.changedTouches?.[0];
	if (!touch) return;
	const deltaX = touch.clientX - shareTouchStartX;
	const SWIPE_THRESHOLD_PX = 35;
	if (deltaX <= -SWIPE_THRESHOLD_PX) showQrCode = true;
	if (deltaX >= SWIPE_THRESHOLD_PX) showQrCode = false;
}

async function enableNotifications() {
	notifyState = 'loading';
	notifyMessage = '';
	const result = await registerForCreatorNotifications({
		siteId: site?.siteId ?? site?.id,
		pagePath: typeof window !== 'undefined' ? window.location.pathname : '/',
		creatorName: name ?? site?.name ?? site?.id ?? '',
		topicIds: selectedTopicIds
	});
	if (!result.ok) {
		notifyState = 'error';
		notifyMessage =
			result.reason === 'unsupported'
				? 'This browser does not support push notifications.'
				: result.reason === 'permission_denied'
					? 'Notification permission was denied.'
					: result.reason === 'no_public_key'
						? 'Notifications are not configured on this site yet.'
						: 'Could not enable notifications right now.';
		return;
	}
	notifyState = 'success';
	notifyMessage = 'Notifications are enabled for this creator page.';
}

async function promptInstallIfAvailable() {
	if (!deferredInstallPrompt) return false;
	try {
		await deferredInstallPrompt.prompt();
		await deferredInstallPrompt.userChoice;
		deferredInstallPrompt = null;
		return true;
	} catch {
		return false;
	}
}
</script>

{#if name}
	<section class="my-10">
		<div class="card bg-base-100 {cardShadow}">
			<div class="card-body items-center text-center">
				<div class="flex w-full items-start gap-2">
					{#if CREATOR_NOTIFICATIONS_UI_ENABLED}
						<button
							type="button"
							class="btn btn-ghost btn-sm btn-circle shrink-0 border border-base-300 self-start"
							onclick={() => {
								showNotifyModal = true;
								notifyState = 'idle';
								notifyMessage = '';
								seedDefaultTopics();
							}}
							aria-label="Get notifications"
							title="Get notifications"
						>
							<IconBell class="h-5 w-5" />
						</button>
					{/if}
					<div class="flex min-w-0 flex-1 flex-col items-center gap-4">
						{#if avatar}
							<img
								src={avatar}
								alt={name}
								class="h-16 w-16 rounded-full object-cover"
							/>
						{/if}
						<div class="text-center">
							<h2 class="card-title w-full justify-center text-2xl text-center">{name}</h2>
							{#if tagline}
								<p class="mt-5 opacity-80">{tagline}</p>
							{/if}
						</div>
					</div>
					<button
						type="button"
						class="btn btn-ghost btn-sm btn-circle shrink-0 border border-base-300 self-start"
						onclick={() => {
							showShareModal = true;
							copyState = 'idle';
							qrCopyState = 'idle';
							showQrCode = false;
							linkCopied = false;
						}}
						aria-label="Share page"
						title="Share page"
					>
						<img src={shareIconUrl} alt="" class="h-5 w-5 object-contain" />
					</button>
				</div>
				{#if bio}
					<p class="whitespace-pre-line">{bio}</p>
				{/if}
				{#if short_links?.length}
					<div class="mt-5 flex flex-wrap gap-2">
						{#each short_links as shortLink, i (`${shortLink.href}-${i}`)}
							{@const Icon = iconComponent(shortLink.icon)}
							<a
								href={shortLink.href}
								class="btn btn-circle btn-sm btn-outline {cardShadow}"
								target={shouldOpenSameTab(shortLink.open_in) ? undefined : '_blank'}
								rel={shouldOpenSameTab(shortLink.open_in) ? undefined : 'noreferrer'}
								title={shortLink.label ?? shortLink.icon ?? 'Link'}
								aria-label={shortLink.label ?? shortLink.icon ?? 'Link'}
							>
								<Icon class="h-5 w-5" />
							</a>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		{#if showShareModal}
			<div class="modal modal-open">
				<div class="modal-box relative max-w-md">
					<div
						class="rounded-box border border-base-300 bg-base-200/40 overflow-hidden {cardShadow}"
						role="region"
						aria-label="Share panel carousel"
						ontouchstart={onShareTouchStart}
						ontouchend={onShareTouchEnd}
					>
						<div
							class="flex w-[200%] transition-transform duration-300 ease-out"
							style={`transform: translateX(${showQrCode ? '-50%' : '0%'})`}
						>
							<div class="w-1/2 px-3 py-4">
								<div class="relative flex min-h-[144px] flex-col items-center justify-center gap-2 text-center">
									{#if avatar}
										<img src={avatar} alt={name ?? 'Page image'} class="h-14 w-14 rounded-full object-cover" />
									{:else}
										<div class="h-14 w-14 rounded-full bg-base-300"></div>
									{/if}
									<p class="max-w-full truncate font-medium">{name ?? site?.name ?? site?.id ?? 'Untitled page'}</p>
									<p class="max-w-full truncate text-xs opacity-80">{canonicalHostLabel || '/'}</p>
									<p class="max-w-full truncate text-xs opacity-60">{shortPathLabel || '/'}</p>
									{#if qrUrl}
										<button
											type="button"
											class="absolute right-1 top-1/2 -translate-y-1/2 p-0 bg-transparent border-0 shadow-none text-base-content/70 hover:text-base-content"
											onclick={() => (showQrCode = true)}
											aria-label="Show QR code"
											title="Show QR code"
										>
											<IconQrCode class="h-4 w-4" />
										</button>
									{/if}
								</div>
							</div>
							<div class="w-1/2 px-3 py-4">
								<div class="relative flex min-h-[144px] flex-col">
									<button
										type="button"
										class="absolute left-0 top-1/2 -translate-y-1/2 p-0 bg-transparent border-0 shadow-none text-base-content/70 hover:text-base-content"
										onclick={() => (showQrCode = false)}
										aria-label="Show profile"
										title="Show profile"
									>
										<IconProfile class="h-4 w-4" />
									</button>
									<button
										type="button"
										class="absolute right-0 top-1/2 -translate-y-1/2 p-0 bg-transparent border-0 shadow-none text-base-content/70 hover:text-base-content disabled:opacity-40"
										onclick={downloadBusinessCardPdf}
										aria-label="Download business card PDFs"
										title="Download cards PDF"
										disabled={downloadState === 'loading'}
									>
										<IconDownload class="h-4 w-4" />
									</button>
									{#if qrUrl}
									<div class="flex flex-1 flex-col items-center">
										<div class="flex flex-1 items-center justify-center">
											<img src={qrUrl} alt="QR code for this page" class="h-[108px] w-[108px] rounded border border-base-300" />
										</div>
										<p class="mt-auto max-w-full truncate text-xs opacity-70">{shortPathLabel || '/'}</p>
										{#if qrCopyState === 'error'}
											<p class="text-[11px] text-error">Could not copy QR image.</p>
										{/if}
									</div>
									{/if}
								</div>
							</div>
						</div>
					</div>

					<div class="mt-4 flex items-start justify-center gap-12">
						<div class="flex w-16 flex-col items-center gap-1">
							<button type="button" class="btn btn-circle btn-sm {cardShadow}" onclick={copyShortUrlFromLinkAction} title="Copy link">
								<IconLink class="h-4 w-4" />
							</button>
							<span class="text-xs opacity-70">{linkCopied ? 'Copied' : 'Link'}</span>
						</div>
						<div class="flex w-16 flex-col items-center gap-1">
							<button type="button" class="btn btn-circle btn-sm {cardShadow}" onclick={copyQrImageToClipboard} title="Copy QR image">
								<IconQrCode class="h-4 w-4" />
							</button>
							<span class="text-xs opacity-70">{qrCopyState === 'copied' ? 'Copied' : 'QR'}</span>
						</div>
						<div class="flex w-16 flex-col items-center gap-1">
							<button type="button" class="btn btn-circle btn-sm {cardShadow}" onclick={shareMore} title="More sharing options">
								<IconMore class="h-4 w-4" />
							</button>
							<span class="text-xs opacity-70">More</span>
						</div>
					</div>
					{#if copyState === 'error'}
						<p class="mt-2 text-sm text-error">Could not copy. Please copy manually.</p>
					{/if}
					{#if downloadState === 'error'}
						<p class="mt-2 text-sm text-error">Could not generate card download.</p>
					{/if}

				</div>
				<div class="modal-backdrop">
					<button type="button" onclick={() => (showShareModal = false)}>close</button>
				</div>
			</div>
		{/if}
		{#if CREATOR_NOTIFICATIONS_UI_ENABLED && showNotifyModal}
			<div class="modal modal-open">
				<div class="modal-box max-w-md">
					<h3 class="text-xl font-semibold">{notifications?.title ?? `Follow ${name ?? 'creator'} updates`}</h3>
					<p class="mt-2 text-sm opacity-80">
						{notifications?.description ?? 'Get notified when this creator posts new drops, links, and announcements.'}
					</p>

					<div class="mt-4 space-y-3">
						{#if isMobileDevice() && !isStandaloneDisplayMode()}
							<p class="text-sm">
								On mobile, install this page as an app first for the best notification support.
							</p>
							<button
								type="button"
								class="btn btn-outline btn-sm"
								onclick={promptInstallIfAvailable}
							>
								<IconDownloadMobile class="h-4 w-4" />
								Install app
							</button>
							<p class="text-xs opacity-70">
								If install does not open, use your browser menu and choose “Add to Home Screen”.
							</p>
						{/if}
						{#if notificationTopics.length}
							<div class="rounded-box border border-base-300 p-3">
								<p class="mb-2 text-sm font-medium">Notification types</p>
								<div class="space-y-2">
									{#each notificationTopics as topic}
										<label class="label cursor-pointer justify-start gap-3 p-0">
											<input
												type="checkbox"
												class="checkbox checkbox-primary checkbox-sm"
												checked={selectedTopicIds.includes(topic.id)}
												onchange={() => toggleTopic(topic.id)}
											/>
											<span class="label-text">{topic.label}</span>
										</label>
									{/each}
								</div>
							</div>
						{/if}

						<button
							type="button"
							class="btn btn-primary w-full"
							onclick={enableNotifications}
							disabled={notifyState === 'loading' || (notificationTopics.length > 0 && selectedTopicIds.length === 0)}
						>
							{notifyState === 'loading' ? 'Enabling…' : 'Enable notifications'}
						</button>
						{#if notificationTopics.length > 0 && selectedTopicIds.length === 0}
							<p class="text-xs opacity-70">Select at least one notification type.</p>
						{/if}
						{#if notifyState === 'success'}
							<p class="text-sm text-success">{notifyMessage}</p>
						{:else if notifyState === 'error'}
							<p class="text-sm text-error">{notifyMessage}</p>
						{/if}
					</div>

					<div class="modal-action">
						<button type="button" class="btn btn-ghost" onclick={() => (showNotifyModal = false)}>
							Close
						</button>
					</div>
				</div>
				<div class="modal-backdrop">
					<button type="button" onclick={() => (showNotifyModal = false)}>close</button>
				</div>
			</div>
		{/if}
	</section>
{:else}
	<p class="text-sm text-warning">Creator profile missing name.</p>
{/if}

