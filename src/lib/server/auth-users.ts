import { getDbBinding } from '$lib/server/platform-env';
import { newId, normalizeEmail } from '$lib/server/auth-crypto';

export type AuthRole = 'user' | 'admin';

export type AuthUser = {
	id: string;
	email: string;
	emailNormalized: string;
	role: AuthRole;
	createdAt: string;
	lastLoginAt: string | null;
};

type UserRow = {
	id: string;
	email: string;
	email_normalized: string;
	role: string;
	created_at: string;
	last_login_at: string | null;
};

function rowToUser(row: UserRow): AuthUser {
	return {
		id: row.id,
		email: row.email,
		emailNormalized: row.email_normalized,
		role: row.role === 'admin' ? 'admin' : 'user',
		createdAt: row.created_at,
		lastLoginAt: row.last_login_at
	};
}

export async function findUserByNormalizedEmail(
	platform: App.Platform | undefined,
	emailNormalized: string
): Promise<AuthUser | null> {
	const db = getDbBinding(platform);
	const row = await db
		.prepare(
			`SELECT id, email, email_normalized, role, created_at, last_login_at
       FROM users WHERE email_normalized = ? LIMIT 1`
		)
		.bind(emailNormalized)
		.first<UserRow>();
	return row ? rowToUser(row) : null;
}

export async function findUserById(
	platform: App.Platform | undefined,
	userId: string
): Promise<AuthUser | null> {
	const db = getDbBinding(platform);
	const row = await db
		.prepare(
			`SELECT id, email, email_normalized, role, created_at, last_login_at
       FROM users WHERE id = ? LIMIT 1`
		)
		.bind(userId)
		.first<UserRow>();
	return row ? rowToUser(row) : null;
}

/** Create user if missing; always returns the user for this email. */
export async function upsertUserByEmail(
	platform: App.Platform | undefined,
	emailRaw: string
): Promise<AuthUser> {
	const emailNormalized = normalizeEmail(emailRaw);
	if (!emailNormalized) {
		throw new Error('Invalid email');
	}

	const existing = await findUserByNormalizedEmail(platform, emailNormalized);
	if (existing) return existing;

	const db = getDbBinding(platform);
	const id = newId('usr');
	const displayEmail = emailRaw.trim();
	await db
		.prepare(
			`INSERT INTO users (id, email, email_normalized, role)
       VALUES (?, ?, ?, 'user')`
		)
		.bind(id, displayEmail, emailNormalized)
		.run();

	const created = await findUserById(platform, id);
	if (!created) throw new Error('Failed to create user');
	return created;
}

export async function touchUserLastLogin(
	platform: App.Platform | undefined,
	userId: string
): Promise<void> {
	const db = getDbBinding(platform);
	await db
		.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`)
		.bind(userId)
		.run();
}
