/*
 * Schreibt die deutschen Texte aus js/i18n.js direkt in index.html.
 * So sehen Suchmaschinen, Link-Vorschauen (z. B. WhatsApp) und Browser ohne
 * JavaScript sofort den Inhalt. Nach jeder Textänderung ausführen:
 *   npm run texte
 * (Ein Test prüft, dass index.html und js/i18n.js zusammenpassen.)
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const I18n = require("../js/i18n.js");
const LaenderTexte = require("../js/i18n-laender.js").TEXTE;

const GRENZE = require("../js/rechner.js").GRENZE_NOTENSUMME;

function deutsch(schluessel) {
    const text = I18n.TEXTE.de[schluessel] !== undefined ? I18n.TEXTE.de[schluessel] : LaenderTexte.de[schluessel];
    if (text === undefined) throw new Error("Unbekannter Text: " + schluessel);
    return text.replace(/\{grenze\}/g, String(GRENZE));
}

function maskiere(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function einsetzen(html) {
    // <tag ... data-i18n="x" ...>TEXT</tag>  (nur Elemente ohne Kind-Elemente)
    html = html.replace(/(<(\w+)\b[^>]*\bdata-i18n="(\w+)"[^>]*>)([^<]*)(<\/\2>)/g,
        (ganz, start, tag, schluessel, alt, ende) => start + maskiere(deutsch(schluessel)) + ende);
    // aria-label für data-i18n-aria
    html = html.replace(/<(\w+)\b([^>]*)\bdata-i18n-aria="(\w+)"([^>]*)>/g, (ganz, tag, vor, schluessel, nach) => {
        const ohne = (vor + nach).replace(/\s*aria-label="[^"]*"/g, "");
        return "<" + tag + ohne.replace(/\s+$/, "") + ' data-i18n-aria="' + schluessel +
            '" aria-label="' + maskiere(deutsch(schluessel)) + '">';
    });
    return html;
}

module.exports = { einsetzen };

if (require.main === module) {
    const datei = path.join(__dirname, "..", "index.html");
    fs.writeFileSync(datei, einsetzen(fs.readFileSync(datei, "utf8")));
    console.log("Deutsche Texte in index.html eingesetzt.");
}
