// Service worker minimal : sa seule présence permet à Chrome de considérer
// l'application comme installable et d'émettre l'événement beforeinstallprompt.
// Aucune mise en cache : les requêtes (dont Supabase) partent normalement au réseau.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {})
