/*
 * Aufnahme in Klasse 7: Plätze, Erstwünsche und Aufnahme-Noten je Schule und Jahr
 * (Daten: data/aufnahme.js, erzeugt mit scripts/aufnahme_laden.py).
 * Reine Funktionen ohne DOM, damit sie getestet werden können.
 */
(function (root) {
    "use strict";

    // Alle Jahre einer Schule, neuestes zuerst
    function jahre(daten, id) {
        var schule = (daten && daten.schulen && daten.schulen[id]) || {};
        var offen = (daten && daten.offen && daten.offen[id]) || [];
        var alle = Object.keys(schule).concat(offen.filter(function (j) { return !schule[j]; }));
        alle.sort().reverse();
        return alle.map(function (jahr) {
            var e = schule[jahr] || {};
            var zeile = { jahr: jahr, grenzen: e.g || [], quellen: [] };
            if (offen.indexOf(jahr) >= 0) {
                zeile.offen = true;
            } else if (e.p !== undefined) {
                zeile.plaetze = e.p;
                if (e.e !== undefined) {
                    zeile.erstwuensche = e.e;
                    zeile.genugPlatz = e.e <= e.p;
                }
            }
            if (e.q) zeile.quellen.push(e.q);
            if (e.a && !zeile.offen) {
                zeile.abweichend = e.a;
                zeile.quellen.push(e.a);
            }
            zeile.grenzen.forEach(function (g) {
                if (zeile.quellen.indexOf(g.q) < 0) zeile.quellen.push(g.q);
            });
            return zeile;
        });
    }

    // Text-Schlüssel für eine Aufnahme-Grenze
    function grenzSchluessel(g) {
        return { note: "adm_grade_note", notensumme: "adm_grade_sum", punktsumme: "adm_grade_points", los: "adm_grade_lot" }[g.art] || "adm_grade_note";
    }

    // Kurzfassung für "Meine Auswahl": neuestes Jahr mit Zahlen und neueste Aufnahme-Note
    function kurz(daten, id) {
        var alle = jahre(daten, id);
        if (!alle.length) return null;
        var zahlen = alle.filter(function (j) { return !j.offen && j.plaetze !== undefined; })[0] || null;
        var grenze = null;
        for (var i = 0; i < alle.length; i++) {
            if (alle[i].grenzen.length) { grenze = { jahr: alle[i].jahr, liste: alle[i].grenzen }; break; }
        }
        var quellen = [];
        function merke(q) { if (q && quellen.indexOf(q) < 0) quellen.push(q); }
        if (zahlen) zahlen.quellen.forEach(merke);
        if (grenze) grenze.liste.forEach(function (g) { merke(g.q); });
        return {
            zahlen: zahlen,
            grenze: grenze,
            offen: !zahlen && alle.some(function (j) { return j.offen; }),
            quellen: quellen
        };
    }

    var Aufnahme = { jahre: jahre, grenzSchluessel: grenzSchluessel, kurz: kurz };
    if (typeof module !== "undefined" && module.exports) module.exports = Aufnahme;
    else root.Aufnahme = Aufnahme;
})(this);
