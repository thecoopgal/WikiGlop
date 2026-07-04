/** Hex-encoded random token (URL-safe). */
export function randomTokenHex(byteLength = 32): string {
	const bytes = new Uint8Array(byteLength);
	crypto.getRandomValues(bytes);
	return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(input: string): Promise<string> {
	const data = new TextEncoder().encode(input);
	const hash = await crypto.subtle.digest('SHA-256', data);
	return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function newId(prefix: string): string {
	const bytes = new Uint8Array(12);
	crypto.getRandomValues(bytes);
	return `${prefix}_${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export function normalizeEmail(raw: string): string | null {
	const email = raw.trim().toLowerCase();
	if (email.length < 3 || email.length > 254) return null;
	// Practical check; not full RFC.
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
	return email;
}
