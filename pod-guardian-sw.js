// sw.js - Site Guardian Execution Layer
const revokedDomains = new Set();

self.addEventListener('install', () => {
    self.skipWaiting(); // Force activation immediately
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim()); // Take control of all pages immediately
});

self.addEventListener('message', (event) => {
    if (event.data.action === "REVOKE_DOMAIN") {
        revokedDomains.add(event.data.domain);
    }
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Hard check against revoked domains
    if (revokedDomains.has(url.hostname)) {
        event.respondWith(
            new Response('Blocked by Site Guardian', { status: 403 })
        );
    }
});
