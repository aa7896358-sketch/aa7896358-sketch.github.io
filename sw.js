/* ═══════════════════════════════════════════
   RiderCom Service Worker
   - 앱 파일 캐싱 (오프라인 동작)
   - 백그라운드 오디오 유지
═══════════════════════════════════════════ */

const CACHE_NAME = 'ridercom-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Noto+Sans+KR:wght@300;400;500;700&family=Share+Tech+Mono&display=swap'
];

/* ── Install: 정적 파일 캐싱 ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('http')));
    }).then(() => self.skipWaiting())
  );
});

/* ── Activate: 이전 캐시 정리 ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: 캐시 우선, 없으면 네트워크 ── */
self.addEventListener('fetch', e => {
  // PeerJS, OpenWeatherMap, YouTube 등 외부 요청은 네트워크 직접
  const url = new URL(e.request.url);
  const externalHosts = ['0.peerjs.com', 'api.openweathermap.org', 'www.youtube.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
  if (externalHosts.some(h => url.hostname.includes(h))) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      if (resp && resp.status === 200 && e.request.method === 'GET') {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      }
      return resp;
    })).catch(() => caches.match('/index.html'))
  );
});

/* ── 백그라운드 동작 유지 메시지 ── */
self.addEventListener('message', e => {
  if (e.data === 'KEEP_ALIVE') {
    // 백그라운드에서 앱이 살아있도록 응답
    e.ports[0] && e.ports[0].postMessage('ALIVE');
  }
});
