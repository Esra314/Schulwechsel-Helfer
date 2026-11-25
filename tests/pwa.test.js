const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const wurzel = path.join(__dirname, "..");

test("Alle Dateien für den Offline-Modus existieren", () => {
    const sw = fs.readFileSync(path.join(wurzel, "sw.js"), "utf8");
    const liste = sw.slice(sw.indexOf("const DATEIEN = ["), sw.indexOf("];"));
    const dateien = [...liste.matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((d) => d !== "./");
    assert.ok(dateien.length > 10);
    for (const datei of dateien) {
        assert.ok(fs.existsSync(path.join(wurzel, datei)), `fehlt: ${datei}`);
    }
});

test("Manifest ist gültig und die Icons existieren", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(wurzel, "manifest.webmanifest"), "utf8"));
    assert.equal(manifest.display, "standalone");
    assert.ok(manifest.icons.some((i) => i.sizes === "512x512" && i.purpose === "maskable"));
    for (const icon of manifest.icons) {
        assert.ok(fs.existsSync(path.join(wurzel, icon.src)), `Icon fehlt: ${icon.src}`);
    }
});

test("Alle Fotos der Seite sind auch offline gespeichert", () => {
    const sw = fs.readFileSync(path.join(wurzel, "sw.js"), "utf8");
    const quellen = ["index.html", "css/style.css"].map((d) => fs.readFileSync(path.join(wurzel, d), "utf8")).join("\n");
    const fotos = [...new Set([...quellen.matchAll(/img\/fotos\/[a-z-]+\.webp/g)].map((m) => m[0]))];
    assert.ok(fotos.length > 0);
    for (const foto of fotos) assert.ok(sw.includes(`"${foto}"`), `nicht im Offline-Speicher: ${foto}`);
});
