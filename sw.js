const CACHE = "canaleta-v45";

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(["./", "./index.html"]))
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(Promise.all([
    clients.claim(),
    caches.keys().then(ks => Promise.all(
      ks.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  ]));
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then(r => {
      if (r) return r;
      return fetch(e.request).then(res => {
        if (res && res.ok && res.type === "basic") {
          const c = res.clone();
          caches.open(CACHE).then(ca => ca.put(e.request, c));
        }
        return res;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
