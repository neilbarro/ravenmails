/* Ravenmails service worker — offline-capable app shell.
   Strategy:
   - App shell (HTML/CSS/JS/icons): stale-while-revalidate (instant load, refresh in background).
   - Google Drive API (articles): network-first, fall back to cache when offline.
   - Navigations: fall back to a cached page (offline.html, then index.html) if the network fails.
   Bump CACHE_VERSION whenever shell files change to retire old caches. */
const CACHE_VERSION = "ravenmails-v8";
const SHELL = [
  "./",
  "./index.html",
  "./article.html",
  "./about.html",
  "./editorial-standards.html",
  "./corrections.html",
  "./offline.html",
  "./styles.css",
  "./site.js",
  "./drive.js",
  "./ads.js",
  "./config.js",
  "./manifest.webmanifest",
  "./assets/logo-320.png",
  "./assets/favicon.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function (c) {
      // addAll is atomic; use individual puts so one missing optional file can't break install.
      return Promise.all(SHELL.map(function (u) {
        return c.add(u).catch(function () { /* ignore individual failures */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_VERSION) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function networkFirst(req) {
  return fetch(req).then(function (res) {
    var copy = res.clone();
    caches.open(CACHE_VERSION).then(function (c) { c.put(req, copy); });
    return res;
  }).catch(function () { return caches.match(req); });
}

function staleWhileRevalidate(req) {
  return caches.open(CACHE_VERSION).then(function (c) {
    return c.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.status === 200) c.put(req, res.clone());
        return res;
      }).catch(function () { return null; });
      return cached || network;
    });
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  // Articles from Google Drive API — always try the network first so edits show up.
  if (url.hostname.indexOf("googleapis.com") > -1) {
    e.respondWith(networkFirst(req));
    return;
  }

  // Same-origin app shell — stale-while-revalidate, with offline navigation fallback.
  if (url.origin === location.origin) {
    if (req.mode === "navigate") {
      e.respondWith(
        staleWhileRevalidate(req).then(function (res) {
          return res || caches.match("./offline.html") || caches.match("./index.html");
        })
      );
      return;
    }
    e.respondWith(staleWhileRevalidate(req));
  }
  // Other cross-origin requests fall through to the network by default.
});
