const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const LS = require("../js/land-suche.js");
const L = require("../js/laender.js");
const I18n = require("../js/i18n.js");
const LT = require("../js/i18n-laender.js").TEXTE;

global.window = {};
require("../data/schulen-bb.js");
require("../data/schulen-by.js");
const DATEN = global.window.LANDSCHULEN;

// Grobe Landesgrenzen (Breite, Länge), um falsche Koordinaten zu erkennen.
const GRENZEN = { BB: [51.3, 53.6, 11.2, 14.8], BY: [47.2, 50.6, 8.9, 13.9] };

for (const code of ["BB", "BY"]) {
    test(code + ": amtliche Schuldaten sind vollständig und passen zum Land", () => {
        const d = DATEN[code];
        const land = L.LAND[code];
        assert.ok(d, "Daten fehlen");
        assert.equal(land.schuldaten, "data/schulen-" + code.toLowerCase() + ".js");
        assert.match(d.stand, /^\d{4}-\d{2}-\d{2}$/);
        assert.ok(d.quelle && d.lizenz && d.namensnennung);
        assert.match(d.lizenzUrl, /^https:\/\//);
        assert.ok(d.schulen.length > 200);
        const ids = new Set();
        const [s0, s1, w0, w1] = GRENZEN[code];
        for (const s of d.schulen) {
            assert.ok(land.arten[s.a], s.n + ": Schulart " + s.a);
            assert.ok(s.n && s.o, "Name und Ort");
            assert.ok(s.lat > s0 && s.lat < s1 && s.lon > w0 && s.lon < w1, s.n + ": Koordinaten");
            assert.ok(!ids.has(s.id), "doppelte id " + s.id);
            ids.add(s.id);
        }
        for (const a of Object.keys(land.arten)) {
            assert.ok(d.schulen.some((s) => s.a === a), "keine Schule der Art " + a);
        }
    });
}

test("Bayern: nur staatliche Schulen, das wird gekennzeichnet", () => {
    assert.equal(DATEN.BY.nurStaatlich, true);
    assert.ok(DATEN.BY.schulen.every((s) => s.p === 0));
});

test("Suche nach Postleitzahl, Ort und Ortsanfang", () => {
    const d = DATEN.BB;
    const plz = Object.keys(d.plz)[0];
    assert.ok(LS.findeMitte(d, plz).mitte);
    assert.ok(LS.findeMitte(d, "Potsdam").mitte);
    assert.ok(LS.findeMitte(d, "  potsdam ").mitte);
    assert.equal(LS.findeMitte(d, "forst").ort, "forst (lausitz)");
    assert.equal(LS.findeMitte(d, "").fehler, "ls_err_empty");
    assert.equal(LS.findeMitte(d, "12").fehler, "ls_err_unknown");
    assert.equal(LS.findeMitte(d, "Atlantis").fehler, "ls_err_unknown");
});

test("Ergebnis: nach Entfernung sortiert, Filter für Art, Umkreis und Privatschulen", () => {
    const d = DATEN.BB;
    const r = LS.suche(d, { eingabe: "Potsdam", arten: ["gym", "ges", "os"], privat: true, radiusKm: 10 });
    assert.equal(r.ok, true);
    assert.ok(r.schulen.length > 5);
    for (let i = 1; i < r.schulen.length; i++) assert.ok(r.schulen[i - 1].km <= r.schulen[i].km);
    assert.ok(r.schulen.every((s) => s.km <= 10));
    const nurGym = LS.suche(d, { eingabe: "Potsdam", arten: ["gym"], privat: false, radiusKm: 10 });
    assert.ok(nurGym.schulen.length > 0);
    assert.ok(nurGym.schulen.every((s) => s.a === "gym" && !s.p));
    const hier = LS.suche(d, { mitte: [52.39, 13.06], arten: ["gym"], privat: true, radiusKm: 5 });
    assert.equal(hier.ok, true);
    assert.equal(LS.suche(d, { eingabe: "", arten: ["gym"], radiusKm: 5 }).ok, false);
});

test("Alle Textschlüssel von land-suche.js gibt es in allen Sprachen", () => {
    const code = fs.readFileSync(path.join(__dirname, "..", "js", "land-suche.js"), "utf8");
    const schluessel = new Set([...code.matchAll(/\bt\("(\w+)"/g)].map((m) => m[1]));
    for (const m of code.matchAll(/"(ls_err_\w+)"/g)) schluessel.add(m[1]);
    for (const s of I18n.SPRACHEN) {
        const alle = Object.assign({}, I18n.TEXTE[s.code], LT[s.code]);
        for (const k of schluessel) assert.ok(alle[k], s.code + ": " + k);
    }
});

test("Brandenburg: Filter nach Fremdsprache und Ganztag", () => {
    const d = DATEN.BB;
    const basis = { eingabe: "Potsdam", arten: ["gym", "ges", "os"], privat: true, radiusKm: 25 };
    const latein = LS.suche(d, Object.assign({ sprache: "Latein" }, basis));
    assert.ok(latein.schulen.length > 0);
    assert.ok(latein.schulen.every((s) => s.sp.includes("Latein")));
    const gt = LS.suche(d, Object.assign({ ganztag: true }, basis));
    assert.ok(gt.schulen.length > 0);
    assert.ok(gt.schulen.every(LS.hatGanztag));
    assert.ok(d.schulen.some((s) => /^\d{4}\/\d{4}$/.test(s.spj)), "Schuljahr der Sprachangaben fehlt");
});

test("Bayern: Webseiten nur geprüft, mit Prüfdatum und passend zur Quelle", () => {
    const web = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "quellen", "by-webseiten.json"), "utf8"));
    const mitWeb = DATEN.BY.schulen.filter((s) => s.w);
    assert.ok(mitWeb.length > 1000, "zu wenige Webseiten");
    for (const s of mitWeb) {
        assert.match(s.w, /^https?:\/\/[^\s/]+\.[a-z]{2,}/i, s.n + ": url");
        assert.doesNotMatch(s.w, /km\.bayern\.de|wikipedia|facebook|instagram|reset|login|passwort/i, s.n + ": url-Art");
        assert.match(s.wg, /^\d{4}-\d{2}-\d{2}$/, s.n + ": Prüfdatum");
        const q = web.schulen[s.n + "|" + s.z];
        assert.ok(q && q.url === s.w && q.geprueft === s.wg, s.n + ": nicht in quellen/by-webseiten.json");
        assert.ok(web.art[q.art], s.n + ": Art der Quelle");
    }
    assert.equal(mitWeb.length, Object.keys(web.schulen).length, "jeder Eintrag passt zu genau einer Schule");
    assert.ok(DATEN.BB.schulen.every((s) => !s.wg), "Brandenburg hat amtliche Webseiten");
});

test("Webseiten-Zusammenführung nach Name und PLZ, nicht nach id", async () => {
    const { webseitenAnwenden } = await import("../scripts/laender-schulen-laden.mjs");
    const schulen = [{ n: "A-Schule", z: "80331" }, { n: "A-Schule", z: "90402" }, { n: "B-Schule", z: "80331" }];
    const n = webseitenAnwenden(schulen, { schulen: {
        "A-Schule|90402": { url: "https://a.example", geprueft: "2026-11-25" },
        "B-Schule|80331": { url: "javascript:alert(1)", geprueft: "2026-11-25" }
    } });
    assert.equal(n, 1);
    assert.equal(schulen[0].w, undefined);
    assert.equal(schulen[1].w, "https://a.example");
    assert.equal(schulen[1].wg, "2026-11-25");
    assert.equal(schulen[2].w, undefined, "nur http(s)");
});
