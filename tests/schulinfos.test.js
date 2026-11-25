const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const wurzel = path.join(__dirname, "..");

function lade(datei) {
    const fenster = {};
    vm.runInNewContext(fs.readFileSync(path.join(wurzel, datei), "utf8"), { window: fenster });
    return fenster;
}

const { SCHULDATEN } = lade("data/schulen.js");
const { SCHULINFOS } = lade("data/schulinfos.js");

test("Schulinfos haben einen Stand und gehören zu bekannten Schulen", () => {
    assert.match(SCHULINFOS.stand, /^\d{4}-\d{2}-\d{2}$/);
    if (SCHULINFOS.webStand) assert.match(SCHULINFOS.webStand, /^\d{4}-\d{2}-\d{2}$/);
    const ids = new Set(SCHULDATEN.schulen.map((s) => s.id));
    const schluessel = Object.keys(SCHULINFOS.schulen);
    assert.ok(schluessel.length > 200, "zu wenige Schulen mit Angaben");
    for (const id of schluessel) assert.ok(ids.has(id), `unbekannte Schule ${id}`);
});

test("Schulinfos enthalten nur erlaubte Felder und Werte", () => {
    const erlaubt = new Set(["sp", "gt", "pr", "bm", "ag", "me", "ob", "z", "td", "w"]);
    for (const [id, info] of Object.entries(SCHULINFOS.schulen)) {
        for (const k of Object.keys(info)) assert.ok(erlaubt.has(k), `${id}: Feld ${k}`);
        if (info.gt) assert.ok(["gebunden", "teilgebunden", "offen"].includes(info.gt), `${id}: ${info.gt}`);
        if (info.z) assert.match(info.z, /^\d+$/);
        for (const x of info.td || []) {
            assert.match(x.d, /^\d{4}-\d{2}-\d{2}$/);
            assert.ok(["tdot", "info"].includes(x.a));
            if (x.q === "w") {
                // Termin von der Website der Schule: Quell-Seite muss https sein
                assert.match(x.l, /^https:\/\/[^\s"<>]+$/, x.l);
            } else {
                assert.equal(x.q, undefined);
                assert.ok(x.l.startsWith("https://www.berlin.de/land/kalender/"), x.l);
            }
            if (x.v) assert.match(x.v, /^\d{2}:\d{2}$/);
            if (x.b) assert.match(x.b, /^\d{2}:\d{2}$/);
        }
        for (const [feld, url] of Object.entries(info.w || {})) {
            assert.ok(["gt", "me", "sp"].includes(feld), `${id}: Quelle für ${feld}`);
            assert.ok(info[feld], `${id}: Quelle ohne Wert ${feld}`);
            assert.match(url, /^https:\/\/[^\s"<>]+$/);
        }
    }
});

test("Die Seite lädt die Schulinfos und nennt die Quellen", () => {
    const html = fs.readFileSync(path.join(wurzel, "index.html"), "utf8");
    assert.ok(html.includes('<script src="data/schulinfos.js" defer></script>'));
    assert.ok(html.includes("Berliner Schulverzeichnis"));
    assert.ok(html.indexOf("data/schulinfos.js") < html.indexOf("js/app.js"));
});
