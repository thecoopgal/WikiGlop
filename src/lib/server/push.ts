import webpush from 'web-push';

export type PushSubscriptionInput = {
	endpoint: string;
	keys?: {
		p256dh?: string;
		auth?: string;
	};
};

export type PushDeliveryPayload = {
	title: string;
	body: string;
	url?: string;
	creatorName?: string;
};

type EnvLike = {
	DB?: {
		prepare(query: string): {
			bind(...values: unknown[]): {
				first<T = Record<string, unknown>>(): Promise<T | null>;
				all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
			};
		};
	};
	VAPID_PUBLIC_KEY?: string;
	VAPID_PRIVATE_KEY?: string;
	VAPID_SUBJECT?: string;
	CREATOR_NOTIFY_API_KEY?: string;
};

type StoredPushSubscription = {
	id: string;
	endpoint: string;
	p256dh: string;
	auth: string;
};

function randomId(prefix: string): string {
	return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

export function extractEnv(platform: App.Platform | undefined): EnvLike {
	return (((platform as { env?: EnvLike } | undefined)?.env as EnvLike | undefined) ?? {}) as EnvLike;
}

export function getVapidPublicKey(platform: App.Platform | undefined): string {
	const env = extractEnv(platform);
	return env.VAPID_PUBLIC_KEY?.trim() ?? '';
}

export function verifyCreatorNotifyKey(platform: App.Platform | undefined, provided: string): boolean {
	const env = extractEnv(platform);
	const expected = env.CREATOR_NOTIFY_API_KEY?.trim() ?? '';
	if (!expected || !provided) return false;
	return expected === provided.trim();
}

function getDb(platform: App.Platform | undefined): NonNullable<EnvLike['DB']> {
	const env = extractEnv(platform);
	if (!env.DB) throw new Error('DB binding is not configured');
	return env.DB;
}

function getVapidConfig(platform: App.Platform | undefined): {
	publicKey: string;
	privateKey: string;
	subject: string;
} {
	const env = extractEnv(platform);
	const publicKey = env.VAPID_PUBLIC_KEY?.trim() ?? '';
	const privateKey = env.VAPID_PRIVATE_KEY?.trim() ?? '';
	const subject = env.VAPID_SUBJECT?.trim() ?? '';
	if (!publicKey || !privateKey || !subject) {
		throw new Error('VAPID configuration is incomplete');
	}
	return { publicKey, privateKey, subject };
}

export async function upsertPushSubscription(params: {
	platform: App.Platform | undefined;
	siteId: string;
	pagePath: string;
	creatorName?: string;
	subscription: PushSubscriptionInput;
	userAgent?: string;
}) {
	const { platform, siteId, pagePath, creatorName, subscription, userAgent } = params;
	const endpoint = subscription.endpoint?.trim();
	const p256dh = subscription.keys?.p256dh?.trim();
	const auth = subscription.keys?.auth?.trim();
	if (!endpoint || !p256dh || !auth) {
		throw new Error('Invalid push subscription payload');
	}

	const db = getDb(platform);
	await db
		.prepare(
			`INSERT INTO push_subscriptions
        (id, site_id, page_path, creator_name, endpoint, p256dh, auth, user_agent, created_at, last_seen_at, revoked_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), NULL)
      ON CONFLICT(endpoint) DO UPDATE SET
        site_id = excluded.site_id,
        page_path = excluded.page_path,
        creator_name = excluded.creator_name,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        last_seen_at = datetime('now'),
        revoked_at = NULL`
		)
		.bind(
			randomId('pushsub'),
			siteId,
			pagePath,
			creatorName?.trim() || null,
			endpoint,
			p256dh,
			auth,
			userAgent?.trim() || null
		)
		.all();
}

export async function revokePushSubscription(params: {
	platform: App.Platform | undefined;
	endpoint: string;
}) {
	const endpoint = params.endpoint?.trim();
	if (!endpoint) return;
	const db = getDb(params.platform);
	await db
		.prepare(`UPDATE push_subscriptions SET revoked_at = datetime('now') WHERE endpoint = ?`)
		.bind(endpoint)
		.all();
}

async function activeSubscriptionsForPage(params: {
	platform: App.Platform | undefined;
	siteId: string;
	pagePath: string;
}): Promise<StoredPushSubscription[]> {
	const db = getDb(params.platform);
	const result = await db
		.prepare(
			`SELECT id, endpoint, p256dh, auth
       FROM push_subscriptions
       WHERE site_id = ? AND page_path = ? AND revoked_at IS NULL`
		)
		.bind(params.siteId, params.pagePath)
		.all<StoredPushSubscription>();
	return result.results ?? [];
}

export async function sendPushToPage(params: {
	platform: App.Platform | undefined;
	siteId: string;
	pagePath: string;
	payload: PushDeliveryPayload;
}) {
	const { platform, siteId, pagePath, payload } = params;
	const subscriptions = await activeSubscriptionsForPage({ platform, siteId, pagePath });
	if (!subscriptions.length) return { sent: 0, failed: 0, total: 0 };

	const vapid = getVapidConfig(platform);
	webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
	const pushPayload = JSON.stringify(payload);

	let sent = 0;
	let failed = 0;
	for (const sub of subscriptions) {
		try {
			await webpush.sendNotification(
				{
					endpoint: sub.endpoint,
					keys: { p256dh: sub.p256dh, auth: sub.auth }
				},
				pushPayload
			);
			sent += 1;
		} catch (error: any) {
			failed += 1;
			const statusCode = Number(error?.statusCode ?? 0);
			if (statusCode === 404 || statusCode === 410) {
				await revokePushSubscription({ platform, endpoint: sub.endpoint });
			}
		}
	}

	return { sent, failed, total: subscriptions.length };
}
