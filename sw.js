const CACHE="canaleta-v53";
const FILES=[
  "/",
  "/index.html",
  "/app1.js",
  "/app2.js",
  "/app3.js",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install",e=>{
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c=>
      Promise.all(FILES.map(f=>
        fetch(f).then(r=>{if(r.ok)c.put(f,r);}).catch(()=>{})
      ))
    )
  );
});

self.addEventListener("activate",e=>{
  e.waitUntil(Promise.all([
    clients.claim(),
    caches.keys().then(ks=>Promise.all(
      ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))
    ))
  ]));
});

self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const url=new URL(e.request.url);
  if(url.origin!==location.origin)return;
  e.respondWith(
    caches.match(e.request).then(r=>{
      if(r)return r;
      return fetch(e.request).then(res=>{
        if(res&&res.ok){
          const c=res.clone();
          caches.open(CACHE).then(ca=>ca.put(e.request,c));
        }
        return res;
      }).catch(()=>caches.match("/index.html"));
    })
  );
});
