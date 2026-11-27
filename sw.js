// Service worker de la version web : l'application (HTML, JS, CSS, icônes) reste disponible hors ligne.
// Les données (catalogue, profils) passent par l'API GitHub et sont gardées par l'application elle-même
// (IndexedDB, localStorage) : elles ne sont jamais mises en cache ici. Les affiches TMDb sont gardées au passage.
const APP = "mr-app-v1";
const POSTERS = "mr-posters-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(APP).then((c) => c.addAll(["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => ![APP, POSTERS].includes(k)).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.hostname === "api.github.com") return;                      // données : jamais de cache ici
  if (url.hostname === "image.tmdb.org") {
    e.respondWith(caches.open(POSTERS).then(async (c) => (await c.match(e.request)) || fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; })));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("vault.json")) return;                      // coffre : toujours à jour
  // Application : réseau d'abord (mises à jour), cache si hors ligne.
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(APP).then((c) => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html"))));
});
