type PushSetupResult =
	| { ok: true }
	| { ok: false; reason: 'unsupported' | 'no_public_key' | 'permission_denied' | 'subscribe_failed' | 'server_failed' };

export type BrowserPushSubscriptionSummary = {
	endpoint: string;
};

function base64UrlToUint8Array(base64Url: string): Uint8Array {
	const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
	const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
	return outputArray;
}

async function getPublicKey(): Promise<string> {
	const res = await fetch('/api/notifications/public-key');
	if (!res.ok) return '';
	const body = (await res.json()) as { publicKey?: string };
	return body.publicKey?.trim() ?? '';
}

export function canUsePushNotifications(): boolean {
	return (
		typeof window !== 'undefined' &&
		'serviceWorker' in navigator &&
		'Notification' in window &&
		'PushManager' in window
	);
}

export function isMobileDevice(): boolean {
	if (typeof navigator === 'undefined') return false;
	return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandaloneDisplayMode(): boolean {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

export async function registerForCreatorNotifications(input: {
	siteId?: string;
	pagePath: string;
	creatorName?: string;
	topicIds?: string[];
}): Promise<PushSetupResult> {
	if (!canUsePushNotifications()) return { ok: false, reason: 'unsupported' };

	const publicKey = await getPublicKey();
	if (!publicKey) return { ok: false, reason: 'no_public_key' };

	const permission = await Notification.requestPermission();
	if (permission !== 'granted') return { ok: false, reason: 'permission_denied' };

	let registration: ServiceWorkerRegistration;
	try {
		registration = await navigator.serviceWorker.register('/sw.js');
		await navigator.serviceWorker.ready;
	} catch {
		return { ok: false, reason: 'subscribe_failed' };
	}

	let subscription: PushSubscription | null = null;
	try {
		subscription = await registration.pushManager.getSubscription();
		if (!subscription) {
			subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: base64UrlToUint8Array(publicKey) as unknown as BufferSource
			});
		}
	} catch {
		return { ok: false, reason: 'subscribe_failed' };
	}
	if (!subscription) return { ok: false, reason: 'subscribe_failed' };

	const saveRes = await fetch('/api/notifications/subscribe', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			siteId: input.siteId ?? '',
			pagePath: input.pagePath,
			creatorName: input.creatorName ?? '',
			topicIds: Array.isArray(input.topicIds) ? input.topicIds : [],
			subscription: subscription.toJSON()
		})
	});

	if (!saveRes.ok) return { ok: false, reason: 'server_failed' };
	return { ok: true };
}

export async function getCurrentBrowserSubscription(): Promise<BrowserPushSubscriptionSummary | null> {
	if (!canUsePushNotifications()) return null;
	try {
		const registration = await navigator.serviceWorker.register('/sw.js');
		await navigator.serviceWorker.ready;
		const subscription = await registration.pushManager.getSubscription();
		if (!subscription?.endpoint) return null;
		return { endpoint: subscription.endpoint };
	} catch {
		return null;
	}
}

export async function unsubscribeFromCreatorPage(pagePath: string, siteId?: string): Promise<{ ok: boolean }> {
	const current = await getCurrentBrowserSubscription();
	if (!current?.endpoint) return { ok: false };
	const res = await fetch('/api/notifications/unsubscribe', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			endpoint: current.endpoint,
			siteId: siteId ?? '',
			pagePath
		})
	});
	return { ok: res.ok };
}
