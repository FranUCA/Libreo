const CACHE = 'libreo-v4';

function isBook(u){ return u.includes('raw.githubusercontent.com'); }
function isExternal(u){
  return u.startsWith('blob:') || u.includes('google.com') ||
         u.includes('googleapis.com') || u.includes('gutenberg.org') ||
         u.includes('allorigins.win') || u.includes('corsproxy.io');
}
function isShell(u){
  if(isBook(u) || isExternal(u)) return false;
  try {
    const scope = new URL(self.registration.scope);
    const req   = new URL(u);
    return req.origin === scope.origin && req.pathname.startsWith(scope.pathname);
  } catch { return false; }
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.add(self.registration.scope).catch(()=>{}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  const url = e.request.url;
  if(url.startsWith('blob:') || url.startsWith('chrome-extension:')) return;

  if(isShell(url)){
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          fetch(e.request)
            .then(res => { if(res && res.ok) cache.put(e.request, res.clone()); })
            .catch(()=>{});
          if(cached) return cached;
          return fetch(e.request)
            .then(res => { if(res.ok) cache.put(e.request, res.clone()); return res; });
        })
      )
    );
    return;
  }

  if(isBook(url)){
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(hit => hit ||
          fetch(e.request).then(res => {
            if(res.ok) cache.put(e.request, res.clone());
            return res;
          })
        )
      )
    );
    return;
  }
});
