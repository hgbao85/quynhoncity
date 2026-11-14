// Service worker: cho phép cài game như ứng dụng và mở nhanh ở các lần sau.
//   - Trang và mã (index.html, /assets/*): mạng trước, lỗi mạng thì dùng bản đã lưu (để luôn có bản mới nhất).
//   - Dữ liệu bản đồ, mô hình, biểu tượng (/data/*, /models/*, /icons/*): dùng bản đã lưu ngay, đồng thời
//     tải bản mới ở nền cho lần sau. Ô bản đồ chỉ được lưu khi người chơi đã đi qua khu đó.
//   - Dịch vụ bên ngoài (thời tiết, phông chữ): không can thiệp.
// Đổi VERSION để xoá bộ nhớ cũ khi dữ liệu thay đổi lớn.
const VERSION = 'qn3d-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/data/world.json', '/data/terrain.bin'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const p = url.pathname;
  if (/^\/(data|models|icons)\//.test(p)) {
    // dùng bản đã lưu, tải lại ở nền
    e.respondWith(caches.open(VERSION).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (req.mode === 'navigate' || p === '/' || p.endsWith('.html') || p.startsWith('/assets/') || p.endsWith('.webmanifest')) {
    // mạng trước, lỗi thì dùng bản đã lưu
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
      return res;
    }).catch(async () => (await caches.match(req)) || caches.match('/')));
  }
});
