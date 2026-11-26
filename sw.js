/*
 * Service Worker: macht die Seite offline nutzbar und als App installierbar.
 *
 * Strategie "zuerst Netz": Ist das Gerät online, kommt immer die neueste Fassung
 * vom Server (Updates sind sofort sichtbar). Nur ohne Internet wird die
 * gespeicherte Kopie genutzt. Antwortet das Netz zu langsam (z. B. in der U-Bahn), zeigen wir nach
 * kurzer Wartezeit die gespeicherte Kopie; die Antwort aus dem Netz aktualisiert den Speicher trotzdem.
 * VERSION nur erhöhen, wenn sich die Liste DATEIEN ändert.
 */
const VERSION = "v19";
const CACHE = "schulwechsel-helfer-" + VERSION;

const DATEIEN = [
    "./",
    "index.html",
    "en/",
    "tr/",
    "ar/",
    "uk/",
    "ru/",
    "impressum.html",
    "datenschutz.html",
    "kontakt.html",
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
    "js/aufnahme.js",
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
    "js/kontakt-texte.js",
    "js/kontakt.js",
    "js/besucherzaehler.js",
    "data/schulen.js",
    "data/schulinfos.js",
    "data/aufnahme.js",
    "data/schulen-bb.js",
    "data/schulen-by.js",
    "vendor/leaflet/leaflet.js",
    "vendor/leaflet/leaflet.css",
    "img/fotos/berlin-dom-baeume.webp",
    "img/fotos/berlin-dom.webp",
    "img/fotos/berlin-fernsehturm.webp",
    "img/fotos/berlin-stadt.webp",
    "img/fotos/stifte-bunt.webp"
];

// Wartezeit, bis bei langsamem Netz die gespeicherte Kopie gezeigt wird
const WARTEZEIT_MS = 3500;

// Fotos sind nur Schmuck: Fehlt eins, soll die Installation trotzdem klappen.
const IST_SCHMUCK = (datei) => datei.startsWith("img/");

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => Promise.all([
        cache.addAll(DATEIEN.filter((d) => !IST_SCHMUCK(d))),
        Promise.allSettled(DATEIEN.filter(IST_SCHMUCK).map((d) => cache.add(d)))
    ])));
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
    const ausSpeicher = async () => {
        const cache = await caches.open(CACHE);
        const gespeichert = await cache.match(anfrage, { ignoreSearch: true });
        if (gespeichert) return gespeichert;
        if (anfrage.mode === "navigate") return cache.match("index.html");
        return undefined;
    };
    const ausNetz = netz.then((antwort) => {
        if (antwort.ok && antwort.type === "basic") {
            const kopie = antwort.clone();
            caches.open(CACHE).then((cache) => cache.put(anfrage, kopie));
        }
        return antwort;
    });
    event.respondWith(new Promise((fertig) => {
        let erledigt = false;
        const gib = (antwort) => { if (!erledigt && antwort) { erledigt = true; fertig(antwort); } };
        // Netz zu langsam: gespeicherte Kopie zeigen (falls vorhanden), Netz läuft im Hintergrund weiter
        const uhr = setTimeout(() => ausSpeicher().then(gib), WARTEZEIT_MS);
        ausNetz
            .then((antwort) => { clearTimeout(uhr); gib(antwort); })
            .catch(async () => {
                clearTimeout(uhr);
                gib((await ausSpeicher()) || Response.error());
            });
    }));
    event.waitUntil(ausNetz.catch(() => undefined));
});
