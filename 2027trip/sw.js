/* 宮城旅行のしおり：電波が悪くても ひらけるように スマホに ほぞんする */
const VER = 'miyagi-v1';
const CORE = [
  './', 'index.html', 'kids.html', 'game/', 'game/index.html',
  'apple-touch-icon.png', 'favicon.png', 'icon.svg',
  'spot-img/lapras.jpg', 'spot-img/lapras-cut.png', 'spot-img/abe.jpg', 'spot-img/murakami.jpg',
  'spot-img/gyutan.jpg', 'spot-img/planetarium.jpg', 'spot-img/hotel.jpg', 'spot-img/strawberry.jpg',
];
// ほぞんして よい そとの ファイル（フォント・アイコン・地図の部品・共有の しくみ）
const CDN = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|www\.gstatic\.com\/firebasejs)\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function put(req, res) {
  if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(VER).then(c => c.put(req, copy)).catch(() => {}); }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;

  // ページ（HTML）：まず さいしんを とりにいく。3びょうで まにあわなければ ほぞんした ものを だす
  if (req.mode === 'navigate' || (same && /\.html$|\/$/.test(url.pathname))) {
    e.respondWith(new Promise(resolve => {
      let done = false;
      const fromCache = () => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'));
      const timer = setTimeout(() => fromCache().then(r => { if (r && !done) { done = true; resolve(r); } }), 3000);
      fetch(req).then(res => { put(req, res); if (!done) { done = true; clearTimeout(timer); resolve(res); } })
        .catch(() => fromCache().then(r => { if (!done) { done = true; clearTimeout(timer); resolve(r || Response.error()); } }));
    }));
    return;
  }

  // しおりの 画像など・そとの フォントや アイコン：ほぞんした ものを すぐ だして、うらで あたらしく する
  if ((same && !url.pathname.endsWith('sw.js')) || CDN.test(req.url)) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => put(req, res)).catch(() => hit);
      return hit || net;
    }));
  }
  // それ以外（共有データ・天気・地図・プレビュー画像）は いつもどおり
});
