const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { einsetzen } = require("../scripts/texte-einsetzen.js");

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
