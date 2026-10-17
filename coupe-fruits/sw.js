// Hors ligne : réseau d'abord (les mises à jour arrivent tout de suite), copie en cache si pas de réseau.
// Le classement (Supabase) n'est jamais mis en cache : il doit rester à jour.
const CACHE = 'coupe-fruits';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || !r.url.startsWith('http') || new URL(r.url).hostname.endsWith('.supabase.co')) return;
  e.respondWith(fetch(r).then(res => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
    return res;
  }).catch(() => caches.match(r, { ignoreSearch: true }).then(hit => hit || Response.error())));
});
