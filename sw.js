/* InvestidorBR — Service Worker v1.0 */

const CACHE_NAME  = 'investidorbr-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

// Instalar e cachear assets estáticos
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
});

// Ativar e limpar caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Estratégia: Network First para APIs, Cache First para estáticos
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // APIs externas: Network only (dados ao vivo)
  const isAPI = url.hostname.includes('awesomeapi') ||
                url.hostname.includes('brasilapi') ||
                url.hostname.includes('brapi') ||
                url.hostname.includes('bcb.gov.br') ||
                url.hostname.includes('googleapis.com');

  if (isAPI) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Estáticos: Cache First com fallback para network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

// Push notifications (para alertas futuros via backend)
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json().catch(() => ({ title:'InvestidorBR', body: event.data.text() }));
  event.waitUntil(
    self.registration.showNotification(data.title || 'InvestidorBR 🔔', {
      body: data.body || 'Novo alerta de investimento',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
