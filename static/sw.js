self.addEventListener('push', (event) => {
	if (!event.data) return;
	let data = {};
	try {
		data = event.data.json();
	} catch {
		return;
	}

	const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'New update';
	const body = typeof data.body === 'string' ? data.body : '';
	const url = typeof data.url === 'string' && data.url.trim() ? data.url.trim() : '/';

	event.waitUntil(
		self.registration.showNotification(title, {
			body,
			data: { url },
			icon: 'https://imagedelivery.net/zdMtZgMUbYs7-R4-dRSl-Q/907061a8-51ae-454c-c739-83935616f900/public',
			badge: 'https://imagedelivery.net/zdMtZgMUbYs7-R4-dRSl-Q/907061a8-51ae-454c-c739-83935616f900/public'
		})
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const targetUrl = event.notification?.data?.url || '/';
	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
			for (const client of clients) {
				if (client.url.includes(self.location.origin) && 'focus' in client) {
					client.navigate(targetUrl);
					return client.focus();
				}
			}
			if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
			return Promise.resolve();
		})
	);
});
