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
