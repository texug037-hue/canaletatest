const CACHE="canaleta-v62";
const FILES=[
  "./",
  "./index.html",
  "./app1v4.js",
  "./app2v6.js",
  "./app3v3.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
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

  // O documento principal (index.html / navegação) sempre busca da rede
  // primeiro. É ele que decide quais versões de app1v4.js/app2v6.js/app3v3.js
  // carregar, então não pode ficar preso em cache velho.
  const isHTML = e.request.mode === "navigate" || url.pathname === "/" || url.pathname.endsWith("/index.html");
  if(isHTML){
    e.respondWith(
      fetch(e.request, {cache:"reload"}).then(res=>{
        if(res&&res.ok){
          const c=res.clone();
          caches.open(CACHE).then(ca=>ca.put(e.request,c));
        }
        return res;
      }).catch(()=>caches.match(e.request).then(r=>r||caches.match("./index.html")))
    );
    return;
  }

  // Demais arquivos (scripts versionados, ícones, etc.) continuam
  // cache-first: como a URL tem "?v=", cada versão é um recurso novo.
  e.respondWith(
    caches.match(e.request).then(r=>{
      if(r)return r;
      return fetch(e.request).then(res=>{
        if(res&&res.ok){
          const c=res.clone();
          caches.open(CACHE).then(ca=>ca.put(e.request,c));
        }
        return res;
      }).catch(()=>caches.match("./index.html"));
    })
  );
});
