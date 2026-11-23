const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const L = require("../js/laender.js");
const I18n = require("../js/i18n.js");
const LT = require("../js/i18n-laender.js").TEXTE;

function status(r, id) {
    return r.arten.filter((a) => a.id === id)[0].status;
}

test("Es gibt alle 16 Bundesländer, alphabetisch", () => {
    assert.equal(L.CODES.length, 16);
    const namen = L.CODES.map((c) => L.LAND[c].name);
    assert.deepEqual(namen, [...namen].sort((a, b) => a.localeCompare(b, "de")));
    for (const c of L.CODES) assert.ok([4, 6].includes(L.LAND[c].klasse), c);
    assert.equal(L.LAND.BE.klasse, 6);
    assert.equal(L.LAND.BB.klasse, 6);
});

test("Land aus der Adresse: nur aktive Länder, sonst nichts", () => {
    assert.equal(L.finde("by"), "BY");
    assert.equal(L.finde("BB"), "BB");
    assert.equal(L.finde("nw"), null);
    assert.equal(L.finde("xx"), null);
    assert.equal(L.finde(null), null);
});

test("Bayern: bis 2,33 Gymnasium, bis 2,66 Realschule (GrSO § 6)", () => {
    let r = L.berechneBY({ deutsch: 2, mathe: 2, hsu: 3 }); // 7 → 2,33
    assert.equal(r.ok, true);
    assert.equal(r.durchschnitt, 2.33);
    assert.equal(status(r, "gym"), "ja");
    assert.equal(status(r, "rs"), "ja");
    r = L.berechneBY({ deutsch: 3, mathe: 3, hsu: 2 }); // 8 → 2,66
    assert.equal(r.durchschnitt, 2.66);
    assert.equal(status(r, "gym"), "probe");
    assert.equal(status(r, "rs"), "ja");
    r = L.berechneBY({ deutsch: 3, mathe: 3, hsu: 3 }); // 9 → 3,00
    assert.equal(status(r, "rs"), "probe");
    assert.equal(status(r, "ms"), "ja");
});

test("Sachsen: Schnitt 2,0 und keine 4 oder schlechter", () => {
    assert.equal(status(L.berechneSN({ deutsch: 1, mathe: 2, su: 3 }), "gym"), "ja");
    assert.equal(status(L.berechneSN({ deutsch: 2, mathe: 2, su: 2 }), "gym"), "ja");
    assert.equal(status(L.berechneSN({ deutsch: 1, mathe: 1, su: 4 }), "gym"), "test"); // Schnitt 2,0, aber eine 4
    assert.equal(status(L.berechneSN({ deutsch: 2, mathe: 2, su: 3 }), "gym"), "test"); // 2,33
    assert.equal(status(L.berechneSN({ deutsch: 3, mathe: 3, su: 3 }), "os"), "ja");
});

test("Thüringen: Deutsch, Mathematik, HSK jeweils mindestens gut", () => {
    assert.equal(status(L.berechneTH({ deutsch: 2, mathe: 2, hsk: 2 }), "gym"), "ja");
    assert.equal(status(L.berechneTH({ deutsch: 1, mathe: 1, hsk: 3 }), "gym"), "pruefung");
    assert.equal(status(L.berechneTH({ deutsch: 1, mathe: 1, hsk: 3 }), "rs"), "ja");
});

test("Brandenburg: gewichteter Schnitt bis 2,3 ohne Probeunterricht (MBJS)", () => {
    // D×3 + M×3 + FS×2 + GeWi + NaWi, geteilt durch 10
    let r = L.berechneBB({ deutsch: 2, mathe: 2, fremdsprache: 3, gewi: 3, nawi: 2 }); // 6+6+6+3+2 = 23
    assert.equal(r.ok, true);
    assert.equal(r.summe, 23);
    assert.equal(r.gewichte, 10);
    assert.equal(r.durchschnitt, 2.3);
    assert.equal(status(r, "gym"), "ja");
    r = L.berechneBB({ deutsch: 2, mathe: 3, fremdsprache: 2, gewi: 2, nawi: 2 }); // 6+9+4+2+2 = 23
    assert.equal(status(r, "gym"), "ja");
    r = L.berechneBB({ deutsch: 2, mathe: 2, fremdsprache: 3, gewi: 3, nawi: 3 }); // 24 → 2,4
    assert.equal(r.durchschnitt, 2.4);
    assert.equal(status(r, "gym"), "probe");
    assert.equal(status(r, "ges"), "ja");
    assert.equal(status(r, "os"), "ja");
    r = L.berechneBB({ deutsch: 1, mathe: 1, fremdsprache: 1, gewi: 6, nawi: 6 }); // 3+3+2+6+6 = 20
    assert.equal(status(r, "gym"), "ja");
});

test("Fehlende Noten werden gemeldet", () => {
    const r = L.berechneBB({ deutsch: 2, mathe: undefined, fremdsprache: 7, gewi: 2 });
    assert.equal(r.ok, false);
    assert.deepEqual(r.fehler.map((f) => f.fach), ["mathe", "fremdsprache", "nawi"]);
    assert.equal(L.berechneBY({}).ok, false);
});

test("Länder-Texte gibt es in allen Sprachen", () => {
    const deutsch = Object.keys(LT.de).sort();
    for (const s of I18n.SPRACHEN) {
        assert.ok(LT[s.code], "Sprache fehlt: " + s.code);
        assert.deepEqual(Object.keys(LT[s.code]).sort(), deutsch, s.code);
        for (const k of deutsch) assert.ok(LT[s.code][k].trim(), s.code + ": " + k);
    }
});

test("Alle Textschlüssel der Länder und von land.js sind vorhanden", () => {
    const alle = Object.assign({}, I18n.TEXTE.de, LT.de);
    for (const c of L.CODES) {
        const l = L.LAND[c];
        if (!l.faecher) continue;
        const schluessel = [l.spalte, l.regel, l.weg, l.wahl, l.tipp];
        Object.values(l.arten).forEach((a) => { if (a.text) schluessel.push(a.text); });
        l.termine.forEach((x) => { schluessel.push(x.text); if (x.wann) schluessel.push(x.wann); });
        for (const k of schluessel) assert.ok(alle[k], c + ": " + k);
        assert.match(l.amtlich, /^https:\/\//, c);
        assert.ok(l.quellen.length >= 2, c + ": mindestens zwei amtliche Quellen");
        for (const q of l.quellen) assert.match(q.url, /^https:\/\//, c + ": " + q.titel);
        if (l.termine.some((x) => x.von)) assert.match(l.terminQuelle || "", /^https:\/\//, c + ": Quelle der Termine");
    }
    const code = fs.readFileSync(path.join(__dirname, "..", "js", "land.js"), "utf8");
    for (const [, k] of code.matchAll(/\bt[l]?\("(\w+)"/g)) {
        assert.ok(alle[k], "land.js: " + k);
    }
});
