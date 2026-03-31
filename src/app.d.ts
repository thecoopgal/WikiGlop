// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import 'unplugin-icons/types/svelte';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			site?: import('$lib/server/sites').ResolvedSite | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
