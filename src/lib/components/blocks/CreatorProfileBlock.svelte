<script lang="ts">
	import IconInstagram from '~icons/mdi/instagram';
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
	site?: {
		id?: string;
		siteId?: string;
		name?: string;
		hosts?: string[];
		routing?: {
			gloop_gg_short_slug?: string;
		};
	};
	};

let { name, tagline, avatar, bio, short_links, site } = $props() as Props;

	const cardShadow = 'shadow-[0px_1px_3px_rgba(0,0,0,0.15)]';
const GLOOP_SHORT_HOST = 'gloop.gg';
const SHARE_ICON_URL =
	'https://imagedelivery.net/zdMtZgMUbYs7-R4-dRSl-Q/20ec55d3-136b-4ad6-f33a-12de645f5800/public';
const BRAND_ICON_URL =
	'https://imagedelivery.net/zdMtZgMUbYs7-R4-dRSl-Q/907061a8-51ae-454c-c739-83935616f900/public';
let showShareModal = $state(false);
let copyState = $state<'idle' | 'copied' | 'error'>('idle');
let qrCopyState = $state<'idle' | 'copied' | 'error'>('idle');
let showQrCode = $state(false);
let shareTouchStartX = 0;
let shareTouchActive = false;
let linkCopied = $state(false);
let linkCopiedTimer: ReturnType<typeof setTimeout> | null = null;
let downloadState = $state<'idle' | 'loading' | 'error'>('idle');

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
const qrUrl = $derived(
	shortUrl
		? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shortUrl)}`
		: ''
);

	function normalizeIconKey(value: string | undefined): string {
		return (value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
	}

	function iconComponent(icon: string | undefined) {
		const key = normalizeIconKey(icon);
		switch (key) {
			case 'instagram':
				return IconInstagram;
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

		// Standard US business card: 3.5in x 2in. Styled to match share-card mock.
		const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [3.5, 2] });
		pdf.setFillColor(244, 247, 250);
		pdf.rect(0, 0, 3.5, 2, 'F');
		pdf.setDrawColor(124, 58, 237);
		pdf.setLineWidth(0.01);
		pdf.rect(0.02, 0.02, 3.46, 1.96, 'S');

		pdf.setFont('helvetica', 'bold');
		pdf.setFontSize(0.22 * 72);
		pdf.setTextColor(10, 10, 10);
		pdf.text(name ?? site?.name ?? site?.id ?? 'Glop', 1.75, 0.42, { align: 'center' });

		if (avatarCircleDataUrl) {
			pdf.addImage(avatarCircleDataUrl, 'PNG', 0.22, 0.76, 0.62, 0.62);
			pdf.setDrawColor(40, 40, 40);
			pdf.setLineWidth(0.02);
			pdf.circle(0.53, 1.07, 0.31, 'S');
		}

		pdf.addImage(qrDataUrl, 'PNG', 1.33, 0.56, 0.84, 0.84);
		if (brandDataUrl) {
			pdf.addImage(brandDataUrl, 'PNG', 2.52, 0.79, 0.56, 0.56);
		}

		pdf.setFont('helvetica', 'bold');
		pdf.setFontSize(0.2 * 72);
		pdf.setTextColor(10, 10, 10);
		pdf.text(shortPathLabel || '', 1.75, 1.78, { align: 'center' });

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
</script>

{#if name}
	<section class="my-10">
		<div class="card bg-base-100 {cardShadow}">
			<div class="card-body items-center text-center">
				<div class="w-full flex justify-end">
					<button
						type="button"
						class="btn btn-ghost btn-sm btn-circle border border-base-300"
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
						<img src={SHARE_ICON_URL} alt="" class="h-5 w-5 object-contain" />
					</button>
				</div>
				<div class="flex flex-col items-center gap-4">
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
	</section>
{:else}
	<p class="text-sm text-warning">Creator profile missing name.</p>
{/if}

