/* ZumaDash service worker – push notifications */
self.addEventListener('push', (event) => {
  let data = { title: 'ZumaDash', body: 'New update', icon: '/logo192.png', data: { url: '/' } };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    data.body = event.data ? event.data.text() : data.body;
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'ZumaDash', {
      body: data.body,
      icon: data.icon || '/logo192.png',
      badge: data.badge || data.icon || '/logo192.png',
      data: data.data || { url: '/' },
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
