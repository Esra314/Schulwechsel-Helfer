/*
 * Lädt die amtlichen Schulstandorte von Brandenburg und Bayern und schreibt sie
 * kompakt nach data/schulen-bb.js und data/schulen-by.js.
 *
 * Aufruf mit Internet:   node scripts/laender-schulen-laden.mjs
 * Ohne Internet im Node-Prozess (z. B. hinter einem Proxy) vorher mit curl laden
 * und die Dateien übergeben:
 *   node scripts/laender-schulen-laden.mjs --bb schulen-bb.gml --by Gymnasien.gml Realschulen.gml Mittelschulen.gml Grundschulen.gml
 *
 * Quellen (Lizenz steht auch im GetCapabilities der Dienste):
 * - Brandenburg: MBJS, WFS https://schullandschaft.brandenburg.de/edugis/wfs/schulen
 *   Datenlizenz Deutschland – Namensnennung – Version 2.0, „© Ministerium für Bildung, Jugend und Sport“
 * - Bayern: StMUK, WFS https://gdiserv.bayern.de/srv112940/services/schulstandortebayern-wfs
 *   CC BY 4.0, Namensnennung „Bayerisches Staatsministerium für Unterricht und Kultus“.
 *   Der Datensatz enthält nur staatliche Schulen.
 */
import { readFile, writeFile } from "node:fs/promises";

const BB_WFS = "https://schullandschaft.brandenburg.de/edugis/wfs/schulen";
const BY_WFS = "https://gdiserv.bayern.de/srv112940/services/schulstandortebayern-wfs";
const BY_TYPEN = ["Gymnasien", "Realschulen", "Mittelschulen", "Grundschulen"];

function heute() {
    return new Date().toISOString().slice(0, 10);
}

function runde(x) {
    return Math.round(x * 100000) / 100000;
}

function entity(s) {
    return s.replace(/&quot;/g, "\"").replace(/&apos;/g, "'").replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();
}

// Zerlegt eine einfache WFS-GML-Antwort in Objekte { feld: wert, lat, lon }.
export function leseGml(gml, praefix) {
    const objekte = [];
    const mitglieder = gml.split("<wfs:member>").slice(1);
    const feld = new RegExp("<" + praefix + ":([a-zA-Z_]+)>([^<]*)</" + praefix + ":\\1>", "g");
    for (const m of mitglieder) {
        const o = {};
        for (const [, k, v] of m.matchAll(feld)) o[k] = entity(v);
        const pos = /<gml:pos>\s*([-\d.]+)\s+([-\d.]+)\s*<\/gml:pos>/.exec(m);
        if (!pos) continue;
        o.lat = runde(Number(pos[1]));
        o.lon = runde(Number(pos[2]));
        objekte.push(o);
    }
    return objekte;
}

function liste(json) {
    if (!json) return [];
    try {
        const a = JSON.parse(json);
        return Array.isArray(a) ? a.map((x) => String(x).trim()).filter(Boolean) : [];
    } catch (e) {
        return [];
    }
}

function webseite(w) {
    w = (w || "").trim();
    if (!w) return "";
    return /^https?:\/\//i.test(w) ? w : "https://" + w;
}

// Mittelpunkt je Ort (Name in Kleinbuchstaben) aus allen Standorten.
function ortMitten(punkte) {
    const summe = {};
    for (const p of punkte) {
        const o = (p.o || "").trim().toLowerCase();
        if (!o) continue;
        const s = summe[o] || (summe[o] = [0, 0, 0]);
        s[0] += p.lat;
        s[1] += p.lon;
        s[2] += 1;
    }
    const orte = {};
    for (const o of Object.keys(summe).sort()) {
        const s = summe[o];
        orte[o] = [runde(s[0] / s[2]), runde(s[1] / s[2])];
    }
    return orte;
}

// Mittelpunkt je Postleitzahl aus allen Standorten (auch Grundschulen),
// damit die Suche per PLZ ohne weitere Datenquelle funktioniert.
function plzMitten(punkte) {
    const summe = {};
    for (const p of punkte) {
        if (!/^\d{5}$/.test(p.z)) continue;
        const s = summe[p.z] || (summe[p.z] = [0, 0, 0]);
        s[0] += p.lat;
        s[1] += p.lon;
        s[2] += 1;
    }
    const plz = {};
    for (const z of Object.keys(summe).sort()) {
        const s = summe[z];
        plz[z] = [runde(s[0] / s[2]), runde(s[1] / s[2])];
    }
    return plz;
}

const BB_ARTEN = {
    "Gymnasium": "gym",
    "Gesamtschule mit GOST": "ges",
    "Gesamtschule mit Grundschule und GOST": "ges",
    "Oberschule": "os",
    "Oberschule mit Grundschule": "os"
};

