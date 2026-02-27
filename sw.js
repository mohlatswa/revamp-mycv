const CACHE_NAME = 'revamp-mycv-v18';

const APP_SHELL = [
    './',
    './index.html',
    './login.html',
    './css/main.css',
    './css/wizard.css',
    './css/templates.css',
    './css/auth.css',
    './css/admin.css',
    './admin.html',
    './js/config.js',
    './js/auth.js',
    './js/subscription.js',
    './js/app.js',
    './js/wizard.js',
    './js/storage.js',
    './js/cv-manager.js',
    './js/settings.js',
    './js/session-timer.js',
    './js/skills-data.js',
    './js/ats-scorer.js',
    './js/cv-renderer.js',
    './js/pdf-export.js',
    './js/summary-generator.js',
    './js/login-page.js',
    './js/admin-page.js',
    './js/cv-parser.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

const CDN_RESOURCES = [
    'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://js.paystack.co/v1/inline.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

// Install: cache app shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(APP_SHELL);
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: cache-first for app shell, network-first for CDN
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // CDN resources: network-first
    if (CDN_RESOURCES.some(cdn => event.request.url.startsWith(cdn.substring(0, cdn.lastIndexOf('/'))))) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // App shell: network-first (always get fresh files, fallback to cache offline)
    if (url.origin === location.origin) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Everything else: network with cache fallback
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
