const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Aufnahme = require("../js/aufnahme.js");

const wurzel = path.join(__dirname, "..");
function lade(datei) {
    const fenster = {};
    vm.runInNewContext(fs.readFileSync(path.join(wurzel, datei), "utf8"), { window: fenster });
    return fenster;
}
const { SCHULDATEN } = lade("data/schulen.js");
const { AUFNAHME } = lade("data/aufnahme.js");
const quellenJson = JSON.parse(fs.readFileSync(path.join(wurzel, "quellen/aufnahme-quellen.json"), "utf8"));

test("Aufnahme-Daten: bekannte Schulen, gültige Jahre, Zahlen und Quellen", () => {
    assert.match(AUFNAHME.stand, /^\d{4}-\d{2}-\d{2}$/);
    const ids = new Set(SCHULDATEN.schulen.map((s) => s.id));
    assert.ok(Object.keys(AUFNAHME.schulen).length > 200);
    for (const [id, jahre] of Object.entries(AUFNAHME.schulen)) {
        assert.ok(ids.has(id), id);
        for (const [jahr, e] of Object.entries(jahre)) {
            assert.match(jahr, /^20\d\d\/\d\d$/);
            for (const k of Object.keys(e)) assert.ok(["p", "e", "q", "g", "a"].includes(k), `${id} ${jahr}: ${k}`);
            if (e.p !== undefined) assert.ok(Number.isInteger(e.p) && e.p > 0);
            if (e.e !== undefined) assert.ok(Number.isInteger(e.e) && e.e >= 0);
            if (e.q) assert.ok(AUFNAHME.quellen[e.q], e.q);
            if (e.a) assert.ok(AUFNAHME.quellen[e.a] && e.a !== e.q, e.a);
            for (const g of e.g || []) {
                assert.ok(AUFNAHME.quellen[g.q], g.q);
                assert.ok(["note", "notensumme", "punktsumme", "los"].includes(g.art));
                assert.match(g.w, /^\d+(,\d)?$/);
            }
        }
    }
    for (const q of Object.values(AUFNAHME.quellen)) assert.match(q.u, /^https:\/\//);
});

test("Widersprüchliche Angaben werden nicht mit Zahlen gezeigt", () => {
    for (const [id, jahre] of Object.entries(AUFNAHME.offen)) {
        for (const jahr of jahre) {
            const e = (AUFNAHME.schulen[id] || {})[jahr] || {};
            assert.equal(e.p, undefined, id + " " + jahr);
            const zeile = Aufnahme.jahre(AUFNAHME, id).find((z) => z.jahr === jahr);
            assert.ok(zeile.offen);
            assert.equal(zeile.plaetze, undefined);
        }
    }
});

test("Jede Aufnahme-Grenze aus der Quelldatei steht in den Daten", () => {
    for (const g of quellenJson.grenzen) {
        const liste = AUFNAHME.schulen[g.id][g.j].g;
        assert.ok(liste.some((x) => x.w === g.w && x.q === g.q), g.id + " " + g.j);
        assert.ok(g.zitat && g.zitat.includes(g.w), "Zitat fehlt: " + g.id);
    }
});

test("Jahre: neuestes zuerst, genug Platz wird erkannt (Beispiel Primo-Levi-Gymnasium)", () => {
    const jahre = Aufnahme.jahre(AUFNAHME, "03Y14");
    assert.deepEqual(jahre.map((j) => j.jahr), ["2026/27", "2025/26"]);
    assert.equal(jahre[1].plaetze, 128);
    assert.equal(jahre[1].erstwuensche, 186);
    assert.equal(jahre[1].genugPlatz, false);
    assert.equal(jahre[1].grenzen[0].w, "1,2");
    assert.deepEqual(jahre[1].quellen, ["drs-19-23179", "ba-pankow-2026-01-29"]);
    assert.deepEqual(Aufnahme.jahre(AUFNAHME, "gibt-es-nicht"), []);
    assert.equal(Aufnahme.grenzSchluessel({ art: "los" }), "adm_grade_lot");
});

test("Korrigierte Schulen zeigen die verlässliche Quelle und einen Hinweis", () => {
    const tag = Aufnahme.jahre(AUFNAHME, "10Y01").find((z) => z.jahr === "2026/27");
    assert.equal(tag.plaetze, 160);
    assert.equal(tag.erstwuensche, 103);
    assert.equal(tag.abweichend, "drs-19-26317");
    assert.deepEqual(tag.quellen, ["drs-19-26504", "drs-19-26317"]);
    const tk = Aufnahme.jahre(AUFNAHME, "09Y06").find((z) => z.jahr === "2025/26");
    assert.equal(tk.erstwuensche, 167);
    assert.equal(tk.abweichend, "drs-19-26469");
});

test("Aufnahme.kurz: neuestes Jahr mit Zahlen und neueste Aufnahme-Note für Meine Auswahl", () => {
    const daten = {
        schulen: {
            X1: {
                "2025/26": { q: "a", p: 128, e: 186, g: [{ w: "1,2", art: "note", q: "b" }] },
                "2026/27": { q: "c", p: 128, e: 133 }
            },
            X2: { "2026/27": { q: "c", p: 156, e: 79 } }
        },
        offen: { X3: ["2026/27"] }
    };
    const k = Aufnahme.kurz(daten, "X1");
    assert.equal(k.zahlen.jahr, "2026/27");
    assert.equal(k.zahlen.genugPlatz, false);
    assert.equal(k.grenze.jahr, "2025/26");
    assert.deepEqual(k.quellen, ["c", "b"]);
    const k2 = Aufnahme.kurz(daten, "X2");
    assert.equal(k2.zahlen.genugPlatz, true);
    assert.equal(k2.grenze, null);
    const k3 = Aufnahme.kurz(daten, "X3");
    assert.equal(k3.zahlen, null);
    assert.equal(k3.offen, true);
    assert.equal(Aufnahme.kurz(daten, "fehlt"), null);
    // echte Daten: jede Schule mit Aufnahme-Daten liefert eine Kurzfassung
    for (const id of Object.keys(AUFNAHME.schulen)) assert.ok(Aufnahme.kurz(AUFNAHME, id), id);
});
