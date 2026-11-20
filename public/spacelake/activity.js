// Per-page anonymous activity. No cookies, storage, query strings, or browser identity.
if (navigator.doNotTrack !== '1' && !navigator.globalPrivacyControl) {
  const session = crypto.randomUUID();
  let sequence = 0;
  let last = performance.now();
  let activeMs = 0;
  let visible = !document.hidden;
  function accrue() {
    const now = performance.now();
    if (visible) activeMs += Math.min(30000, now - last);
    last = now;
  }
  function send() {
    accrue();
    const body = JSON.stringify({ session, sequence: ++sequence, activeMs: Math.round(activeMs), visible });
    activeMs = 0;
    const endpoint = new URL('./api/events', import.meta.url);
    if (!navigator.sendBeacon?.(endpoint, new Blob([body], { type: 'application/json' }))) {
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    }
  }
  document.addEventListener('visibilitychange', () => { accrue(); visible = !document.hidden; send(); });
  addEventListener('pagehide', () => { accrue(); visible = false; send(); });
  setInterval(send, 15000);
  send();
}
