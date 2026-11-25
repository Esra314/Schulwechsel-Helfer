const test = require("node:test");
const assert = require("node:assert/strict");
const A = require("../js/assistent.js");
const D = require("../js/assistent-daten.js");
const I18n = require("../js/i18n.js");

function thema(frage, sprache) {
    const r = A.finde(frage, sprache || "de");
    return r.art === "thema" ? r.thema : r.art + ":" + (r.smalltalk || "");
}

test("Typische Fragen finden das richtige Thema", () => {
    assert.equal(thema("Wie wird der Durchschnitt berechnet?"), "durchschnitt");
    assert.equal(thema("durschnitt"), "durchschnitt"); // Tippfehler
    assert.equal(thema("Ist mein Kind fürs Gymnasium geeignet?"), "eignung");
    assert.equal(thema("Wofür zählt der Durchschnitt?"), "auswahl");
    assert.equal(thema("zählt 2+ als 2?"), "tendenz");
    assert.equal(thema("Wann ist der Probeunterricht?"), "probe");
    assert.equal(thema("Was passiert mit meinen Daten?"), "datenschutz");
    assert.equal(thema("ortalama nasıl hesaplanır", "tr"), "durchschnitt");
    assert.equal(thema("açık kapı günü ne zaman", "tr"), "offenetuer");
    assert.equal(thema("kayıt ne zaman", "tr"), "anmeldung");
    assert.equal(thema("notlarım kötü ne olacak", "tr"), "sorge");
    assert.equal(thema("what is a gymnasium", "en"), "gymnasium");
    assert.equal(thema("كيف يحسب المعدل", "ar"), "durchschnitt");
    assert.equal(thema("Як рахується середня оцінка", "uk"), "durchschnitt");
    assert.equal(thema("Как считается средний балл?", "ru"), "durchschnitt");
});

test("Kleine Gespräche werden freundlich beantwortet", () => {
    assert.equal(thema("Hallo"), "smalltalk:gruss");
    assert.equal(thema("merhaba nasılsın", "tr"), "smalltalk:befinden");
    assert.equal(thema("bir sorum var", "tr"), "smalltalk:frage");
    assert.equal(thema("danke!"), "smalltalk:danke");
    assert.equal(thema("wer bist du?"), "smalltalk:wer");
    const r = A.finde("Hallo, wann ist die Anmeldung?", "de");
    assert.equal(r.thema, "anmeldung");
    assert.equal(r.gruss, true);
});

test("Unbekannte Fragen: höflich, mit Vorschlägen", () => {
    assert.equal(A.finde("wie wird das Wetter morgen", "de").art, "unbekannt");
    assert.equal(A.finde("", "de").art, "unbekannt");
});

test("Antwortet in der Sprache der Frage, sonst in der Seitensprache", () => {
    assert.equal(A.finde("merhaba", "de").sprache, "tr");
    assert.equal(A.finde("مرحبا", "de").sprache, "ar");
    assert.equal(A.finde("Gymnasium", "tr").sprache, "tr");
    assert.equal(A.finde("ok", "en").sprache, "en");
});

test("Alle Themen haben Frage und Antwort in allen 6 Sprachen", () => {
    for (const t of D.THEMEN) {
        for (const l of A.SPRACHEN) {
            const x = A.themaText(t, l, I18n.TEXTE);
            assert.ok(x.q && x.q !== t.id, `${t.id}/${l}: Frage fehlt`);
            assert.ok(x.a.length > 20, `${t.id}/${l}: Antwort fehlt`);
            assert.ok(t[l] && t[l].w.length > 0, `${t.id}/${l}: Suchwörter fehlen`);
        }
    }
    for (const s of D.SMALLTALK) {
        for (const l of A.SPRACHEN) assert.ok(s[l] && s[l].a && s[l].w.length, `${s.id}/${l}`);
    }
    for (const l of A.SPRACHEN) {
        for (const k of Object.keys(D.UI.de)) assert.ok(D.UI[l][k], `UI ${l}.${k}`);
    }
});

test("Amtliche Regel im Text: Durchschnitt nicht gerundet, Grenze 14", () => {
    const t = D.THEMEN.find((x) => x.id === "durchschnitt");
    assert.match(t.de.a, /nicht gerundet/);
    assert.match(t.de.a, /67 : 26 = 2,57… → 2,5/);
    assert.match(D.THEMEN.find((x) => x.id === "eignung").de.a, /Bis 14/);
});

test("Deutsche Fachwörter in einer anderen Sprache: Antwort bleibt in der Seitensprache", () => {
    assert.deepEqual(
        [A.finde("probeunterricht ne zaman", "tr").sprache, A.finde("probeunterricht ne zaman", "tr").thema],
        ["tr", "probe"]);
    assert.equal(A.finde("durchschnitt nasıl", "tr").sprache, "tr");
    assert.equal(A.finde("ganztag", "en").sprache, "en");
    assert.equal(A.finde("tag der offenen tür", "ru").thema, "offenetuer");
    assert.equal(A.finde("tag der offenen tür", "ru").sprache, "ru");
    // Eine echte deutsche Frage wird weiter auf Deutsch beantwortet
    assert.equal(A.finde("Wann ist der Probeunterricht?", "tr").sprache, "de");
});

test("Kein Probejahr mehr am Gymnasium (berlin.de, Übergang 2026/27)", () => {
    for (const l of A.SPRACHEN) {
        assert.doesNotMatch(I18n.TEXTE[l].faq_a7, /erste Jahr ist ein Probejahr|first year is a trial year|deneme yılıdır|السنة الأولى سنة تجريبية|рік – пробний|год – пробный/);
    }
});
