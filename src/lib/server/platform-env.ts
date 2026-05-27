export type R2ObjectBody = {
	body: ReadableStream;
	size: number;
};

export type R2BucketBinding = {
	put(
		key: string,
		value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob | null,
		options?: { httpMetadata?: { contentType?: string } }
	): Promise<unknown>;
	get(key: string): Promise<R2ObjectBody | null>;
	delete(key: string): Promise<void>;
};

/** D1 + secrets from wrangler (`binding = "DB"`). */
export type WorkerBindings = {
	DB?: {
		prepare(query: string): {
			bind(...values: unknown[]): {
				first<T = Record<string, unknown>>(): Promise<T | null>;
				all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
				run(): Promise<unknown>;
			};
		};
	};
	UPLOADS?: R2BucketBinding;
	STREAM?: unknown;
	CLOUDFLARE_ACCOUNT_ID?: string;
	CLOUDFLARE_API_TOKEN?: string;
	GOOGLE_OAUTH_CLIENT_ID?: string;
	GOOGLE_OAUTH_CLIENT_SECRET?: string;
	GOOGLE_OAUTH_REDIRECT_URI?: string;
	UPLOAD_SESSION_SECRET?: string;
	[key: string]: unknown;
};

/**
 * SvelteKit adapter-cloudflare passes bindings on `platform.env`.
 * Some runtimes also expose bindings on `platform` directly.
 */
export function getWorkerBindings(platform: App.Platform | undefined): WorkerBindings {
	if (!platform) return {};
	const raw = platform as WorkerBindings & { env?: WorkerBindings };
	if (raw.env?.DB) return raw.env;
	if (raw.DB) return raw;
	return raw.env ?? {};
}

export function getDbBinding(platform: App.Platform | undefined): NonNullable<WorkerBindings['DB']> {
	const bindings = getWorkerBindings(platform);
	if (!bindings.DB) {
		throw new Error('DB binding is not configured');
	}
	return bindings.DB;
}

export function getUploadsBucket(
	platform: App.Platform | undefined
): NonNullable<WorkerBindings['UPLOADS']> {
	const bindings = getWorkerBindings(platform);
	if (!bindings.UPLOADS) {
		throw new Error('UPLOADS R2 binding is not configured');
	}
	return bindings.UPLOADS;
}
