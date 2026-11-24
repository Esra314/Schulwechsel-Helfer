/*
 * Frage-Helfer: kleines Chat-Fenster mit vorbereiteten Antworten.
 *
 * Keine KI und kein Server: Die Frage wird nur hier im Browser mit Suchwörtern
 * verglichen (js/assistent-daten.js). Nichts wird gesendet oder gespeichert.
 * Nach dem Neuladen der Seite ist der Verlauf weg.
 *
 * Der Teil "Suche" hat keine Abhängigkeiten und läuft auch in Node (Tests).
 */
(function (root) {
    "use strict";

    var Daten = (typeof module !== "undefined" && module.exports)
        ? require("./assistent-daten.js")
        : root.AssistentDaten;

    var SPRACHEN = ["de", "en", "tr", "ar", "uk", "ru"];

    // Kleine deutsche Alltagswörter: Daran erkennen wir eine deutsche Frage
    var DEUTSCHE_WOERTER = / (wie|was|wann|wo|wer|warum|wieso|welche[rsnm]?|ist|sind|gibt|kann|darf|muss|mein[e]?|meinem|ich|wir|und|oder|mit|fur|bei|zum|zur|nicht|kein[e]?|bitte) /;

    // ---------- Suche ----------

    // Kleinschreibung, ohne Akzente und Satzzeichen; "+" und "-" bleiben (2+, 3-, 2-3).
    function normalisiere(text) {
        var t = String(text || "").toLowerCase()
            .replace(/ß/g, "ss")
            .replace(/ı/g, "i")
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            // Arabisch: Vokalzeichen und Dehnungsstrich weg, Schreibvarianten vereinheitlichen
            .replace(/[ً-ٰٟـ]/g, "")
            .replace(/[أإآ]/g, "ا")
            .replace(/ة/g, "ه")
            .replace(/ى/g, "ي")
            .replace(/['’‘`´]/g, "")
            .replace(/[^\p{L}\p{N}+\-]+/gu, " ")
            .trim();
        // Arabischer Artikel "ال" am Wortanfang zählt nicht
        return t.split(/\s+/).filter(Boolean).map(function (w) {
            return (w.length > 4 && w.indexOf("ال") === 0) ? w.slice(2) : w;
        }).join(" ");
    }

    function abstand(a, b) {
        if (Math.abs(a.length - b.length) > 2) return 3;
        var vorher = [];
        for (var j = 0; j <= b.length; j++) vorher[j] = j;
        for (var i = 1; i <= a.length; i++) {
            var jetzt = [i];
            for (var k = 1; k <= b.length; k++) {
                jetzt[k] = Math.min(vorher[k] + 1, jetzt[k - 1] + 1,
                    vorher[k - 1] + (a[i - 1] === b[k - 1] ? 0 : 1));
            }
            vorher = jetzt;
        }
        return vorher[b.length];
    }

    // Suchwort vorbereiten: "!wort" = 3 Punkte, "~wort" = 1 Punkt, sonst 2
    function bereiteWort(roh) {
        var gewicht = 2;
        if (roh.charAt(0) === "!") { gewicht = 3; roh = roh.slice(1); }
        else if (roh.charAt(0) === "~") { gewicht = 1; roh = roh.slice(1); }
        return { text: normalisiere(roh), gewicht: gewicht };
    }

    function passtWort(woerter, satz, wort) {
        var kw = wort.text;
        if (!kw) return false;
        if (kw.indexOf(" ") !== -1) {
            return satz.indexOf(" " + kw) !== -1;
        }
        for (var i = 0; i < woerter.length; i++) {
            var w = woerter[i];
            if (w === kw) return true;
            if (/^\d+$/.test(kw)) {
                if (w.replace(/\D.*$/, "") === kw) return true;
                continue;
            }
            if (kw.length >= 4 && w.indexOf(kw) === 0) return true;
            // kleine Tippfehler: 1 Buchstabe (ab 7 Zeichen), 2 Buchstaben (ab 9 Zeichen);
            // der erste Buchstabe muss stimmen ("morgen" ist nicht "sorgen")
            if (kw.length >= 7 && w.charAt(0) === kw.charAt(0) &&
                abstand(w, kw) <= (kw.length >= 9 ? 2 : 1)) return true;
        }
        return false;
    }

    function punkte(woerter, satz, liste) {
        var summe = 0;
        (liste || []).forEach(function (wort) {
            if (passtWort(woerter, satz, wort)) summe += wort.gewicht;
        });
        return summe;
    }

    var vorbereitet = null;
    function bereiteVor() {
        if (vorbereitet) return vorbereitet;
        function mitWoertern(eintrag) {
            var w = {};
            SPRACHEN.forEach(function (l) {
                w[l] = ((eintrag[l] && eintrag[l].w) || []).map(bereiteWort);
            });
            return w;
        }
        vorbereitet = {
            themen: Daten.THEMEN.map(function (t) { return { thema: t, w: mitWoertern(t) }; }),
            smalltalk: Daten.SMALLTALK.map(function (s) { return { st: s, w: mitWoertern(s) }; })
        };
        return vorbereitet;
    }

    /*
     * Findet die passende Antwort.
     * Rückgabe: { art: "thema" | "smalltalk" | "unbekannt", sprache, thema, smalltalk,
     *             gruss (true, wenn zusätzlich gegrüßt wurde), weitere: [Themen-IDs] }
     */
    function finde(frage, seitenSprache) {
        var v = bereiteVor();
        var satz = normalisiere(frage);
        var woerter = satz ? satz.split(" ") : [];
        satz = " " + satz + " ";
        seitenSprache = SPRACHEN.indexOf(seitenSprache) !== -1 ? seitenSprache : "de";

        var proSprache = {};
        SPRACHEN.forEach(function (l) {
            var themen = v.themen.map(function (x) {
                return { id: x.thema.id, p: punkte(woerter, satz, x.w[l]) };
            }).sort(function (a, b) { return b.p - a.p; });
            var st = v.smalltalk.map(function (x) {
                return { id: x.st.id, p: punkte(woerter, satz, x.w[l]) };
            }).sort(function (a, b) { return b.p - a.p; });
            proSprache[l] = { themen: themen, st: st, gesamt: themen[0].p + st[0].p };
        });

        // Sprache der Antwort: die Seitensprache, außer die Frage passt klar besser zu einer anderen
        var sprache = seitenSprache;
        var themaSprache = null;
        var roh = String(frage || "").toLowerCase();
        if (/[؀-ۿ]/.test(roh)) {
            sprache = "ar";
        } else if (/[Ѐ-ӿ]/.test(roh) && seitenSprache !== "uk" && seitenSprache !== "ru") {
            sprache = proSprache.uk.gesamt > proSprache.ru.gesamt ? "uk"
                : proSprache.ru.gesamt > proSprache.uk.gesamt ? "ru"
                : (/[іїєґ]/.test(roh) ? "uk" : "ru");
        } else {
            // Die Frage passt am besten zu dieser Sprache (für die Wahl des Themas)
            var beste = sprache;
            SPRACHEN.forEach(function (l) {
                if (proSprache[l].gesamt > proSprache[beste].gesamt) beste = l;
            });
            // Deutsche Fachwörter (Probeunterricht, Durchschnitt, Ganztag …) kommen in allen
            // Sprachen vor. Auf Deutsch antworten wir nur, wenn die Frage wirklich deutsch ist.
            if (beste !== "de" || sprache === "de" || DEUTSCHE_WOERTER.test(" " + normalisiere(frage) + " ")) {
                sprache = beste;
            } else {
                themaSprache = "de";
            }
        }

        var p = proSprache[themaSprache || sprache];
        // "Hallo, wie geht's?" -> lieber "wie geht's" beantworten als nur grüßen
        var treffer = p.st.filter(function (x) { return x.p > 0; });
        var gruss = treffer.some(function (x) { return x.id === "gruss"; });
        var stBest = treffer.filter(function (x) { return x.id !== "gruss"; })[0] || treffer[0];
        var weitere = p.themen.slice(1, 3).filter(function (x) { return x.p >= 2; })
            .map(function (x) { return x.id; });

        if (p.themen[0].p >= 2) {
            return { art: "thema", sprache: sprache, thema: p.themen[0].id, gruss: gruss, weitere: weitere };
        }
        if (stBest) {
            return { art: "smalltalk", sprache: sprache, smalltalk: stBest.id, weitere: [] };
        }
        var vorschlaege = p.themen.filter(function (x) { return x.p > 0; }).slice(0, 3)
            .map(function (x) { return x.id; });
        return { art: "unbekannt", sprache: sprache, weitere: vorschlaege };
    }

    function themaNachId(id) {
        return Daten.THEMEN.filter(function (t) { return t.id === id; })[0];
    }

    // Frage und Antwort eines Themas; faq-Themen holen den Text aus js/i18n.js
    function themaText(thema, sprache, texte) {
        var eigen = thema[sprache] || {};
        if (thema.faq) {
            var tx = (texte && (texte[sprache] || texte.de)) || {};
            var a = tx["faq_a" + thema.faq] || "";
            if (thema.extra && thema.extra[sprache]) a += "\n" + thema.extra[sprache];
            return { q: tx["faq_q" + thema.faq] || thema.id, a: a };
        }
        return { q: eigen.q || thema.id, a: eigen.a || "" };
    }

    var Suche = {
        normalisiere: normalisiere,
        finde: finde,
        themaNachId: themaNachId,
        themaText: themaText,
        SPRACHEN: SPRACHEN
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = Suche;
        return;
    }
    root.Assistent = Suche;

    // ---------- Oberfläche ----------

    if (typeof document === "undefined" || !Daten) return;

    var I18N = (root.I18n && root.I18n.TEXTE) || {};
    var OFFIZIELL = "https://www.berlin.de/sen/bildung/schule/bildungswege/uebergang-weiterfuehrende-schule/wechsel-zur-7-klasse/";

    var LINKS = {
        calc: { href: "#rechner", text: "tab_calc" },
        find: { href: "#schulsuche", text: "tab_find" },
        mine: { href: "#vergleich", text: "tab_mine" },
        tips: { href: "#ratgeber", text: "tab_guide" },
        dates: { href: "#termine", text: "tab_guide" },
        info: { href: "#fragen", text: "tab_info" },
        privacy: { href: "datenschutz.html", text: "footer_privacy", seite: true },
        imprint: { href: "impressum.html", text: "footer_imprint", seite: true },
        official: { href: OFFIZIELL, text: "official_link", extern: true }
    };

    function seitenSprache() {
        var l = document.documentElement.lang;
        return SPRACHEN.indexOf(l) !== -1 ? l : "de";
    }
    function ui(schluessel, sprache) {
        var s = Daten.UI[sprache || seitenSprache()] || Daten.UI.de;
        return s[schluessel] || Daten.UI.de[schluessel];
    }
    function i18n(schluessel, sprache) {
        return (I18N[sprache] || {})[schluessel] || (I18N.de || {})[schluessel] || "";
    }

    var SVG_NS = "http://www.w3.org/2000/svg";
    function icon(pfade, klasse) {
        var svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        if (klasse) svg.setAttribute("class", klasse);
        pfade.forEach(function (d) {
            var p = document.createElementNS(SVG_NS, "path");
            p.setAttribute("d", d);
            svg.appendChild(p);
        });
        return svg;
    }
    // Eigene, einfache Symbole
    // Sprechblase mit drei Punkten und kleinem Funkeln (wie ein Assistent)
    var ICON_BLASE = ["M3.5 7A2.5 2.5 0 0 1 6 4.5h8.5M20.5 10.5V14A2.5 2.5 0 0 1 18 16.5h-7.5l-4.2 3.4c-.5.4-1.3.1-1.3-.6v-2.8A2.5 2.5 0 0 1 3.5 14z",
        "M8 10.5h.01", "M11.5 10.5h.01", "M15 10.5h.01",
        "M19 1.8l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"];
    var ICON_X = ["M6 6l12 12", "M18 6L6 18"];
    var ICON_SENDEN = ["M4 12l16-8-6 16-2.5-6.5z", "M11.5 13.5L20 4"];
    var ICON_NEU = ["M4 12a8 8 0 1 0 2.4-5.7", "M4 4v4.5h4.5"];

    function el(tag, klasse, text) {
        var e = document.createElement(tag);
        if (klasse) e.className = klasse;
        if (text) e.textContent = text;
        return e;
    }

    var box = el("div", "hilfe nur-bildschirm");
    box.id = "hilfe";

    var knopf = el("button", "hilfe-knopf");
    knopf.type = "button";
    knopf.setAttribute("aria-expanded", "false");
    knopf.setAttribute("aria-controls", "hilfeFenster");
    knopf.appendChild(icon(ICON_BLASE));
    var knopfText = el("span", "hilfe-knopf-text");
    knopf.appendChild(knopfText);

    var fenster = el("section", "hilfe-fenster");
    fenster.id = "hilfeFenster";
    fenster.setAttribute("role", "dialog");
    fenster.setAttribute("aria-labelledby", "hilfeTitel");
    fenster.hidden = true;

    var kopf = el("header", "hilfe-kopf");
    var avatar = el("div", "hilfe-avatar");
    avatar.appendChild(icon(ICON_BLASE));
    var titelBox = el("div", "hilfe-titel-box");
    var titel = el("h2", "hilfe-titel");
    titel.id = "hilfeTitel";
    var unter = el("p", "hilfe-unter");
    titelBox.appendChild(titel);
    titelBox.appendChild(unter);
    var neuKnopf = el("button", "hilfe-kopf-knopf");
    neuKnopf.type = "button";
    neuKnopf.appendChild(icon(ICON_NEU));
    var zuKnopf = el("button", "hilfe-kopf-knopf");
    zuKnopf.type = "button";
    zuKnopf.appendChild(icon(ICON_X));
    kopf.appendChild(avatar);
    kopf.appendChild(titelBox);
    kopf.appendChild(neuKnopf);
    kopf.appendChild(zuKnopf);

    var verlauf = el("div", "hilfe-verlauf");
    verlauf.setAttribute("role", "log");
    verlauf.setAttribute("aria-live", "polite");

    var form = el("form", "hilfe-eingabe");
    form.setAttribute("novalidate", "");
    var eingabe = el("input", "hilfe-feld");
    eingabe.type = "text";
    eingabe.id = "hilfeFeld";
    eingabe.setAttribute("autocomplete", "off");
    eingabe.setAttribute("enterkeyhint", "send");
    eingabe.maxLength = 300;
    var senden = el("button", "hilfe-senden");
    senden.type = "submit";
    senden.appendChild(icon(ICON_SENDEN));
    form.appendChild(eingabe);
    form.appendChild(senden);

    var fuss = el("p", "hilfe-fuss");

    fenster.appendChild(kopf);
    fenster.appendChild(verlauf);
    fenster.appendChild(form);
    fenster.appendChild(fuss);
    box.appendChild(fenster);
    box.appendChild(knopf);
    document.body.appendChild(box);

    var nurBegruessung = true;

    function beschrifte() {
        var l = seitenSprache();
        knopfText.textContent = ui("open", l);
        knopf.setAttribute("aria-label", ui("title", l));
        titel.textContent = ui("title", l);
        unter.textContent = ui("sub", l);
        eingabe.placeholder = ui("placeholder", l);
        eingabe.setAttribute("aria-label", ui("placeholder", l));
        senden.setAttribute("aria-label", ui("send", l));
        senden.title = ui("send", l);
        zuKnopf.setAttribute("aria-label", ui("close", l));
        zuKnopf.title = ui("close", l);
        neuKnopf.setAttribute("aria-label", ui("restart", l));
        neuKnopf.title = ui("restart", l);
        fuss.textContent = ui("note", l);
    }

    function zuUnten() {
        verlauf.scrollTop = verlauf.scrollHeight;
    }

    function linkReihe(ids, sprache) {
        var reihe = el("div", "hilfe-links");
        ids.forEach(function (id) {
            var def = LINKS[id];
            if (!def) return;
            var a = el("a", "hilfe-link", i18n(def.text, sprache));
            var href = def.href;
            if (id === "privacy" && sprache !== "de") href += "#" + sprache;
            a.href = href;
            if (def.extern) {
                a.target = "_blank";
                a.rel = "noopener";
            } else if (!def.seite) {
                a.addEventListener("click", function (e) {
                    e.preventDefault();
                    if (window.location.hash === href) {
                        window.history.replaceState(null, "", window.location.pathname + window.location.search);
                    }
                    window.location.hash = href;
                    if (window.matchMedia("(max-width: 600px)").matches) schliesse(false);
                });
            }
            reihe.appendChild(a);
        });
        return reihe;
    }

    function chipReihe(ids, sprache, ueberschrift) {
        var wrap = el("div", "hilfe-chips-box");
        if (ueberschrift) wrap.appendChild(el("p", "hilfe-chips-titel", ueberschrift));
        var reihe = el("div", "hilfe-chips");
        ids.forEach(function (id) {
            var thema = themaNachId(id);
            if (!thema) return;
            var text = themaText(thema, sprache, I18N).q;
            var c = el("button", "hilfe-chip", text);
            c.type = "button";
            c.addEventListener("click", function () {
                frageGestellt(text, { art: "thema", sprache: sprache, thema: id, weitere: [] });
            });
            reihe.appendChild(c);
        });
        wrap.appendChild(reihe);
        return wrap;
    }

    function botNachricht(text, sprache, extras) {
        var zeile = el("div", "hilfe-zeile bot");
        var blase = el("div", "hilfe-blase", text);
        blase.setAttribute("lang", sprache);
        blase.setAttribute("dir", sprache === "ar" ? "rtl" : "ltr");
        zeile.appendChild(blase);
        (extras || []).forEach(function (x) { if (x) blase.appendChild(x); });
        verlauf.appendChild(zeile);
        zuUnten();
    }

    function nutzerNachricht(text) {
        var zeile = el("div", "hilfe-zeile ich");
        var blase = el("div", "hilfe-blase", text);
        blase.setAttribute("dir", "auto");
        zeile.appendChild(blase);
        verlauf.appendChild(zeile);
        zuUnten();
    }

    function begruesse() {
        verlauf.textContent = "";
        nurBegruessung = true;
        var l = seitenSprache();
        botNachricht(ui("hello", l), l, [chipReihe(Daten.START, l, ui("topics", l))]);
    }

    function antworte(e) {
        var l = e.sprache;
        if (e.art === "thema") {
            var thema = themaNachId(e.thema);
            var text = themaText(thema, l, I18N).a;
            if (e.gruss) {
                var g = Daten.SMALLTALK.filter(function (s) { return s.id === "gruss"; })[0];
                text = g[l].kurz + " " + text;
            }
            botNachricht(text, l, [
                thema.links && thema.links.length ? linkReihe(thema.links, l) : null,
                e.weitere && e.weitere.length ? chipReihe(e.weitere, l, ui("more", l)) : null
            ]);
        } else if (e.art === "smalltalk") {
            var st = Daten.SMALLTALK.filter(function (s) { return s.id === e.smalltalk; })[0];
            var mitThemen = e.smalltalk === "gruss" || e.smalltalk === "frage" || e.smalltalk === "befinden" || e.smalltalk === "ok";
            botNachricht(st[l].a, l, [mitThemen ? chipReihe(Daten.START.slice(0, 4), l) : null]);
        } else {
            var vorschlaege = e.weitere.length ? e.weitere : Daten.START.slice(0, 4);
            botNachricht(ui("unknown", l), l, [chipReihe(vorschlaege, l), linkReihe(["official"], l)]);
        }
    }

    var ruhig = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function frageGestellt(text, ergebnis) {
        nurBegruessung = false;
        nutzerNachricht(text);
        var e = ergebnis || finde(text, seitenSprache());
        var tippt = el("div", "hilfe-zeile bot hilfe-tippt");
        tippt.setAttribute("aria-hidden", "true");
        var punkte3 = el("div", "hilfe-blase");
        for (var i = 0; i < 3; i++) punkte3.appendChild(el("span", "hilfe-punkt"));
        tippt.appendChild(punkte3);
        verlauf.appendChild(tippt);
        zuUnten();
        window.setTimeout(function () {
            tippt.remove();
            antworte(e);
        }, ruhig ? 150 : 550);
    }

    function oeffne() {
        fenster.hidden = false;
        knopf.setAttribute("aria-expanded", "true");
        document.documentElement.classList.add("hilfe-offen");
        if (!verlauf.firstChild) begruesse();
        zuUnten();
        // Auf dem Handy nicht sofort die Tastatur öffnen
        if (!window.matchMedia("(max-width: 600px)").matches) eingabe.focus();
        else zuKnopf.focus();
    }

    function schliesse(fokusZurueck) {
        fenster.hidden = true;
        knopf.setAttribute("aria-expanded", "false");
        document.documentElement.classList.remove("hilfe-offen");
        if (fokusZurueck !== false) knopf.focus();
    }

    knopf.addEventListener("click", function () {
        if (fenster.hidden) oeffne(); else schliesse();
    });
    zuKnopf.addEventListener("click", function () { schliesse(); });
    neuKnopf.addEventListener("click", function () { begruesse(); eingabe.focus(); });
    fenster.addEventListener("keydown", function (e) {
        if (e.key === "Escape") schliesse();
    });
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        var text = eingabe.value.trim();
        if (!text) return;
        eingabe.value = "";
        frageGestellt(text);
    });

    // Sprache der Seite gewechselt: Beschriftungen anpassen, Begrüßung neu
    new MutationObserver(function () {
        beschrifte();
        if (nurBegruessung && verlauf.firstChild) begruesse();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

    beschrifte();
})(this);