export function baueBB(gml, stand) {
    const alle = leseGml(gml, "ms");
    const punkte = alle.map((o) => ({ z: o.plz, o: o.ort, lat: o.lat, lon: o.lon }));
    const schulen = alle
        .filter((o) => BB_ARTEN[o.schulform])
        .map((o) => ({
            id: o.schul_nr,
            n: o.schulname,
            a: BB_ARTEN[o.schulform],
            f: o.schulform,
            p: o.schultraeger_grp === "p" ? 1 : 0,
            s: o.strasse_hausnr || "",
            z: o.plz || "",
            o: o.ort || "",
            w: webseite(o.homepage),
            t: o.telefonnummer || "",
            e: o.dienst_email || "",
            sp: liste(o.fremdsprachen),
            bm: liste(o.besonderheiten),
            lat: o.lat,
            lon: o.lon
        }))
        .sort((x, y) => x.n.localeCompare(y.n, "de"));
    return {
        stand,
        quelle: "Ministerium für Bildung, Jugend und Sport des Landes Brandenburg (MBJS), Schulstandorte",
        quelleUrl: "https://schullandschaft.brandenburg.de/edugis/",
        lizenz: "Datenlizenz Deutschland – Namensnennung – Version 2.0",
        lizenzUrl: "https://www.govdata.de/dl-de/by-2-0",
        namensnennung: "© Ministerium für Bildung, Jugend und Sport",
        schulen,
        plz: plzMitten(punkte),
        orte: ortMitten(punkte)
    };
}

const BY_ARTEN = { "Gymnasien": "gym", "Realschulen": "rs", "Mittelschulen": "ms" };

export function baueBY(gmlListe, stand) {
    const alle = [].concat(...gmlListe.map((g) => leseGml(g, "schul")));
    const punkte = alle.map((o) => ({ z: o.postleitzahl, o: o.ort, lat: o.lat, lon: o.lon }));
    const gesehen = new Set();
    const schulen = alle
        .filter((o) => BY_ARTEN[o.schulart])
        .map((o) => ({
            n: o.schulname,
            a: BY_ARTEN[o.schulart],
            p: 0,
            s: o.strasse || "",
            z: o.postleitzahl || "",
            o: o.ort || "",
            lat: o.lat,
            lon: o.lon
        }))
        .filter((s) => {
            const k = s.a + "|" + s.n + "|" + s.z;
            if (gesehen.has(k)) return false;
            gesehen.add(k);
            return true;
        })
        .sort((x, y) => x.n.localeCompare(y.n, "de"));
    schulen.forEach((s, i) => { s.id = "by" + (i + 1); });
    return {
        stand,
        quelle: "Bayerisches Staatsministerium für Unterricht und Kultus, Schulstandorte in Bayern",
        quelleUrl: "https://www.km.bayern.de",
        lizenz: "CC BY 4.0",
        lizenzUrl: "https://creativecommons.org/licenses/by/4.0/deed.de",
        namensnennung: "Bayerisches Staatsministerium für Unterricht und Kultus",
        nurStaatlich: true,
        schulen,
        plz: plzMitten(punkte),
        orte: ortMitten(punkte)
    };
}

function datei(code, daten) {
    return "/* Automatisch erzeugt mit scripts/laender-schulen-laden.mjs – nicht von Hand bearbeiten.\n" +
        " * Quelle: " + daten.quelle + "\n" +
        " * Lizenz: " + daten.lizenz + " (" + daten.lizenzUrl + "), " + daten.namensnennung + "\n" +
        " */\n" +
        "window.LANDSCHULEN = window.LANDSCHULEN || {};\n" +
        "window.LANDSCHULEN." + code + " = " + JSON.stringify(daten) + ";\n";
}

async function holen(url) {
    const antwort = await fetch(url);
    if (!antwort.ok) throw new Error(url + " -> HTTP " + antwort.status);
    return antwort.text();
}

function getFeature(basis, typ, ns) {
    const p = new URLSearchParams({
        SERVICE: "WFS", VERSION: "2.0.0", REQUEST: "GetFeature",
        TYPENAMES: typ, SRSNAME: "urn:ogc:def:crs:EPSG::4326"
    });
    if (ns) p.set("NAMESPACES", ns);
    return basis + "?" + p;
}

async function main() {
    const args = process.argv.slice(2);
    const stand = heute();
    let bbGml, byGml;
    const iBB = args.indexOf("--bb");
    const iBY = args.indexOf("--by");
    if (iBB !== -1 || iBY !== -1) {
        if (iBB !== -1) bbGml = await readFile(args[iBB + 1], "utf8");
        if (iBY !== -1) {
            const ende = iBB > iBY ? iBB : args.length;
            byGml = await Promise.all(args.slice(iBY + 1, ende).map((f) => readFile(f, "utf8")));
        }
    } else {
        bbGml = await holen(getFeature(BB_WFS, "ms:Schul_Standorte"));
        byGml = await Promise.all(BY_TYPEN.map((t) =>
            holen(getFeature(BY_WFS, "schul:Schulstandorte" + t, "xmlns(schul,http://gdi.bayern/brbschul)"))));
    }
    if (bbGml) {
        const bb = baueBB(bbGml, stand);
        if (bb.schulen.length < 200) throw new Error("Brandenburg: zu wenige Schulen (" + bb.schulen.length + ")");
        await writeFile(new URL("../data/schulen-bb.js", import.meta.url), datei("BB", bb));
        console.log("Brandenburg:", bb.schulen.length, "Schulen,", Object.keys(bb.plz).length, "PLZ");
    }
    if (byGml) {
        const by = baueBY(byGml, stand);
        if (by.schulen.length < 1000) throw new Error("Bayern: zu wenige Schulen (" + by.schulen.length + ")");
        await writeFile(new URL("../data/schulen-by.js", import.meta.url), datei("BY", by));
        console.log("Bayern:", by.schulen.length, "Schulen,", Object.keys(by.plz).length, "PLZ");
    }
}

if (import.meta.url === "file://" + process.argv[1]) {
    main().catch((e) => {
        console.error(e.message);
        process.exit(1);
    });
}
