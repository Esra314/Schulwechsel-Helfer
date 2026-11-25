const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const A = require("../js/assistent.js");
const I18n = require("../js/i18n.js");
const LT = require("../js/i18n-laender.js").TEXTE;

const LAND_THEMEN = ["durchschnitt", "eignung", "probe", "anmeldung", "schularten", "termine", "datenschutz"];

test("Andere Länder: nur Themen mit geprüften Länder-Antworten", () => {
    assert.equal(A.finde("Wie wird der Durchschnitt berechnet?", "de", LAND_THEMEN).thema, "durchschnitt");
    assert.equal(A.finde("Wann ist der Probeunterricht?", "de", LAND_THEMEN).thema, "probe");
    assert.equal(A.finde("Hangi okul türleri var?", "tr", LAND_THEMEN).thema, "schularten");
    // Berlin-Themen (ISS, Förderprognose) gibt es dort nicht
    const iss = A.finde("Was ist eine ISS?", "de", LAND_THEMEN);
    assert.notEqual(iss.thema, "iss");
    const fp = A.finde("Was ist die Förderprognose?", "de", LAND_THEMEN);
    assert.notEqual(fp.thema, "foerderprognose");
});

test("Texte des Assistenten für die Länder gibt es in allen Sprachen", () => {
    const code = fs.readFileSync(path.join(__dirname, "..", "js", "assistent.js"), "utf8");
    const schluessel = [...code.matchAll(/i18n\("(\w+)"/g)].map((m) => m[1]);
    assert.ok(schluessel.includes("as_hello_land"));
    for (const s of I18n.SPRACHEN) {
        const alle = Object.assign({}, I18n.TEXTE[s.code], LT[s.code]);
        for (const k of schluessel) assert.ok(alle[k], s.code + ": " + k);
    }
});
