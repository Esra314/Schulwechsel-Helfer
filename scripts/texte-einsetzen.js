/*
 * Schreibt die Texte aus js/i18n.js direkt in die HTML-Seiten:
 *   index.html     – Deutsch (Grundfassung)
 *   en/index.html, tr/index.html, ar/index.html, uk/index.html, ru/index.html
 * und erzeugt die sitemap.xml mit allen Sprachseiten.
 *
 * So sehen Suchmaschinen (Google), Link-Vorschauen (z. B. WhatsApp) und Browser
 * ohne JavaScript sofort den Inhalt in der richtigen Sprache. Jede Sprachseite hat
 * eigenen Titel, eigene Beschreibung, eigene Adresse (canonical) und verweist mit
 * hreflang auf alle anderen Sprachen – so kann Google jede Sprache einzeln zeigen.
 *
 * Nach jeder Textänderung in index.html oder js/i18n.js ausführen:
 *   npm run texte
 * (Ein Test prüft, dass alle Seiten und js/i18n.js zusammenpassen.)
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const I18n = require("../js/i18n.js");
const LaenderTexte = require("../js/i18n-laender.js").TEXTE;

const GRENZE = require("../js/rechner.js").GRENZE_NOTENSUMME;
const WURZEL = path.join(__dirname, "..");
// Bei einer eigenen Domain hier ändern (und robots.txt, og:image in index.html)
const DOMAIN = "https://esra314.github.io/Schulwechsel-Helfer/";
const SPRACHEN = I18n.SPRACHEN;
const OG_LOCALE = { de: "de_DE", en: "en_US", tr: "tr_TR", ar: "ar_AR", uk: "uk_UA", ru: "ru_RU" };

// Adresse einer Sprachseite: Deutsch ist die Startseite, alle anderen liegen in /xx/
function sprachPfad(code) {
    return code === "de" ? "" : code + "/";
}
function sprachUrl(code) {
    return DOMAIN + sprachPfad(code);
}

function text(code, schluessel) {
    const kandidaten = [I18n.TEXTE[code], LaenderTexte[code], I18n.TEXTE.de, LaenderTexte.de];
    const quelle = kandidaten.find((t) => t && t[schluessel] !== undefined);
    const wert = quelle && quelle[schluessel];
    if (wert === undefined) throw new Error("Unbekannter Text: " + schluessel);
    return wert.replace(/\{grenze\}/g, String(GRENZE));
}

function maskiere(wert) {
    return wert.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Inhalt zwischen <!-- NAME:START ... --> und <!-- NAME:ENDE --> ersetzen
function block(html, name, inhalt) {
    const muster = new RegExp("(<!-- " + name + ":START[^>]*-->)[\\s\\S]*?(<!-- " + name + ":ENDE -->)");
    if (!muster.test(html)) throw new Error("Markierung fehlt: " + name);
    return html.replace(muster, (ganz, start, ende) => start + inhalt + ende);
}

function setzeMeta(html, attribut, name, wert) {
    const muster = new RegExp('(<meta ' + attribut + '="' + name + '" content=")[^"]*(">)');
    if (!muster.test(html)) throw new Error("Meta fehlt: " + name);
    return html.replace(muster, (ganz, a, b) => a + maskiere(wert) + b);
}

function texteEinsetzen(html, code) {
    // <tag ... data-i18n="x" ...>TEXT</tag>  (nur Elemente ohne Kind-Elemente)
    html = html.replace(/(<(\w+)\b[^>]*\bdata-i18n="(\w+)"[^>]*>)([^<]*)(<\/\2>)/g,
        (ganz, start, tag, schluessel, alt, ende) => start + maskiere(text(code, schluessel)) + ende);
    // aria-label für data-i18n-aria
    html = html.replace(/<(\w+)\b([^>]*)\bdata-i18n-aria="(\w+)"([^>]*)>/g, (ganz, tag, vor, schluessel, nach) => {
        const ohne = (vor + nach).replace(/\s*aria-label="[^"]*"/g, "");
        return "<" + tag + ohne.replace(/\s+$/, "") + ' data-i18n-aria="' + schluessel +
            '" aria-label="' + maskiere(text(code, schluessel)) + '">';
    });
    return html;
}

function seitenangaben(code) {
    const zeilen = ['    <link rel="canonical" href="' + sprachUrl(code) + '">'];
    SPRACHEN.forEach((s) => zeilen.push('    <link rel="alternate" hreflang="' + s.code + '" href="' + sprachUrl(s.code) + '">'));
    zeilen.push('    <link rel="alternate" hreflang="x-default" href="' + sprachUrl("de") + '">');
    return "\n" + zeilen.join("\n") + "\n    ";
}

// Strukturierte Daten (schema.org WebSite) nur auf der Startseite: so kennt Google
// den Namen der Seite auch in anderen Schreibweisen (z. B. ohne Bindestrich)
const SEITENNAME = "Schulwechsel-Helfer";
const NAMENSVARIANTEN = ["Schulwechsel Helfer", "Schulwechselhelfer"];
function strukturdaten(code) {
    if (code !== "de") return "";
    const daten = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SEITENNAME,
        alternateName: NAMENSVARIANTEN,
        url: sprachUrl("de"),
        inLanguage: SPRACHEN.map((s) => s.code),
        description: text("de", "seo_desc")
    };
    return '\n    <script type="application/ld+json">' + JSON.stringify(daten).replace(/</g, "\\u003c") + "</script>\n    ";
}

function sprachChips(code) {
    const zeilen = SPRACHEN.map((s) => '            <li><a href="' + (sprachPfad(s.code) || "./") + '" hreflang="' + s.code +
        '" lang="' + s.code + '" data-lang="' + s.code + '"' + (s.code === code ? ' aria-current="true"' : "") + ">" +
        s.name + "</a></li>");
    return "\n" + zeilen.join("\n") + "\n        ";
}

// Relative Adressen (css/…, js/…, impressum.html) zeigen in /xx/ eine Ebene höher
function pfadeAnpassen(html) {
    return html.replace(/(\s(?:href|src)=")(?!#|[a-z][a-z0-9+.-]*:|\/|\.\.\/)([^"]*)"/g,
        (ganz, start, ziel) => start + (ziel === "./" ? "../" : "../" + ziel) + '"');
}

// Fertige Seite für eine Sprache aus der deutschen Vorlage (index.html)
function seite(vorlage, code) {
    const info = SPRACHEN.find((s) => s.code === code);
    if (!info) throw new Error("Unbekannte Sprache: " + code);
    let html = texteEinsetzen(vorlage, code);
    html = html.replace(/<html lang="[^"]*" dir="[^"]*">/, '<html lang="' + code + '" dir="' + info.dir + '">');
    html = html.replace(/<title>[^<]*<\/title>/, "<title>" + maskiere(text(code, "seo_title")) + "</title>");
    html = setzeMeta(html, "name", "description", text(code, "seo_desc"));
    html = setzeMeta(html, "property", "og:title", text(code, "seo_title").split(" | ")[0]);
    if (code !== "de") html = setzeMeta(html, "property", "og:description", text(code, "share_text"));
    html = setzeMeta(html, "property", "og:url", sprachUrl(code));
    html = setzeMeta(html, "property", "og:locale", OG_LOCALE[code]);
    html = block(html, "SPRACHSEITEN", seitenangaben(code));
    html = block(html, "STRUKTURDATEN", strukturdaten(code));
    html = block(html, "SPRACHCHIPS", sprachChips(code));
    if (code !== "de") html = pfadeAnpassen(html);
    return html;
}

function sitemap(datum) {
    const alternativen = SPRACHEN.map((s) => '    <xhtml:link rel="alternate" hreflang="' + s.code + '" href="' + sprachUrl(s.code) + '"/>')
        .concat('    <xhtml:link rel="alternate" hreflang="x-default" href="' + sprachUrl("de") + '"/>').join("\n");
    const eintraege = SPRACHEN.map((s) => "  <url>\n    <loc>" + sprachUrl(s.code) + "</loc>\n    <lastmod>" + datum +
        "</lastmod>\n" + alternativen + "\n  </url>").join("\n");
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + eintraege + "\n</urlset>\n";
}

// Für den Test: die deutsche Startseite so, wie das Skript sie schreiben würde
function einsetzen(html) {
    return seite(html, "de");
}

module.exports = { einsetzen, seite, sitemap, sprachPfad, SPRACHEN, DOMAIN };

if (require.main === module) {
    const datei = path.join(WURZEL, "index.html");
    const deutsch = seite(fs.readFileSync(datei, "utf8"), "de");
    fs.writeFileSync(datei, deutsch);
    SPRACHEN.filter((s) => s.code !== "de").forEach((s) => {
        fs.mkdirSync(path.join(WURZEL, s.code), { recursive: true });
        fs.writeFileSync(path.join(WURZEL, s.code, "index.html"), seite(deutsch, s.code));
    });
    // lastmod nur ändern, wenn sich die Seiten wirklich geändert haben (sonst bleibt der Test stabil)
    const smDatei = path.join(WURZEL, "sitemap.xml");
    const alt = fs.existsSync(smDatei) ? fs.readFileSync(smDatei, "utf8") : "";
    const altDatum = (alt.match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1];
    const neu = sitemap(altDatum || new Date().toISOString().slice(0, 10));
    const heute = sitemap(new Date().toISOString().slice(0, 10));
    fs.writeFileSync(smDatei, neu === alt ? alt : heute);
    console.log("Texte eingesetzt: index.html + " + SPRACHEN.filter((s) => s.code !== "de").map((s) => s.code + "/").join(", ") + " und sitemap.xml.");
}
