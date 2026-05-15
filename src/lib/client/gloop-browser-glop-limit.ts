import { normalizeGlopQuery } from '$lib/glop-query-normalize';

const CLIENT_ID_KEY = 'gloopglop:browser-client-id:v1';
const GLOOPED_NORMS_KEY = 'gloopglop:glooped-query-norms:v1';

function hasLocalStorage(): boolean {
	return typeof localStorage !== 'undefined';
}

/** Stable per-browser id (sent with glop POSTs; stored server-side with the question). */
export function getOrCreateBrowserClientId(): string {
	if (!hasLocalStorage()) {
		throw new Error('This browser does not support saving a glop id (localStorage unavailable).');
	}
	let id = localStorage.getItem(CLIENT_ID_KEY)?.trim();
	if (!id || !/^gg_[0-9a-f]{32}$/.test(id)) {
		id = `gg_${crypto.randomUUID().replace(/-/g, '')}`;
		localStorage.setItem(CLIENT_ID_KEY, id);
	}
	return id;
}

function readGloopedNormList(): string[] {
	if (!hasLocalStorage()) return [];
	try {
		const raw = localStorage.getItem(GLOOPED_NORMS_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((x): x is string => typeof x === 'string' && x.length > 0);
	} catch {
		return [];
	}
}

export function isQueryMarkedGloopedLocally(queryRaw: string): boolean {
	const norm = normalizeGlopQuery(queryRaw);
	if (norm.length < 2) return false;
	return new Set(readGloopedNormList()).has(norm);
}

export function markQueryGloopedLocally(queryRaw: string): void {
	if (!hasLocalStorage()) return;
	const norm = normalizeGlopQuery(queryRaw);
	if (norm.length < 2) return;
	const s = new Set(readGloopedNormList());
	s.add(norm);
	localStorage.setItem(GLOOPED_NORMS_KEY, JSON.stringify([...s]));
}
