// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import 'unplugin-icons/types/svelte';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			site?: import('$lib/server/sites').ResolvedSite | null;
			/** When set, path-style URLs on gloop.gg use these slug parts (first path segment is the site id). */
			gloopGgPageSlugParts?: string[];
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env?: Record<string, unknown>;
		}
	}
}

export {};
