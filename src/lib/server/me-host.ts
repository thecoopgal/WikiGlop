const ME_NOTIFICATION_HOSTS = new Set(['me.gloopglop.com', 'me.localhost']);

/** Hostnames where `/` is the global creator-notifications hub (not the site index page). */
export function isMeNotificationsHost(hostname: string): boolean {
	return ME_NOTIFICATION_HOSTS.has(hostname.trim().toLowerCase());
}
