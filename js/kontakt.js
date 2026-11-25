/*
 * Kontaktformular (kontakt.html).
 *
 * Die Seite ist statisch, deshalb leitet ein Formular-Dienst (Formdall, Server in
 * Deutschland) die Nachricht per E-Mail weiter. Die Adresse des Dienstes steht im
 * action-Attribut des Formulars. Solange dort noch „FORMULAR-SCHLUESSEL“ steht,
 * ist das Formular nicht eingerichtet und die Seite zeigt nur die E-Mail-Adresse.
 *
 * Spam-Schutz ohne Tracking und ohne Captcha:
 *  - versteckte Felder „website“ und „_url“ (Honigtopf, „_url“ prüft auch Formdall):
 *    Menschen sehen sie nicht, Bots füllen sie aus
 *  - Zeitsperre: wer schneller als 3 Sekunden absendet, ist sehr wahrscheinlich ein Bot
 *  - Formdall prüft zusätzlich auf dem Server (eigener Honigtopf, Spamfilter)
 */
(function (root) {
    "use strict";

    var PLATZHALTER = "FORMULAR-SCHLUESSEL";
    var MIN_SEKUNDEN = 3;
    var EMAIL_MUSTER = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function istEingerichtet(action) {
        return typeof action === "string" && /^https:\/\//.test(action) && action.indexOf(PLATZHALTER) === -1;
    }

    // Gibt den Schlüssel des Fehlertexts zurück oder null, wenn alles passt.
    function pruefe(d) {
        // Name ist freiwillig (Datensparsamkeit), nötig sind nur E-Mail und Nachricht.
        var leer = ["email", "nachricht"].some(function (f) {
            return !d[f] || !String(d[f]).trim();
        });
        if (leer || !d.einwilligung) return "k_fehlt";
        if (!EMAIL_MUSTER.test(String(d.email).trim())) return "k_email_falsch";
        return null;
    }

    // Sieht nach Bot aus? (Honigtopf ausgefüllt oder zu schnell abgeschickt)
    function istBot(d, sekunden) {
        var gefuellt = ["website", "_url"].some(function (f) { return d[f] && String(d[f]).trim(); });
        return gefuellt || sekunden < MIN_SEKUNDEN;
    }

    // Antwort des Dienstes in einen Text-Schlüssel übersetzen.
    function deuteAntwort(status, json) {
        if (status >= 200 && status < 300 && json && json.success !== false) return "ok";
        if (status === 429) return "k_zuviel";
        return "k_fehler";
    }

    var api = { istEingerichtet: istEingerichtet, pruefe: pruefe, istBot: istBot, deuteAntwort: deuteAntwort, PLATZHALTER: PLATZHALTER };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
        return;
    }
    root.Kontakt = api;

    // ---------- Seite ----------

    var TEXTE = root.KontaktTexte.TEXTE;
    var SPRACHEN = { de: "ltr", en: "ltr", tr: "ltr", ar: "rtl", uk: "ltr", ru: "ltr" };
    var sprache = new URLSearchParams(window.location.search).get("lang");
    if (!SPRACHEN[sprache]) sprache = "de";

    function t(k) {
        return (TEXTE[sprache] && TEXTE[sprache][k]) || TEXTE.de[k];
    }

    document.documentElement.lang = sprache;
    document.documentElement.dir = SPRACHEN[sprache];
    document.querySelectorAll("[data-k]").forEach(function (el) {
        el.textContent = t(el.dataset.k);
    });
    document.querySelectorAll(".kontakt-sprachen a").forEach(function (a) {
        if (a.getAttribute("hreflang") === sprache) a.setAttribute("aria-current", "true");
    });
    // Links auf andere Seiten behalten die Sprache
    var zurueck = document.getElementById("kontaktZurueck");
    if (zurueck && sprache !== "de") zurueck.href = "index.html?lang=" + sprache;
    var dsLink = document.getElementById("kontaktDsLink");
    if (dsLink && sprache !== "de") dsLink.href = "datenschutz.html#" + sprache;
    var fussDs = document.getElementById("kontaktFussDs");
    if (fussDs && sprache !== "de") fussDs.href = "datenschutz.html#" + sprache;
    var hiddenSprache = document.getElementById("kontaktSprache");
    if (hiddenSprache) hiddenSprache.value = sprache;

    // Kurz-Links wie kontakt.html?thema=daten&schule=… füllen Thema und Schule vor
    var parameter = new URLSearchParams(window.location.search);
    var THEMEN = { frage: "Frage zur Seite", fehler: "Fehler melden", daten: "Schuldaten korrigieren", idee: "Verbesserungsvorschlag" };
    var anliegen = document.getElementById("kontaktAnliegen");
    if (anliegen && THEMEN[parameter.get("thema")]) anliegen.value = THEMEN[parameter.get("thema")];
    var schule = (parameter.get("schule") || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 150);
    var nachrichtFeld = document.getElementById("kontaktNachricht");
    if (schule && nachrichtFeld && !nachrichtFeld.value) nachrichtFeld.value = t("k_schule") + schule + "\n\n";

    var form = document.getElementById("kontaktForm");
    var meldung = document.getElementById("kontaktMeldung");
    var danke = document.getElementById("kontaktDanke");
    var knopf = document.getElementById("kontaktSenden");
    var mail = form.dataset.mail;
    var geladen = Date.now();

    function zeigeMeldung(schluessel, mitMail) {
        meldung.textContent = t(schluessel);
        if (mitMail) {
            meldung.appendChild(document.createTextNode(" "));
            var a = document.createElement("a");
            a.href = "mailto:" + mail;
            a.textContent = mail;
            a.dir = "ltr";
            meldung.appendChild(a);
        }
        meldung.classList.remove("verborgen");
        meldung.focus();
    }

    function zeigeDanke() {
        form.classList.add("verborgen");
        danke.classList.remove("verborgen");
        danke.focus();
    }

    if (!istEingerichtet(form.getAttribute("action"))) {
        form.classList.add("verborgen");
        zeigeMeldung("k_inaktiv", true);
        return;
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        meldung.classList.add("verborgen");
        var fd = new FormData(form);
        var d = {};
        fd.forEach(function (v, k) { d[k] = v; });

        var fehler = pruefe(d);
        if (fehler) {
            form.querySelectorAll("[required]").forEach(function (el) {
                var falsch = el.type === "checkbox" ? !el.checked
                    : !el.value.trim() || (el.type === "email" && fehler === "k_email_falsch");
                el.setAttribute("aria-invalid", falsch ? "true" : "false");
            });
            zeigeMeldung(fehler, false);
            return;
        }
        form.querySelectorAll("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); });

        if (istBot(d, (Date.now() - geladen) / 1000)) {
            zeigeDanke(); // nichts senden, Bot merkt nichts
            return;
        }
        if (navigator.onLine === false) {
            zeigeMeldung("k_offline", false);
            return;
        }
        fd.delete("website");

        knopf.disabled = true;
        knopf.textContent = t("k_sendet");
        fetch(form.action, { method: "POST", body: fd, headers: { Accept: "application/json" }, credentials: "omit", referrerPolicy: "origin" })
            .then(function (antwort) {
                return antwort.json().catch(function () { return null; }).then(function (json) {
                    return deuteAntwort(antwort.status, json);
                });
            })
            .catch(function () { return "k_fehler"; })
            .then(function (ergebnis) {
                knopf.disabled = false;
                knopf.textContent = t("k_senden");
                if (ergebnis === "ok") {
                    form.reset();
                    zeigeDanke();
                } else {
                    zeigeMeldung(ergebnis, true);
                }
            });
    });
})(this);
