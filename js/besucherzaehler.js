/*
 * Besucherzähler mit GoatCounter (https://www.goatcounter.com), ohne Cookies.
 *
 * Bewusst ein eigenes, kleines Skript statt count.js von GoatCounter: Es wird nichts
 * von fremden Servern geladen, nichts auf dem Gerät gespeichert oder ausgelesen
 * (kein localStorage, keine Bildschirmgröße) und nur das Nötigste gesendet:
 *   p = Seite (nur der Pfad, ohne ?… und #…), t = Seitentitel,
 *   r = woher der Besuch kommt (nur die Domain einer fremden Seite, sonst nichts).
 * Wer "Do Not Track" oder "Global Privacy Control" eingeschaltet hat, wird nicht gezählt.
 * Beschrieben in datenschutz.html (Abschnitt "Besucherzählung").
 */
(function () {
    "use strict";
    var ZIEL = "https://oberschulhelferberlin.goatcounter.com/count";
    // Vorsilbe, damit beide Webseiten im selben GoatCounter-Konto unterscheidbar sind
    var VORSILBE = "/schulwechsel-helfer";

    try {
        var ort = window.location;
        if (ort.protocol !== "https:" || /^(localhost|127\.|10\.|192\.168\.|0\.0\.0\.0)/.test(ort.hostname)) return;
        var nav = window.navigator || {};
        if (nav.globalPrivacyControl === true || nav.doNotTrack === "1" || window.doNotTrack === "1") return;
        if (!window.fetch) return;

        // Pfad ohne Projektordner von GitHub Pages und ohne "index.html"
        var pfad = ort.pathname
            .replace(/^\/(Oberschul-Helfer-Berlin|Schulwechsel-Helfer)(?=\/|$)/i, "")
            .replace(/index\.html$/, "") || "/";

        var herkunft = "";
        if (document.referrer) {
            var vorher = new URL(document.referrer);
            if (vorher.hostname !== ort.hostname) herkunft = vorher.origin;
        }

        var zaehlen = function () {
            var teile = ["p=" + encodeURIComponent(VORSILBE + pfad), "t=" + encodeURIComponent(document.title)];
            if (herkunft) teile.push("r=" + encodeURIComponent(herkunft));
            teile.push("rnd=" + Math.random().toString(36).slice(2, 7));
            fetch(ZIEL + "?" + teile.join("&"), {
                mode: "no-cors", credentials: "omit", referrerPolicy: "no-referrer",
                cache: "no-store", keepalive: true
            }).catch(function () { /* offline oder blockiert: einfach nicht zählen */ });
        };

        // Erst zählen, wenn die Seite wirklich sichtbar ist (nicht beim Vorladen)
        if (document.visibilityState === "visible" || !("visibilityState" in document)) {
            zaehlen();
        } else {
            var beiSichtbar = function () {
                if (document.visibilityState !== "visible") return;
                document.removeEventListener("visibilitychange", beiSichtbar);
                zaehlen();
            };
            document.addEventListener("visibilitychange", beiSichtbar);
        }
    } catch (fehler) {
        // Der Zähler darf die Seite nie stören
    }
})();
