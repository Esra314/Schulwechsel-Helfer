const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { einsetzen, seite, sitemap, SPRACHEN, DOMAIN } = require("../scripts/texte-einsetzen.js");

const wurzel = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(wurzel, "index.html"), "utf8");

test("Deutsche Texte stehen direkt in index.html (npm run texte ausführen)", () => {
    assert.equal(einsetzen(html), html);
    assert.ok(!/data-i18n="\w+"><\//.test(html), "leeres Textelement gefunden");
});

test("Sicherheitsregeln (CSP) sind auf allen Seiten gesetzt", () => {
    for (const datei of ["index.html", "impressum.html", "datenschutz.html", "kontakt.html"]) {
        const inhalt = fs.readFileSync(path.join(wurzel, datei), "utf8");
        assert.match(inhalt, /http-equiv="Content-Security-Policy"/, datei);
        assert.match(inhalt, /object-src 'none'/, datei);
    }
});

test("Keine Inline-Skripte und keine fremden Skripte in index.html", () => {
    const skripte = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
    assert.ok(skripte.length > 0);
    for (const [, attribute, inhalt] of skripte) {
        assert.equal(inhalt.trim(), "", "Inline-Skript gefunden");
        assert.doesNotMatch(attribute, /src="https?:/, "fremdes Skript gefunden");
    }
});

test("Menü-Links zeigen auf die fünf Bereiche", () => {
    const ziele = [...html.matchAll(/class="hauptmenue[\s\S]*?<\/nav>/g)][0][0]
        .match(/href="#([\w-]+)"/g).map((h) => h.slice(7, -1));
    assert.deepEqual(ziele, ["rechner", "schulsuche", "vergleich", "ratgeber", "fragen"]);
    for (const id of ziele) {
        assert.match(html, new RegExp('id="' + id + '" class="[^"]*\\bansicht\\b'), id);
    }
    // Weiter-Links zeigen ebenfalls auf Bereiche
    for (const [, id] of html.matchAll(/class="weiter[^"]*" href="#([\w-]+)"/g)) {
        assert.ok(ziele.includes(id), id);
    }
});

test("Link-Vorschau-Bild und Sitemap existieren", () => {
    assert.ok(fs.existsSync(path.join(wurzel, "icons/og-bild.png")));
    assert.match(fs.readFileSync(path.join(wurzel, "sitemap.xml"), "utf8"), /<loc>https:\/\//);
});

test("Datenschutz nennt GitHub Pages und hat eine Kurzfassung in allen Sprachen", () => {
    const ds = fs.readFileSync(path.join(wurzel, "datenschutz.html"), "utf8");
    assert.match(ds, /GitHub Pages/);
    assert.match(ds, /Data Privacy Framework/);
    for (const code of ["en", "tr", "ar", "uk", "ru"]) {
        const m = ds.match(new RegExp('<section id="' + code + '" lang="' + code + '"[\\s\\S]*?</section>'));
        assert.ok(m, "Kurzfassung fehlt: " + code);
        assert.match(m[0], /GitHub/, code);
        assert.match(m[0], /Data Privacy Framework/, code);
    }
});

test("Impressum und Datenschutz enthalten keine Platzhalter mehr", () => {
    for (const datei of ["impressum.html", "datenschutz.html"]) {
        const inhalt = fs.readFileSync(path.join(wurzel, datei), "utf8");
        assert.doesNotMatch(inhalt, /class="platzhalter"|\[Vorname|\[Anschrift|\[PLZ/, datei);
        assert.match(inhalt, /02977 Hoyerswerda/, datei);
    }
});

test("Teilen und Korrektur vorschlagen: nur der Seitenlink wird geteilt", () => {
    assert.match(html, /id="teilen"/);
    assert.match(html, /id="vorschlagLink" [^>]*data-i18n="footer_idea"/);
    const app = fs.readFileSync(path.join(wurzel, "js", "app.js"), "utf8");
    const teilen = app.match(/function teileSeite[\s\S]*?\n    \}\n/)[0];
    assert.match(teilen, /var url = sprachUrl\(aktuelleSprache\)/);
    assert.match(teilen, /pointer: coarse/, "Teilen-Menü nur auf Touch-Geräten, am Computer Link kopieren");
    assert.doesNotMatch(teilen, /note|ergebnis|plz/i, "keine Noten oder Eingaben im geteilten Text");
    assert.match(app, /details\.appendChild\(korrekturLink\(s\.n\)\)/);
});

test("Jede Sprache hat eine eigene Seite für Google (npm run texte ausführen)", () => {
    for (const { code, dir } of SPRACHEN.filter((s) => s.code !== "de")) {
        const datei = path.join(wurzel, code, "index.html");
        assert.ok(fs.existsSync(datei), "fehlt: " + code + "/index.html");
        const inhalt = fs.readFileSync(datei, "utf8");
        assert.equal(inhalt, seite(html, code), code + "/index.html ist veraltet");
        assert.match(inhalt, new RegExp('<html lang="' + code + '" dir="' + dir + '">'), code);
        assert.match(inhalt, new RegExp('<link rel="canonical" href="' + DOMAIN + code + '/">'), code);
        assert.match(inhalt, /<link rel="stylesheet" href="\.\.\/css\/style\.css">/, code);
        assert.match(inhalt, /<script src="\.\.\/js\/app\.js" defer><\/script>/, code);
        assert.doesNotMatch(inhalt, /\s(?:href|src)="(?:css|js|data|vendor|icons|img)\//, code + ": Pfad ohne ../");
    }
});

test("Alle Sprachseiten verweisen gegenseitig aufeinander (hreflang + x-default)", () => {
    for (const { code } of SPRACHEN) {
        const inhalt = fs.readFileSync(path.join(wurzel, code === "de" ? "" : code, "index.html"), "utf8");
        for (const s of SPRACHEN) {
            assert.ok(inhalt.includes('<link rel="alternate" hreflang="' + s.code + '" href="' + DOMAIN + (s.code === "de" ? "" : s.code + "/") + '">'), code + " -> " + s.code);
            assert.ok(inhalt.includes('data-lang="' + s.code + '"'), code + ": Sprach-Link " + s.code);
        }
        assert.ok(inhalt.includes('<link rel="alternate" hreflang="x-default" href="' + DOMAIN + '">'), code);
    }
});

test("Sitemap enthält alle Sprachseiten", () => {
    const sm = fs.readFileSync(path.join(wurzel, "sitemap.xml"), "utf8");
    const datum = sm.match(/<lastmod>([^<]+)<\/lastmod>/)[1];
    assert.equal(sm, sitemap(datum));
    assert.equal((sm.match(/<loc>/g) || []).length, SPRACHEN.length);
});
