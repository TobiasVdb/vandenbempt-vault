self.addEventListener('push', event => {
  let payload;
  try { payload = event.data.json(); } catch { return; }
  if (!payload || typeof payload.title !== 'string' || typeof payload.body !== 'string') return;
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body, tag: typeof payload.tag === 'string' ? payload.tag : 'directorate',
    data: { url: self.registration.scope },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = self.registration.scope;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const target = windows.find(client => client.url.startsWith(url));
    if (target) return target.focus();
    return self.clients.openWindow(url);
  })());
});
