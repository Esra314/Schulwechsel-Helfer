/*
 * Merkliste: gemerkte Schulen und eigene Notizen der Eltern.
 * Wird nur im Browser gespeichert (localStorage) und nie gesendet.
 * Wenn der Speicher nicht verfügbar ist (privates Fenster), läuft alles im Arbeitsspeicher weiter.
 */
(function (root) {
    "use strict";

    var SCHLUESSEL = "oberschul-helfer-merkliste";
    var FELDER = ["sprachen", "ganztag", "profil", "essen", "tdot", "notizen"];

    function erstelle(speicher, schluessel) {
        var KEY = schluessel || SCHLUESSEL;
        var zustand = { ids: [], notizen: {} };

        try {
            var roh = speicher && speicher.getItem(KEY);
            if (roh) {
                var gelesen = JSON.parse(roh);
                if (gelesen && Array.isArray(gelesen.ids)) {
                    zustand.ids = gelesen.ids.filter(function (id) { return typeof id === "string"; });
                    zustand.notizen = gelesen.notizen && typeof gelesen.notizen === "object" ? gelesen.notizen : {};
                }
            }
        } catch (e) { /* kaputte oder gesperrte Daten: leer beginnen */ }

        function sichern() {
            try {
                if (speicher) speicher.setItem(KEY, JSON.stringify(zustand));
            } catch (e) { /* Speicher voll oder gesperrt */ }
        }

        return {
            ids: function () { return zustand.ids.slice(); },
            istGemerkt: function (id) { return zustand.ids.indexOf(id) !== -1; },
            umschalten: function (id) {
                var i = zustand.ids.indexOf(id);
                if (i === -1) {
                    zustand.ids.push(id);
                } else {
                    zustand.ids.splice(i, 1);
                }
                sichern();
                return i === -1;
            },
            notiz: function (id, feld) {
                return (zustand.notizen[id] && zustand.notizen[id][feld]) || "";
            },
            setzeNotiz: function (id, feld, wert) {
                if (FELDER.indexOf(feld) === -1) return;
                zustand.notizen[id] = zustand.notizen[id] || {};
                zustand.notizen[id][feld] = String(wert).slice(0, 2000);
                sichern();
            },
            leeren: function () {
                zustand = { ids: [], notizen: {} };
                try {
                    if (speicher) speicher.removeItem(KEY);
                } catch (e) { /* egal */ }
            }
        };
    }

    var api = { erstelle: erstelle, FELDER: FELDER, SCHLUESSEL: SCHLUESSEL };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    } else {
        root.Merkliste = api;
    }
})(this);
