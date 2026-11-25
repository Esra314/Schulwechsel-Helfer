const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const K = require("../js/kontakt.js");
const { TEXTE } = require("../js/kontakt-texte.js");

const wurzel = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(wurzel, "kontakt.html"), "utf8");

test("Kontakt-Texte gibt es in allen sechs Sprachen vollständig", () => {
    const de = Object.keys(TEXTE.de).sort();
    for (const l of ["en", "tr", "ar", "uk", "ru"]) {
        assert.deepEqual(Object.keys(TEXTE[l]).sort(), de, l);
        for (const k of de) assert.ok(TEXTE[l][k].trim(), `${l}.${k}`);
    }
    for (const [, k] of html.matchAll(/data-k="(\w+)"/g)) assert.ok(TEXTE.de[k], k);
});

test("Pflichtfelder und Einwilligung werden geprüft", () => {
    const gut = { vorname: "Ada", nachname: "Muster", email: "ada@example.de", nachricht: "Hallo", einwilligung: "ja" };
    assert.equal(K.pruefe(gut), null);
    assert.equal(K.pruefe({ ...gut, einwilligung: undefined }), "k_fehlt");
    assert.equal(K.pruefe({ ...gut, nachname: "  " }), "k_fehlt");
    assert.equal(K.pruefe({ ...gut, nachricht: "" }), "k_fehlt");
    assert.equal(K.pruefe({ ...gut, email: "ada@" }), "k_email_falsch");
    assert.equal(K.pruefe({ ...gut, email: "ada example.de" }), "k_email_falsch");
});

test("Honigtopf und Zeitsperre erkennen Bots", () => {
    assert.equal(K.istBot({ website: "" }, 10), false);
    assert.equal(K.istBot({ website: "http://spam" }, 10), true);
    assert.equal(K.istBot({}, 1), true);
    assert.equal(K.istBot({ _url: "x" }, 10), true);
    assert.equal(K.istBot({ website: "", _url: "" }, 10), false);
});

test("Antworten des Formular-Dienstes werden richtig gedeutet", () => {
    assert.equal(K.deuteAntwort(200, { success: true }), "ok");
    assert.equal(K.deuteAntwort(200, { success: false }), "k_fehler");
    assert.equal(K.deuteAntwort(429, null), "k_zuviel");
    assert.equal(K.deuteAntwort(403, { success: false, error: "origin_forbidden" }), "k_fehler");
});

test("Formular erst aktiv, wenn der Formdall-Schlüssel eingetragen ist", () => {
    assert.equal(K.istEingerichtet("https://api.formdall.de/api/v1/f/" + K.PLATZHALTER), false);
    assert.equal(K.istEingerichtet("https://api.formdall.de/api/v1/f/kx92m4"), true);
    assert.equal(K.istEingerichtet("http://api.formdall.de/api/v1/f/kx92m4"), false);
});

test("Kontaktseite: CSP erlaubt nur Formdall, Honigtopf und Einwilligung vorhanden", () => {
    const csp = html.match(/Content-Security-Policy" content="([^"]+)"/)[1];
    assert.match(csp, /connect-src https:\/\/api\.formdall\.de;/);
    assert.match(csp, /form-action https:\/\/api\.formdall\.de/);
    assert.match(csp, /script-src 'self';/);
    const action = html.match(/id="kontaktForm"[^>]*action="([^"]+)"/)[1];
    assert.ok(action.startsWith("https://api.formdall.de/api/v1/f/"));
    assert.match(html, /name="website" tabindex="-1"/);
    assert.match(html, /type="checkbox" name="einwilligung" value="ja" required/);
    for (const f of ["vorname", "nachname", "email", "anliegen", "nachricht"]) assert.match(html, new RegExp('name="' + f + '"'), f);
    assert.doesNotMatch(html, /<script\b[^>]*>[^<]+<\/script>/, "Inline-Skript");
});

test("Kontakt ist verlinkt und in der Datenschutzerklärung beschrieben", () => {
    const index = fs.readFileSync(path.join(wurzel, "index.html"), "utf8");
    assert.match(index, /class="seitenfuss"[\s\S]*href="kontakt\.html"/);
    assert.match(fs.readFileSync(path.join(wurzel, "impressum.html"), "utf8"), /href="kontakt\.html"/);
    const ds = fs.readFileSync(path.join(wurzel, "datenschutz.html"), "utf8");
    assert.match(ds, /id="kontakt"/);
    assert.match(ds, /Formdall/);
    assert.match(ds, /Art\. 28 DSGVO/);
    assert.match(ds, /Art\. 6 Abs\. 1 lit\. a DSGVO/);
    for (const code of ["en", "tr", "ar", "uk", "ru"]) {
        const m = ds.match(new RegExp('<section id="' + code + '"[\\s\\S]*?</section>'));
        assert.match(m[0], /Formdall/, code);
    }
});
