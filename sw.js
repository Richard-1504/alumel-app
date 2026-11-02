// Alumel: guarda la app y sus librerías para que abra sin internet.
const VERSION = "alumel-1.12.0";
const LOCAL = ["./", "index.html", "firebase-config.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable.png", "apple-touch-icon.png", "logo-marca.png", "logo-doc.jpg"];
const CDN = [
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(async c => {
    await c.addAll(LOCAL);
    await Promise.all(CDN.map(u => fetch(u, {mode: "no-cors"}).then(r => c.put(u, r)).catch(() => {})));
  }).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  // Firebase (base de datos e inicio de sesión) maneja su propia conexión y caché.
  if (/googleapis\.com|firebaseio|identitytoolkit|securetoken/.test(url.host)) return;
  const esLocal = url.origin === location.origin;
  if (esLocal && (req.mode === "navigate" || /\/(index\.html|firebase-config\.js)?$/.test(url.pathname))) {
    // Primero la red para recibir actualizaciones; si no hay señal, la copia guardada.
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match("index.html"))));
    return;
  }
  // Librerías, fuentes e íconos: la copia guardada primero.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === "opaque") { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
    return r;
  })));
});
