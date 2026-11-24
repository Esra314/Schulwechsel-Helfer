/*
 * Service Worker: macht die Seite offline nutzbar und als App installierbar.
 *
 * Strategie "zuerst Netz": Ist das Gerät online, kommt immer die neueste Fassung
 * vom Server (Updates sind sofort sichtbar). Nur ohne Internet wird die
 * gespeicherte Kopie genutzt. VERSION nur erhöhen, wenn sich die Liste DATEIEN ändert.
 */
const VERSION = "v13";
const CACHE = "schulwechsel-helfer-" + VERSION;

const DATEIEN = [
    "./",
    "index.html",
    "impressum.html",
    "datenschutz.html",
    "manifest.webmanifest",
    "favicon.svg",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "icons/icon-maskable-512.png",
    "icons/apple-touch-icon.png",
    "css/style.css",
    "js/rechner.js",
    "js/umkreis.js",
    "js/filter.js",
    "js/merkliste.js",
    "js/kalender.js",
    "js/i18n.js",
    "js/i18n-laender.js",
    "js/laender.js",
    "js/app.js",
    "js/land-suche.js",
    "js/land.js",
    "js/assistent-daten.js",
    "js/assistent.js",
    "data/schulen.js",
    "data/schulinfos.js",
    "data/schulen-bb.js",
    "data/schulen-by.js",
    "vendor/leaflet/leaflet.js",
    "vendor/leaflet/leaflet.css"
];

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(DATEIEN)));
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((namen) =>
            Promise.all(namen.filter((n) => n.startsWith("schulwechsel-helfer-") && n !== CACHE)
                .map((n) => caches.delete(n)))
        )
    );
    self.clients.claim();
});

// Fremde Server (Kartenbilder von OpenStreetMap) werden nicht abgefangen und nicht gespeichert.
self.addEventListener("fetch", (event) => {
    const anfrage = event.request;
    if (anfrage.method !== "GET" || new URL(anfrage.url).origin !== self.location.origin) {
        return;
    }
    // "no-cache": immer beim Server nachfragen, ob es eine neuere Fassung gibt
    // (sonst nutzt der Browser bis zu 10 Minuten eine alte Kopie aus dem HTTP-Cache)
    const netz = anfrage.mode === "navigate"
        ? fetch(anfrage.url, { cache: "no-cache", credentials: "same-origin" })
        : fetch(anfrage, { cache: "no-cache" });
    event.respondWith(
        netz
            .then((antwort) => {
                if (antwort.ok && antwort.type === "basic") {
                    const kopie = antwort.clone();
                    caches.open(CACHE).then((cache) => cache.put(anfrage, kopie));
                }
                return antwort;
            })
            .catch(async () => {
                const cache = await caches.open(CACHE);
                const gespeichert = await cache.match(anfrage, { ignoreSearch: true });
                if (gespeichert) return gespeichert;
                if (anfrage.mode === "navigate") {
                    const start = await cache.match("index.html");
                    if (start) return start;
                }
                return Response.error();
            })
    );
});
