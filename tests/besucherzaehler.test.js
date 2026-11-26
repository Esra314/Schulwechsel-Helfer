const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const wurzel = path.join(__dirname, "..");
const ZIEL = "https://oberschulhelferberlin.goatcounter.com";
const SEITEN = ["index.html", "impressum.html", "datenschutz.html", "kontakt.html",
    "en/index.html", "tr/index.html", "ar/index.html", "uk/index.html", "ru/index.html"];

test("Besucherzähler ist auf allen Seiten eingebunden und die CSP erlaubt nur GoatCounter dafür", () => {
    for (const datei of SEITEN) {
        const html = fs.readFileSync(path.join(wurzel, datei), "utf8");
        assert.match(html, /<script src="(\.\.\/)?js\/besucherzaehler\.js" defer><\/script>/, datei);
        const csp = html.match(/Content-Security-Policy" content="([^"]+)"/)[1];
        assert.match(csp, /script-src 'self';/, datei);
        assert.ok(csp.match(/connect-src [^;]+/)[0].includes(ZIEL), datei);
        assert.doesNotMatch(html, /gc\.zgo\.at/, "kein fremdes Skript: " + datei);
    }
});

test("Besucherzähler sendet nur Pfad, Titel und fremde Herkunft, ohne Cookies", () => {
    const js = fs.readFileSync(path.join(wurzel, "js/besucherzaehler.js"), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");
    assert.ok(js.includes('"' + ZIEL + '/count"'));
    assert.match(js, /credentials: "omit"/);
    assert.match(js, /referrerPolicy: "no-referrer"/);
    assert.match(js, /globalPrivacyControl/);
    assert.match(js, /doNotTrack/);
    assert.doesNotMatch(js, /localStorage|document\.cookie|screen\.|location\.search|ort\.search/);
    const sw = fs.readFileSync(path.join(wurzel, "sw.js"), "utf8");
    assert.match(sw, /"js\/besucherzaehler\.js"/);
});

test("Datenschutz beschreibt die Besucherzählung in allen Sprachen", () => {
    const ds = fs.readFileSync(path.join(wurzel, "datenschutz.html"), "utf8");
    assert.match(ds, /id="besucherzaehlung"/);
    assert.match(ds, /Art\. 6 Abs\. 1 lit\. f DSGVO/);
    for (const code of ["en", "tr", "ar", "uk", "ru"]) {
        const m = ds.match(new RegExp('<section id="' + code + '" lang="' + code + '"[\\s\\S]*?</section>'));
        assert.match(m[0], /GoatCounter/, code);
    }
});
