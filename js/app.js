(function () {
    "use strict";

    var Rechner = window.Rechner;
    var I18n = window.I18n;

    var form = document.getElementById("rechnerForm");
    var zeilen = document.getElementById("noten-zeilen");
    var fsName = document.getElementById("fremdsprache-name");
    var fehlerBox = document.getElementById("fehler");
    var ergebnis = document.getElementById("ergebnis");

    var aktuelleSprache = "de";
    var letztesErgebnis = null;

    function t(schluessel, werte) {
        var text = (I18n.TEXTE[aktuelleSprache] || {})[schluessel];
        if (text === undefined) {
            text = I18n.TEXTE.de[schluessel] || "";
        }
        werte = werte || {};
        werte.grenze = Rechner.GRENZE_NOTENSUMME;
        return text.replace(/\{(\w+)\}/g, function (ganz, name) {
            return werte[name] !== undefined ? String(werte[name]) : ganz;
        });
    }

    function gebietsschema() {
        return aktuelleSprache === "ar" ? "ar-u-nu-latn" : aktuelleSprache;
    }

    function zahl(wert, stellen) {
        var locale = gebietsschema();
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: stellen,
            maximumFractionDigits: stellen
        }).format(wert);
    }

    function bisDreiStellen(wert) {
        return new Intl.NumberFormat(gebietsschema(), { maximumFractionDigits: 3 }).format(wert);
    }

    function fachAnzeige(fach) {
        if (fach.id === "fremdsprache") {
            return fach.name + " (" + fsName.value + ")";
        }
        return fach.name;
    }

    // ---------- Notentabelle aufbauen ----------

    function baueTabelle() {
        Rechner.FAECHER.forEach(function (fach) {
            var tr = document.createElement("tr");
            tr.dataset.fach = fach.id;

            var th = document.createElement("th");
            th.scope = "row";
            th.className = "fachname";
            th.lang = "de";
            th.id = "fach-" + fach.id;
            th.textContent = fachAnzeige(fach);
            if (fach.gewicht === 2) {
                th.classList.add("doppelt");
            }
            tr.appendChild(th);

            Rechner.HALBJAHRE.forEach(function (halbjahr, i) {
                var td = document.createElement("td");
                var select = document.createElement("select");
                select.id = fach.id + "-" + i;
                select.name = select.id;
                select.dataset.fach = fach.id;
                select.dataset.halbjahr = String(i);
                select.setAttribute("aria-labelledby", "fach-" + fach.id + " kopf-" + i);

                var leer = document.createElement("option");
                leer.value = "";
                leer.dataset.i18n = "choose";
                select.appendChild(leer);

                for (var n = 1; n <= 6; n++) {
                    var opt = document.createElement("option");
                    opt.value = String(n);
                    opt.textContent = String(n);
                    select.appendChild(opt);
                }

                if (!fach.pflicht) {
                    var keine = document.createElement("option");
                    keine.value = "keine";
                    keine.dataset.i18n = "no_grade";
                    select.appendChild(keine);
                }

                td.appendChild(select);
                tr.appendChild(td);
            });

            zeilen.appendChild(tr);
        });

        // Spaltenköpfe für die Beschriftung der Auswahlfelder
        var koepfe = document.querySelectorAll(".noten-tabelle thead th");
        koepfe[1].id = "kopf-0";
        koepfe[2].id = "kopf-1";
    }

    // ---------- Sprache ----------

    // Standardsprache ist Deutsch. Eine andere Sprache nur über ?lang=… oder die Auswahl.
    function waehleStartsprache() {
        var codes = I18n.SPRACHEN.map(function (s) { return s.code; });
        var ausUrl = new URLSearchParams(window.location.search).get("lang");
        if (ausUrl && codes.indexOf(ausUrl) !== -1) {
            return ausUrl;
        }
        return "de";
    }

    function setzeSprache(code) {
        aktuelleSprache = code;
        var info = I18n.SPRACHEN.filter(function (s) { return s.code === code; })[0];
        document.documentElement.lang = code;
        document.documentElement.dir = info ? info.dir : "ltr";
        document.querySelectorAll("#sprachChips button").forEach(function (b) {
            b.setAttribute("aria-pressed", b.dataset.lang === code ? "true" : "false");
        });

        document.querySelectorAll("[data-i18n]").forEach(function (el) {
            el.textContent = t(el.dataset.i18n);
        });
        document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
            el.setAttribute("aria-label", t(el.dataset.i18nAria));
        });

        var url = new URL(window.location.href);
        if (code === "de") {
            url.searchParams.delete("lang");
        } else {
            url.searchParams.set("lang", code);
        }
        window.history.replaceState(null, "", url.toString());

        // Datenschutz-Link führt direkt zur Kurzfassung in der gewählten Sprache
        var dsLink = document.querySelector('.seitenfuss a[href^="datenschutz.html"]');
        if (dsLink) dsLink.setAttribute("href", "datenschutz.html" + (code === "de" ? "" : "#" + code));

        if (letztesErgebnis) {
            zeigeErgebnis(letztesErgebnis);
        }
        zeigeTermine();
        zeigeDatenquelle();
        aktualisiereGymHinweis();
        zeigeFilter();
        zeigeVergleich();
        if (letzteSuche) {
            zeigeSuche(letzteSuche);
        }
        if (!fehlerBox.classList.contains("verborgen")) {
            pruefeUndBerechne(false);
        }
        // Bundesland-Teil (js/land.js) neu beschriften
        document.dispatchEvent(new CustomEvent("app:sprache", { detail: { code: code } }));
    }

    function baueSprachauswahl() {
        var chips = document.getElementById("sprachChips");
        I18n.SPRACHEN.forEach(function (s) {
            var li = document.createElement("li");
            var b = document.createElement("button");
            b.type = "button";
            b.lang = s.code;
            b.dataset.lang = s.code;
            b.textContent = s.name;
            b.addEventListener("click", function () { setzeSprache(s.code); });
            li.appendChild(b);
            chips.appendChild(li);
        });
    }

    // ---------- Berechnung ----------

    function leseNoten() {
        var noten = {};
        Rechner.FAECHER.forEach(function (fach) {
            noten[fach.id] = Rechner.HALBJAHRE.map(function (_, i) {
                var wert = document.getElementById(fach.id + "-" + i).value;
                if (wert === "") return undefined;
                if (wert === "keine") return null;
                return Number(wert);
            });
        });
        return noten;
    }

    function zeigeFehler(fehler) {
        document.querySelectorAll(".noten-tabelle select").forEach(function (s) {
            s.removeAttribute("aria-invalid");
        });

        if (fehler.length === 0) {
            fehlerBox.classList.add("verborgen");
            fehlerBox.textContent = "";
            return;
        }

        var liste = document.createElement("ul");
        fehler.forEach(function (f) {
            var fach = Rechner.FAECHER.filter(function (x) { return x.id === f.fach; })[0];
            var idx = Rechner.HALBJAHRE.indexOf(f.halbjahr);
            document.getElementById(f.fach + "-" + idx).setAttribute("aria-invalid", "true");
            var li = document.createElement("li");
            li.textContent = fachAnzeige(fach) + " – " + f.halbjahr;
            liste.appendChild(li);
        });

        fehlerBox.textContent = "";
        var p = document.createElement("p");
        p.textContent = t("err_missing");
        fehlerBox.appendChild(p);
        fehlerBox.appendChild(liste);
        fehlerBox.classList.remove("verborgen");
    }

    function zeigeErgebnis(r) {
        document.getElementById("notensumme").textContent = String(r.notensumme);
        document.getElementById("durchschnitt").textContent = zahl(r.durchschnitt, 1);

        var karte = document.getElementById("karte-gym");
        var status = document.getElementById("status-gym");
        karte.classList.toggle("ok", r.gymnasiumMoeglich);
        karte.classList.toggle("bedingt", !r.gymnasiumMoeglich);
        status.textContent = r.gymnasiumMoeglich ? t("status_yes") : t("status_probe");
        document.getElementById("probe").classList.toggle("verborgen", r.gymnasiumMoeglich);

        var noten = leseNoten();
        var kern = Rechner.FAECHER.filter(function (f) { return f.kern; });
        var teile = [];
        kern.forEach(function (f) {
            noten[f.id].forEach(function (n) { teile.push(n); });
        });
        document.getElementById("rechenweg-summe").textContent =
            t("sum_label") + " (Deutsch, Mathematik, 1. Fremdsprache; 5/2 + 6/1): " +
            teile.join(" + ") + " = " + r.notensumme +
            (r.gymnasiumMoeglich ? " ≤ " : " > ") + Rechner.GRENZE_NOTENSUMME;

        document.getElementById("rechenweg-schnitt").textContent =
            t("avg_label") + ": " + r.gewichteteSumme + " ÷ " + r.gewichtSumme +
            " = " + bisDreiStellen(r.durchschnittGenau) + " → " + zahl(r.durchschnitt, 1);

        ergebnis.classList.remove("verborgen");
    }

    function pruefeUndBerechne(scrollen) {
        var r = Rechner.berechne(leseNoten());
        zeigeFehler(r.fehler);
        if (!r.ok) {
            letztesErgebnis = null;
            ergebnis.classList.add("verborgen");
            if (scrollen) fehlerBox.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
        var neu = !letztesErgebnis || letztesErgebnis.gymnasiumMoeglich !== r.gymnasiumMoeglich;
        letztesErgebnis = r;
        zeigeErgebnis(r);
        if (neu) {
            // Alle Schularten bleiben ausgewählt (alle führen zum Abitur);
            // beim Gymnasium steht nur ein Hinweis zum Probeunterricht.
            aktualisiereGymHinweis();
            if (letzteSuche) sucheSchulen(false);
        }
        if (scrollen) {
            ergebnis.focus({ preventScroll: true });
            ergebnis.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    // ---------- Termine ----------

    // Allgemeine Angaben ("meist ...") und feste Termine für den Wechsel 2027
    var TERMINE = [
        { wann: "tl_when_1", text: "tl_1" },
        { wann: "tl_when_2", text: "tl_2" },
        { von: "2027-02-08", bis: "2027-02-09", text: "date_probe_anmeldung" },
        { von: "2027-02-19", text: "date_probe" },
        { von: "2027-03-03", bis: "2027-03-11", text: "date_anmeldung" },
        { wann: "tl_when_5", text: "tl_5" },
        { wann: "tl_when_6", text: "tl_6" }
    ];

    function datum(iso) {
        return new Intl.DateTimeFormat(gebietsschema(), {
            day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
        }).format(new Date(iso + "T00:00:00Z"));
    }

    function datumBereich(von, bis) {
        var format = new Intl.DateTimeFormat(gebietsschema(), {
            day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
        });
        var a = new Date(von + "T00:00:00Z");
        var b = new Date(bis + "T00:00:00Z");
        return format.formatRange ? format.formatRange(a, b) : format.format(a) + " – " + format.format(b);
    }

    function zeigeTermine() {
        var liste = document.getElementById("terminListe");
        liste.textContent = "";
        TERMINE.forEach(function (termin) {
            var li = document.createElement("li");
            var wann = document.createElement("strong");
            wann.className = "termin-datum";
            if (termin.wann) {
                wann.textContent = t(termin.wann);
                li.className = "allgemein";
            } else {
                wann.textContent = termin.bis ? datumBereich(termin.von, termin.bis) : datum(termin.von);
            }
            var was = document.createElement("span");
            was.textContent = t(termin.text);
            li.appendChild(wann);
            li.appendChild(was);
            if (!termin.wann) {
                li.appendChild(kalenderKnopf([amtlicherTermin(termin)], t(termin.text), datum(termin.von)));
            }
            liste.appendChild(li);
        });
        var alle = document.getElementById("termineKalender");
        if (alle && !alle.dataset.bereit) {
            alle.dataset.bereit = "1";
            alle.addEventListener("click", function () {
                kalenderWahl(TERMINE.filter(function (x) { return !x.wann; }).map(amtlicherTermin), "termine-wechsel-2027", alle);
            });
        }
    }

    // ---------- Kalender (.ics wird im Browser erstellt, nichts wird gesendet) ----------

    var AMTLICH_URL = "https://www.berlin.de/sen/bildung/schule/bildungswege/uebergang-weiterfuehrende-schule/wechsel-zur-7-klasse/";

    function amtlicherTermin(termin, link) {
        return {
            titel: t(termin.text),
            datum: termin.von,
            bis: termin.bis,
            beschreibung: t("cal_official"),
            link: typeof link === "string" ? link : AMTLICH_URL
        };
    }

    function schulTermin(s, x) {
        return {
            titel: t("td_" + x.a) + " – " + s.n,
            datum: x.d,
            von: x.v,
            ende: x.b,
            ort: s.n + ", " + s.s + ", " + s.z + " Berlin",
            beschreibung: t("cal_check"),
            link: x.l
        };
    }

    // Kleiner Knopf "In den Kalender" neben einem Termin
    function kalenderKnopf(termine, was, wann, dateiName) {
        var knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = "kalender-knopf nur-bildschirm";
        knopf.textContent = "📅 " + t("cal_add");
        knopf.title = t("cal_add_title", { was: was, datum: wann });
        knopf.setAttribute("aria-label", knopf.title);
        knopf.setAttribute("aria-haspopup", "dialog");
        knopf.addEventListener("click", function () {
            kalenderWahl(termine, termine[0].datum + "-" + (dateiName || was), knopf);
        });
        return knopf;
    }

    function terminWann(x) {
        var text = x.bis ? datumBereich(x.datum, x.bis) : datum(x.datum);
        // Uhrzeit links-nach-rechts halten (auch im Arabischen)
        return x.von ? text + ", \u2066" + x.von + (x.ende ? "–" + x.ende : "") + "\u2069" : text;
    }

    function webKalenderLinks(termin, klasse, kurz) {
        return [
            ["google", "cal_google", "Google", Kalender.googleLink(termin)],
            ["outlook", "cal_outlook", "Outlook.com", Kalender.outlookLink(termin, "live")],
            ["office", "cal_office", "Microsoft 365", Kalender.outlookLink(termin, "office")]
        ].map(function (x) {
            var a = neuerLink(x[3], kurz ? x[2] : t(x[1]));
            if (kurz) a.title = t(x[1]);
            a.className = klasse + " kal-" + x[0];
            a.rel = "noopener noreferrer";
            return a;
        });
    }

    // Auswahl: in welchen Kalender? (Google, Outlook, Microsoft 365 oder Apple/iPhone/andere als Datei)
    var kalenderDialog = null;

    function kalenderWahl(termine, dateiName, ausloeser) {
        if (!kalenderDialog) {
            kalenderDialog = document.createElement("dialog");
            kalenderDialog.className = "kalender-dialog";
            kalenderDialog.addEventListener("click", function (e) {
                if (e.target === kalenderDialog) kalenderDialog.close();
            });
            kalenderDialog.addEventListener("close", function () {
                if (kalenderDialog.ausloeser) kalenderDialog.ausloeser.focus();
            });
            document.body.appendChild(kalenderDialog);
        }
        var d = kalenderDialog;
        d.ausloeser = ausloeser;
        d.textContent = "";
        d.setAttribute("aria-labelledby", "kalenderTitel");
        var innen = element("div", "kalender-innen");
        var kopf = element("div", "kalender-kopf");
        var titel = element("h3", "", "📅 " + t("cal_choose"));
        titel.id = "kalenderTitel";
        var zu = element("button", "kalender-zu", "✕");
        zu.type = "button";
        zu.setAttribute("aria-label", t("cal_close"));
        zu.addEventListener("click", function () { d.close(); });
        kopf.appendChild(titel);
        kopf.appendChild(zu);
        innen.appendChild(kopf);

        var datei = element("button", "kalender-option kal-apple");
        datei.type = "button";
        datei.addEventListener("click", function () {
            Kalender.oeffnen(termine, dateiName);
            d.close();
        });

        if (termine.length === 1) {
            var x = termine[0];
            var was = element("p", "kalender-was");
            was.appendChild(element("strong", "", x.titel));
            was.appendChild(element("span", "", terminWann(x)));
            innen.appendChild(was);
            var optionen = element("div", "kalender-optionen");
            webKalenderLinks(x, "kalender-option").forEach(function (a) {
                a.addEventListener("click", function () { d.close(); });
                optionen.appendChild(a);
            });
            datei.textContent = t("cal_apple");
            optionen.appendChild(datei);
            innen.appendChild(optionen);
        } else {
            datei.textContent = t("cal_apple_all", { anzahl: termine.length });
            innen.appendChild(datei);
            innen.appendChild(element("h4", "kalender-einzeln", t("cal_one_by_one")));
            var liste = element("ul", "kalender-liste");
            termine.forEach(function (x) {
                var li = element("li");
                li.appendChild(element("strong", "", x.titel));
                li.appendChild(element("span", "kalender-zeit", terminWann(x)));
                var reihe = element("div", "kalender-mini");
                webKalenderLinks(x, "kalender-mini-link", true).forEach(function (a) { reihe.appendChild(a); });
                li.appendChild(reihe);
                liste.appendChild(li);
            });
            innen.appendChild(liste);
        }
        innen.appendChild(element("p", "kalender-hinweis", t("cal_privacy")));
        d.appendChild(innen);
        if (typeof d.showModal === "function") {
            d.showModal();
        } else {
            d.setAttribute("open", "");
        }
        zu.focus();
    }

    // ---------- Schulen in der Nähe ----------

    var SCHULART_NAMEN = {
        gym: "Gymnasium",
        iss: "Integrierte Sekundarschule (ISS)",
        gms: "Gemeinschaftsschule"
    };
    var daten = window.SCHULDATEN || { schulen: [], plz: {}, stand: "" };
    var letzteSuche = null;
    var karte = null;
    var markerSchicht = null;

    function zeigeDatenquelle() {
        document.getElementById("datenquelle").textContent =
            t("data_source", { stand: daten.stand ? datum(daten.stand) : "" });
    }

    function aktualisiereGymHinweis() {
        var gymAn = document.querySelector('input[name="art"][value="gym"]').checked;
        var hinweis = document.getElementById("gym-hinweis");
        var zeigen = gymAn && letztesErgebnis && !letztesErgebnis.gymnasiumMoeglich;
        hinweis.textContent = zeigen ? "Gymnasium: " + t("status_probe") : "";
        hinweis.classList.toggle("verborgen", !zeigen);
    }

    function gewaehlteArten() {
        return Array.prototype.map.call(
            document.querySelectorAll('input[name="art"]:checked'),
            function (el) { return el.value; }
        );
    }

    var SCHULEN_PRO_SEITE = 10;
    var sichtbareSchulen = SCHULEN_PRO_SEITE;

    function sucheSchulen(scrollen) {
        sichtbareSchulen = SCHULEN_PRO_SEITE;
        var r = window.Umkreis.suche(daten, {
            plz: document.getElementById("plz").value,
            arten: gewaehlteArten(),
            privat: document.getElementById("privat").checked,
            radiusKm: Number(document.getElementById("radius").value)
        });
        if (r.ok && filterAuswahl.length > 0) {
            r.schulen = r.schulen.filter(function (s) {
                return window.SchulFilter.passt(schulinfos[s.id], filterAuswahl);
            });
        }
        letzteSuche = r;
        zeigeSuche(r);
        zeigeFilter();
        if (scrollen && r.ok) {
            document.getElementById("sucheErgebnis").scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    function zeigeSuche(r) {
        var fehler = document.getElementById("sucheFehler");
        var bereich = document.getElementById("sucheErgebnis");
        if (!r.ok) {
            fehler.textContent = t(r.fehler);
            fehler.classList.remove("verborgen");
            bereich.classList.add("verborgen");
            return;
        }
        fehler.classList.add("verborgen");
        bereich.classList.remove("verborgen");

        var km = document.getElementById("radius").value;
        document.getElementById("trefferAnzahl").textContent = r.schulen.length > 0
            ? t("near_count", { anzahl: r.schulen.length, km: km })
            : t(filterAuswahl.length > 0 ? "flt_none" : "near_none");

        var liste = document.getElementById("schulListe");
        liste.textContent = "";
        var mehrKnopf = document.getElementById("mehrSchulen");
        mehrKnopf.classList.toggle("verborgen", r.schulen.length <= sichtbareSchulen);
        r.schulen.slice(0, sichtbareSchulen).forEach(function (s) {
            var li = document.createElement("li");
            li.className = "schule schule-" + s.a;
            li.id = "schule-" + s.id;

            var kopf = document.createElement("div");
            kopf.className = "schule-kopf";
            var name = document.createElement("strong");
            name.lang = "de";
            name.textContent = s.n;
            var abstand = document.createElement("span");
            abstand.className = "abstand";
            abstand.dir = "ltr";
            abstand.textContent = zahl(s.km, 1) + " km";
            kopf.appendChild(name);
            kopf.appendChild(abstand);

            var info = document.createElement("div");
            info.className = "schule-info";
            var art = document.createElement("span");
            art.className = "badge badge-" + s.a;
            art.lang = "de";
            art.textContent = SCHULART_NAMEN[s.a];
            var traeger = document.createElement("span");
            traeger.className = "traeger";
            traeger.textContent = s.p ? t("school_private") : t("school_public");
            info.appendChild(art);
            info.appendChild(traeger);

            var adresse = document.createElement("div");
            adresse.className = "adresse";
            adresse.lang = "de";
            adresse.textContent = s.s + ", " + s.z + " Berlin" + (s.o ? " (" + s.o + ")" : "");

            li.appendChild(kopf);
            li.appendChild(info);
            li.appendChild(adresse);

            var kontakt = document.createElement("div");
            kontakt.className = "kontakt";
            if (s.w) {
                var link = document.createElement("a");
                link.href = /^https?:\/\//.test(s.w) ? s.w : "https://" + s.w;
                link.target = "_blank";
                link.rel = "noopener";
                link.textContent = "🌐 " + t("website");
                kontakt.appendChild(link);
            }
            if (s.t) {
                var tel = document.createElement("a");
                tel.href = "tel:" + s.t.replace(/[^+\d]/g, "");
                tel.dir = "ltr";
                tel.textContent = "☎ " + s.t;
                kontakt.appendChild(tel);
            }
            if (s.e) {
                var mail = document.createElement("a");
                mail.href = "mailto:" + s.e;
                mail.dir = "ltr";
                mail.textContent = "✉ " + s.e;
                kontakt.appendChild(mail);
            }
            li.appendChild(kontakt);
            li.appendChild(baueMerkKnopf(s));
            li.appendChild(baueDetails(s));
            liste.appendChild(li);
        });

        if (karte && suchModus === "karte") {
            zeichneKarte(r);
        }
    }

    // ---------- Filter: Schwerpunkt, Fremdsprachen, Besonderes ----------

    var filterAuswahl = [];

    function filterName(o) {
        return o.name || t(o.text);
    }

    function schalteFilter(schluessel) {
        var i = filterAuswahl.indexOf(schluessel);
        if (i === -1) filterAuswahl.push(schluessel); else filterAuswahl.splice(i, 1);
        if (letzteSuche && letzteSuche.ok) sucheSchulen(false); else zeigeFilter();
    }

    function zeigeFilter() {
        var gruppen = document.getElementById("filterGruppen");
        gruppen.textContent = "";
        window.SchulFilter.GRUPPEN.forEach(function (g) {
            var box = document.createElement("div");
            box.className = "sfilter-gruppe";
            box.setAttribute("role", "group");
            var titel = document.createElement("p");
            titel.className = "sfilter-titel";
            titel.id = "filterTitel-" + g.id;
            titel.textContent = t(g.text);
            box.setAttribute("aria-labelledby", titel.id);
            box.appendChild(titel);
            g.optionen.forEach(function (o) {
                var schluessel = g.id + ":" + o.id;
                var chip = document.createElement("button");
                chip.type = "button";
                chip.className = "sfilter-chip";
                if (o.name) chip.lang = "de";
                chip.textContent = filterName(o);
                chip.setAttribute("aria-pressed", filterAuswahl.indexOf(schluessel) !== -1 ? "true" : "false");
                chip.addEventListener("click", function () {
                    schalteFilter(schluessel);
                    var neu = document.querySelector('#filterGruppen [data-f="' + schluessel + '"]');
                    if (neu) neu.focus();
                });
                chip.dataset.f = schluessel;
                box.appendChild(chip);
            });
            gruppen.appendChild(box);
        });

        var zahl = document.getElementById("filterZahl");
        zahl.textContent = String(filterAuswahl.length);
        zahl.classList.toggle("verborgen", filterAuswahl.length === 0);

        var aktiv = document.getElementById("filterAktiv");
        aktiv.textContent = "";
        aktiv.classList.toggle("verborgen", filterAuswahl.length === 0);
        if (filterAuswahl.length > 0) {
            var wort = document.createElement("span");
            wort.textContent = t("flt_active");
            aktiv.appendChild(wort);
            filterAuswahl.forEach(function (schluessel) {
                var o = window.SchulFilter.OPTION[schluessel];
                if (!o) return;
                var x = document.createElement("button");
                x.type = "button";
                x.className = "sfilter-weg";
                if (o.name) x.lang = "de";
                x.textContent = filterName(o);
                x.setAttribute("aria-label", t("flt_remove", { name: filterName(o) }));
                x.addEventListener("click", function () {
                    schalteFilter(schluessel);
                    var knopf = document.getElementById("filterKnopf");
                    if (!document.querySelector("#filterAktiv .sfilter-weg")) knopf.focus();
                });
                aktiv.appendChild(x);
            });
        }

        document.getElementById("filterFertig").textContent = letzteSuche && letzteSuche.ok && letzteSuche.schulen.length > 0
            ? t("flt_show", { anzahl: letzteSuche.schulen.length })
            : t("flt_done");
    }

    function oeffneFilter(auf) {
        document.getElementById("filterFeld").hidden = !auf;
        var knopf = document.getElementById("filterKnopf");
        knopf.setAttribute("aria-expanded", auf ? "true" : "false");
        knopf.classList.toggle("offen", auf);
    }

    document.getElementById("filterKnopf").addEventListener("click", function () {
        oeffneFilter(document.getElementById("filterFeld").hidden);
    });
    document.getElementById("filterLoeschen").addEventListener("click", function () {
        filterAuswahl = [];
        if (letzteSuche && letzteSuche.ok) sucheSchulen(false); else zeigeFilter();
    });
    document.getElementById("filterFertig").addEventListener("click", function () {
        oeffneFilter(false);
        if (letzteSuche && letzteSuche.ok) {
            document.getElementById("sucheErgebnis").scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
            document.getElementById("filterKnopf").focus();
        }
    });

    // ---------- Details, Merkliste und Vergleich ----------

    var merkliste = window.Merkliste.erstelle((function () {
        try { return window.localStorage; } catch (e) { return null; }
    })());
    var schuleNachId = {};
    daten.schulen.forEach(function (s) { schuleNachId[s.id] = s; });

    var FELD_TEXT = {
        sprachen: "f_lang", ganztag: "f_ganztag", profil: "f_profil",
        essen: "f_essen", tdot: "f_tdot", notizen: "f_notes"
    };

    // Angaben aus dem Schulverzeichnis und Termine aus dem Kalender (data/schulinfos.js)
    var schulinfos = (window.SCHULINFOS && window.SCHULINFOS.schulen) || {};
    var infoStand = (window.SCHULINFOS && window.SCHULINFOS.stand) || "";
    var webStand = (window.SCHULINFOS && window.SCHULINFOS.webStand) || infoStand;
    var PORTRAET_URL = "https://www.bildung.berlin.de/Schulverzeichnis/Schulportrait.aspx?IDSchulzweig=";
    var KALENDER_URL = "https://www.berlin.de/land/kalender/index.php?c=79&kategorie%5B47%5D=109&stichwort=";

    function heuteIso() {
        var d = new Date();
        var mm = ("0" + (d.getMonth() + 1)).slice(-2);
        var tt = ("0" + d.getDate()).slice(-2);
        return d.getFullYear() + "-" + mm + "-" + tt;
    }

    function kommendeTermine(s) {
        var info = schulinfos[s.id];
        if (!info || !info.td) return [];
        var heute = heuteIso();
        return info.td.filter(function (x) { return x.d >= heute; });
    }

    function terminText(x) {
        var zeit = x.v ? ", " + x.v + (x.b ? "–" + x.b : "") : "";
        return t("td_" + x.a) + ": " + datum(x.d) + zeit;
    }

    // Text, wie er im Schulverzeichnis steht (für Vergleich und Details)
    function amtlich(s, feld) {
        var info = schulinfos[s.id];
        if (!info) return "";
        if (feld === "sprachen") return info.sp || "";
        if (feld === "ganztag") return info.gt ? t("gt_" + info.gt) : "";
        if (feld === "profil") return info.pr || "";
        if (feld === "essen") return info.me || "";
        if (feld === "tdot") return kommendeTermine(s).map(terminText).join("; ");
        return "";
    }

    function neuerLink(href, text) {
        var a = document.createElement("a");
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = text;
        return a;
    }

    function webseite(s) {
        return /^https?:\/\//.test(s.w) ? s.w : "https://" + s.w;
    }

    function minuten(km, kmh) {
        // Umweg-Faktor 1,3 gegenüber der Luftlinie, auf 5 Minuten gerundet
        return Math.max(5, Math.round((km * 1.3 / kmh) * 60 / 5) * 5);
    }

    function anfahrtLink(s) {
        var ziel = s.s + ", " + s.z + " Berlin";
        return "https://www.google.com/maps/dir/?api=1&travelmode=transit&destination=" + encodeURIComponent(ziel);
    }

    function baueMerkKnopf(s) {
        var knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = "merken";
        function beschriften() {
            var an = merkliste.istGemerkt(s.id);
            knopf.textContent = an ? t("btn_remembered") : t("btn_remember");
            knopf.setAttribute("aria-pressed", an ? "true" : "false");
        }
        beschriften();
        knopf.addEventListener("click", function () {
            merkliste.umschalten(s.id);
            beschriften();
            zeigeVergleich();
        });
        return knopf;
    }

    var GANZTAG_KURZ = { gebunden: "Gebundener Ganztag", teilgebunden: "Teilgebundener Ganztag", offen: "Offener Ganztag" };

    function element(tag, klasse, text) {
        var el = document.createElement(tag);
        if (klasse) el.className = klasse;
        if (text !== undefined) el.textContent = text;
        return el;
    }

    function chip(text, klasse, titel) {
        var c = element("span", "chip" + (klasse ? " " + klasse : ""), text);
        if (titel) c.title = titel;
        return c;
    }

    // "1. Fremdsprache Englisch, 2. Fremdsprache Englisch" -> Englisch (1./2. Fremdsprache)
    function sprachChips(text) {
        var reihenfolge = [];
        var stufen = {};
        var sonstige = [];
        text.split(/,\s*/).forEach(function (teil) {
            var m = /^(\d)\.\s*Fremdsprache\s+(.+)$/.exec(teil.trim());
            if (m) {
                if (!stufen[m[2]]) { stufen[m[2]] = []; reihenfolge.push(m[2]); }
                if (stufen[m[2]].indexOf(m[1]) < 0) stufen[m[2]].push(m[1]);
            } else if (teil.trim()) {
                sonstige.push(teil.trim());
            }
        });
        var chips = reihenfolge.map(function (sprache) {
            var c = chip(sprache, "chip-sprache");
            c.lang = "de"; c.dir = "ltr";
            var stufe = element("small", "", stufen[sprache].sort().join("./") + ". Fremdsprache");
            c.appendChild(document.createTextNode(" "));
            c.appendChild(stufe);
            return c;
        });
        sonstige.forEach(function (x) {
            var c = chip(x, "chip-sprache");
            c.lang = "de"; c.dir = "ltr";
            chips.push(c);
        });
        return { chips: chips, anzahl: reihenfolge.length || sonstige.length };
    }

    function chipReihe(chips, max) {
        var reihe = element("div", "chips");
        chips.forEach(function (c, i) {
            if (max && i >= max) c.classList.add("verborgen");
            reihe.appendChild(c);
        });
        if (max && chips.length > max) {
            var mehr = element("button", "chip chip-mehr", t("more_count", { anzahl: chips.length - max }));
            mehr.type = "button";
            mehr.addEventListener("click", function () {
                reihe.querySelectorAll(".verborgen").forEach(function (c) { c.classList.remove("verborgen"); });
                mehr.remove();
            });
            reihe.appendChild(mehr);
        }
        return reihe;
    }

    function abschnitt(icon, titelSchluessel, inhalt) {
        var box = element("div", "detail-abschnitt");
        box.appendChild(element("h4", "", icon + " " + t(titelSchluessel)));
        box.appendChild(inhalt);
        return box;
    }

    // Langer Text: 2 Zeilen, dann "mehr anzeigen"
    function kurzText(text) {
        var box = element("div", "kurztext");
        var p = element("p", "zwei-zeilen", text);
        p.lang = "de";
        p.dir = "ltr";
        box.appendChild(p);
        if (text.length > 140) {
            var knopf = element("button", "text-knopf", t("show_more_short"));
            knopf.type = "button";
            knopf.addEventListener("click", function () {
                var offen = p.classList.toggle("zwei-zeilen");
                knopf.textContent = offen ? t("show_more_short") : t("show_less");
            });
            box.appendChild(knopf);
        }
        return box;
    }

    // Kleiner Quellenhinweis für Angaben von der Website der Schule
    function webQuelle(url) {
        var a = neuerLink(url, "🌐 " + t("src_web", { datum: webStand ? datum(webStand) : "–" }));
        var p = element("p", "web-quelle");
        p.appendChild(a);
        return p;
    }

    // Text mit Link zur Website der Schule (wenn nichts gefunden wurde)
    function mitWebsite(text, s) {
        var p = element("p", "leise", text + " ");
        if (s.w) p.appendChild(neuerLink(webseite(s), "🌐 " + t("website")));
        return p;
    }

    function inhaltMitQuelle(inhalt, url) {
        if (!url) return inhalt;
        var box = element("div");
        box.appendChild(inhalt);
        box.appendChild(webQuelle(url));
        return box;
    }

    function baueDetails(s) {
        var info = schulinfos[s.id] || {};
        var quelle = info.w || {};
        var details = element("details", "schul-details");
        details.appendChild(element("summary", "", t("details_school")));
        var termine = kommendeTermine(s);
        var sprachen = info.sp ? sprachChips(info.sp) : { chips: [], anzahl: 0 };

        // 1. Überblick: eine Zeile mit Symbolen
        var fakten = element("div", "fakten");
        if (s.km !== undefined) {
            fakten.appendChild(chip("🚶 " + t("chip_walk", { min: minuten(s.km, 4.5) }), "fakt"));
            fakten.appendChild(chip("🚲 " + t("chip_bike", { min: minuten(s.km, 15) }), "fakt"));
        }
        if (sprachen.anzahl) fakten.appendChild(chip("🗣️ " + t("chip_langs", { anzahl: sprachen.anzahl }), "fakt"));
        if (info.gt) {
            var gt = chip("⏰ " + GANZTAG_KURZ[info.gt], "fakt", t("gt_" + info.gt));
            gt.lang = "de";
            fakten.appendChild(gt);
        }
        if (info.me) {
            fakten.appendChild(chip(/keine/i.test(info.me) ? "🍽️ " + t("chip_no_lunch") : "🍽️ " + t("chip_lunch"), "fakt"));
        }
        if (info.ob) fakten.appendChild(chip("🎓 " + t("chip_abitur"), "fakt"));
        if (termine.length) fakten.appendChild(chip("📅 " + datum(termine[0].d), "fakt fakt-termin"));
        details.appendChild(fakten);

        var anfahrt = neuerLink(anfahrtLink(s), "🚌 " + t("travel_link"));
        anfahrt.className = "anfahrt-link";
        details.appendChild(anfahrt);

        // 2. Fremdsprachen und Profil als Etiketten
        if (sprachen.chips.length) details.appendChild(abschnitt("🗣️", "f_lang", inhaltMitQuelle(chipReihe(sprachen.chips), quelle.sp)));
        if (info.pr) {
            var profilChips = info.pr.split(/,\s*/).map(function (x) { var c = chip(x, "chip-profil"); c.lang = "de"; c.dir = "ltr"; return c; });
            details.appendChild(abschnitt("🎭", "f_profil", chipReihe(profilChips, 4)));
        }
        if (info.gt) {
            details.appendChild(abschnitt("⏰", "f_ganztag", inhaltMitQuelle(element("p", "", t("gt_" + info.gt)), quelle.gt)));
        }
        if (info.me && quelle.me) {
            details.appendChild(abschnitt("🍽️", "chip_lunch", webQuelle(quelle.me)));
        }

        // 3. Termine
        var terminBox;
        if (termine.length) {
            terminBox = element("ul", "sv-termine");
            termine.forEach(function (x, i) {
                var li = element("li", i >= 2 ? "verborgen" : "");
                li.appendChild(neuerLink(x.l, terminText(x)));
                if (x.q === "w") li.appendChild(element("small", "termin-quelle", " · " + t("src_web_short")));
                li.appendChild(document.createTextNode(" "));
                li.appendChild(kalenderKnopf([schulTermin(s, x)], t("td_" + x.a) + " " + s.n, datum(x.d), s.n));
                terminBox.appendChild(li);
            });
            if (termine.length > 2) {
                var mehrTermine = element("button", "text-knopf", t("more_count", { anzahl: termine.length - 2 }));
                mehrTermine.type = "button";
                mehrTermine.addEventListener("click", function () {
                    terminBox.querySelectorAll(".verborgen").forEach(function (x) { x.classList.remove("verborgen"); });
                    mehrTermine.remove();
                });
                var terminHuelle = element("div");
                terminHuelle.appendChild(terminBox);
                terminHuelle.appendChild(mehrTermine);
                terminBox = terminHuelle;
            }
        } else {
            terminBox = mitWebsite(t("dates_none_short"), s);
        }
        details.appendChild(abschnitt("📅", "f_tdot", terminBox));

        // 4. Mehr: Besonderheiten, AGs, Mittagessen (gekürzt)
        if (info.bm) details.appendChild(abschnitt("✨", "sv_notes", kurzText(info.bm)));
        if (info.ag) {
            var agChips = info.ag.replace(/\s*…$/, "").split(/[,;]\s*/).filter(Boolean)
                .map(function (x) { var c = chip(x, "chip-ag"); c.lang = "de"; c.dir = "ltr"; return c; });
            details.appendChild(abschnitt("⚽", "sv_ags", chipReihe(agChips, 6)));
        }
        var fehlt = [];
        if (!info.sp) fehlt.push(t("f_lang"));
        if (!info.gt) fehlt.push(t("f_ganztag"));
        if (!info.me) fehlt.push(t("chip_lunch"));
        if (fehlt.length === 3 && !info.pr) {
            details.appendChild(mitWebsite(t("sv_none"), s));
        } else if (fehlt.length) {
            details.appendChild(mitWebsite(t("missing_check", { liste: fehlt.join(", ") }), s));
        }

        // 5. Links
        var links = element("div", "kontakt detail-links");
        if (info.z) links.appendChild(neuerLink(PORTRAET_URL + encodeURIComponent(info.z), "📄 " + t("sv_portrait")));
        links.appendChild(neuerLink(KALENDER_URL + encodeURIComponent(s.id), "📅 " + t("sv_calendar")));
        if (s.w) links.appendChild(neuerLink(webseite(s), "🌐 " + t("website")));
        details.appendChild(links);

        // 6. Eigene Notizen
        var notizBox = element("label", "notiz-feld");
        notizBox.appendChild(element("span", "", "📝 " + t("f_notes")));
        var eingabe = document.createElement("textarea");
        eingabe.rows = 3;
        eingabe.maxLength = 2000;
        eingabe.value = merkliste.notiz(s.id, "notizen");
        eingabe.addEventListener("change", function () {
            merkliste.setzeNotiz(s.id, "notizen", eingabe.value);
            zeigeVergleich();
        });
        notizBox.appendChild(eingabe);
        notizBox.appendChild(element("small", "", t("notes_device")));
        details.appendChild(notizBox);

        // 7. Eine Quellenzeile
        details.appendChild(element("p", "quelle-zeile",
            "ⓘ " + t("source_line", { datum: infoStand ? datum(infoStand) : "–" })));
        return details;
    }

    function meineTermine(ids) {
        var liste = [];
        ids.forEach(function (id) {
            var s = schuleNachId[id];
            kommendeTermine(s).forEach(function (x) { liste.push(schulTermin(s, x)); });
        });
        return liste.sort(function (a, b) { return a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0; });
    }

    function zeigeMeineTermine(ids) {
        var knopf = document.getElementById("meineTermineKalender");
        var info = document.getElementById("meineTermineInfo");
        if (!knopf || !info) return;
        var anzahl = meineTermine(ids).length;
        knopf.disabled = anzahl === 0;
        info.textContent = anzahl ? t("cal_mine_count", { anzahl: anzahl }) + " · " + t("cal_note") : t("cal_mine_none");
    }

    function zeigeVergleich() {
        var ids = merkliste.ids().filter(function (id) { return schuleNachId[id]; });
        var zaehler = document.getElementById("merkZaehler");
        if (zaehler) {
            zaehler.textContent = ids.length ? String(ids.length) : "";
            zaehler.classList.toggle("verborgen", ids.length === 0);
        }
        document.getElementById("vergleichLeer").classList.toggle("verborgen", ids.length > 0);
        document.getElementById("vergleichBereich").classList.toggle("verborgen", ids.length === 0);
        var tabelle = document.getElementById("vergleichTabelle");
        tabelle.textContent = "";
        zeigeMeineTermine(ids);
        if (ids.length === 0) return;

        var schulen = ids.map(function (id) { return schuleNachId[id]; });
        var mitte = letzteSuche && letzteSuche.ok ? letzteSuche.mitte : null;

        var kopf = document.createElement("thead");
        var kopfZeile = document.createElement("tr");
        kopfZeile.appendChild(document.createElement("th"));
        schulen.forEach(function (s) {
            var th = document.createElement("th");
            th.scope = "col";
            var name = document.createElement("div");
            name.lang = "de";
            name.textContent = s.n;
            var weg = document.createElement("button");
            weg.type = "button";
            weg.className = "entfernen nur-bildschirm";
            weg.textContent = "✕ " + t("compare_remove");
            weg.addEventListener("click", function () {
                merkliste.umschalten(s.id);
                zeigeVergleich();
                if (letzteSuche) zeigeSuche(letzteSuche);
            });
            th.appendChild(name);
            th.appendChild(weg);
            kopfZeile.appendChild(th);
        });
        kopf.appendChild(kopfZeile);
        tabelle.appendChild(kopf);

        var zeilen = [
            ["compare_type", function (s) {
                var art = document.createElement("span");
                art.className = "art-" + s.a;
                art.lang = "de";
                art.textContent = SCHULART_NAMEN[s.a];
                return art;
            }],
            ["compare_carrier", function (s) { return s.p ? t("school_private") : t("school_public"); }],
            ["compare_area", function (s) { return s.o || "–"; }],
            ["compare_distance", function (s) {
                if (!mitte) return "–";
                var km = window.Umkreis.entfernungKm(mitte[0], mitte[1], s.lat, s.lon);
                return zahl(km, 1) + " km · 🚶 " + minuten(km, 4.5) + " min";
            }]
        ];
        window.Merkliste.FELDER.forEach(function (feld) {
            zeilen.push([FELD_TEXT[feld], function (s) {
                var offiziell = feld === "notizen" ? "" : amtlich(s, feld);
                if (feld === "notizen") return merkliste.notiz(s.id, feld) || "–";
                if (!offiziell) return "–";
                var span = document.createElement("span");
                span.className = "amtlich";
                span.title = t("sv_mark");
                span.textContent = offiziell + " ⓘ";
                return span;
            }]);
        });
        zeilen.push(["website", function (s) {
            if (!s.w) return "–";
            var a = document.createElement("a");
            a.href = /^https?:\/\//.test(s.w) ? s.w : "https://" + s.w;
            a.target = "_blank";
            a.rel = "noopener";
            a.textContent = "🌐 " + t("website");
            return a;
        }]);

        var rumpf = document.createElement("tbody");
        zeilen.forEach(function (z) {
            var tr = document.createElement("tr");
            var th = document.createElement("th");
            th.scope = "row";
            th.textContent = t(z[0]);
            tr.appendChild(th);
            schulen.forEach(function (s) {
                var td = document.createElement("td");
                td.dir = "auto";
                var inhalt = z[1](s);
                if (typeof inhalt === "string") {
                    td.textContent = inhalt;
                } else {
                    td.appendChild(inhalt);
                }
                tr.appendChild(td);
            });
            rumpf.appendChild(tr);
        });
        tabelle.appendChild(rumpf);
        document.getElementById("vergleichLegende").textContent = "ⓘ = " + t("sv_mark") + ". "
            + t("sv_dates_source", { datum: infoStand ? datum(infoStand) : "–" });
    }

    document.getElementById("meineTermineKalender").addEventListener("click", function () {
        var ids = merkliste.ids().filter(function (id) { return schuleNachId[id]; });
        var termine = meineTermine(ids);
        if (termine.length) kalenderWahl(termine, "termine-meine-schulen", document.getElementById("meineTermineKalender"));
    });

    document.getElementById("vergleichLeeren").addEventListener("click", function () {
        merkliste.leeren();
        zeigeVergleich();
        if (letzteSuche) zeigeSuche(letzteSuche);
    });

    var FARBEN = { gym: "#1565c0", iss: "#1b7f3b", gms: "#8e24aa" };

    function zeichneKarte(r) {
        var L = window.L;
        markerSchicht.clearLayers();
        var punkte = [r.mitte];
        L.circleMarker(r.mitte, { radius: 6, color: "#333", fillOpacity: 0.9 }).addTo(markerSchicht);
        r.schulen.forEach(function (s) {
            var m = L.circleMarker([s.lat, s.lon], {
                radius: 8, color: "#fff", weight: 2, fillColor: FARBEN[s.a], fillOpacity: 0.95
            });
            var inhalt = document.createElement("div");
            var b = document.createElement("strong");
            b.textContent = s.n;
            inhalt.appendChild(b);
            inhalt.appendChild(document.createElement("br"));
            var artText = document.createElement("span");
            artText.className = "art-" + s.a;
            artText.textContent = SCHULART_NAMEN[s.a];
            inhalt.appendChild(artText);
            inhalt.appendChild(document.createTextNode(" · " + s.s));
            inhalt.appendChild(document.createElement("br"));
            var zurListe = document.createElement("button");
            zurListe.type = "button";
            zurListe.className = "karte-details";
            zurListe.textContent = t("map_details");
            zurListe.addEventListener("click", function () { zeigeSchuleInListe(s.id); });
            inhalt.appendChild(zurListe);
            m.bindPopup(inhalt);
            m.addTo(markerSchicht);
            punkte.push([s.lat, s.lon]);
        });
        karte.invalidateSize();
        if (punkte.length > 1) {
            karte.fitBounds(punkte, { padding: [24, 24], maxZoom: 15 });
        } else {
            karte.setView(r.mitte, 14);
        }
    }

    function ladeKarte() {
        var L = window.L;
        if (!L || karte) return;
        var el = document.getElementById("karte");
        el.classList.remove("verborgen");
        document.getElementById("karteHinweis").classList.add("verborgen");
        karte = L.map(el, { scrollWheelZoom: false, zoomSnap: 0.5 });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
        }).addTo(karte);
        markerSchicht = L.layerGroup().addTo(karte);
        if (letzteSuche && letzteSuche.ok) {
            zeichneKarte(letzteSuche);
        }
    }

    // Umschalten zwischen Liste und Karte
    var suchModus = "liste";

    function zeigeModus(modus) {
        suchModus = modus;
        document.getElementById("listeBereich").classList.toggle("verborgen", modus !== "liste");
        document.getElementById("karteBereich").classList.toggle("verborgen", modus !== "karte");
        document.getElementById("zeigeListe").setAttribute("aria-pressed", modus === "liste" ? "true" : "false");
        document.getElementById("zeigeKarte").setAttribute("aria-pressed", modus === "karte" ? "true" : "false");
        if (modus === "karte" && karte) {
            karte.invalidateSize();
            if (letzteSuche && letzteSuche.ok) zeichneKarte(letzteSuche);
        }
    }

    function zeigeSchuleInListe(id) {
        if (!letzteSuche || !letzteSuche.ok) return;
        var index = -1;
        letzteSuche.schulen.forEach(function (s, i) { if (s.id === id) index = i; });
        if (index < 0) return;
        if (index >= sichtbareSchulen) {
            sichtbareSchulen = Math.ceil((index + 1) / SCHULEN_PRO_SEITE) * SCHULEN_PRO_SEITE;
        }
        zeigeModus("liste");
        zeigeSuche(letzteSuche);
        var li = document.getElementById("schule-" + id);
        if (!li) return;
        var details = li.querySelector("details");
        if (details) details.open = true;
        li.classList.add("hervorgehoben");
        li.scrollIntoView({ block: "start" });
        window.setTimeout(function () { li.classList.remove("hervorgehoben"); }, 2500);
    }

    document.getElementById("zeigeListe").addEventListener("click", function () { zeigeModus("liste"); });
    document.getElementById("zeigeKarte").addEventListener("click", function () { zeigeModus("karte"); });

    // ---------- Ereignisse ----------

    document.getElementById("sucheForm").addEventListener("submit", function (event) {
        event.preventDefault();
        sucheSchulen(true);
    });

    document.getElementById("sucheForm").addEventListener("change", function (event) {
        if (event.target.name === "art") aktualisiereGymHinweis();
        if (letzteSuche && letzteSuche.ok && event.target.id !== "plz") sucheSchulen(false);
    });

    document.getElementById("karteLaden").addEventListener("click", ladeKarte);

    document.getElementById("mehrSchulen").addEventListener("click", function () {
        sichtbareSchulen += SCHULEN_PRO_SEITE;
        if (letzteSuche) zeigeSuche(letzteSuche);
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        pruefeUndBerechne(true);
    });

    form.addEventListener("reset", function (event) {
        var etwasEingetragen = Array.prototype.some.call(
            zeilen.querySelectorAll("select"),
            function (s) { return s.value !== ""; }
        );
        if (etwasEingetragen && !window.confirm(t("confirm_reset"))) {
            event.preventDefault();
            return;
        }
        letztesErgebnis = null;
        ergebnis.classList.add("verborgen");
        zeigeFehler([]);
        setTimeout(function () {
            document.getElementById("fach-fremdsprache").textContent =
                fachAnzeige(Rechner.FAECHER[2]);
        }, 0);
    });

    fsName.addEventListener("change", function () {
        document.getElementById("fach-fremdsprache").textContent =
            fachAnzeige(Rechner.FAECHER[2]);
    });

    // Nach einem Fehler sofort neu prüfen, sobald Noten ergänzt werden.
    zeilen.addEventListener("change", function () {
        if (!fehlerBox.classList.contains("verborgen") || letztesErgebnis) {
            pruefeUndBerechne(false);
        }
    });

    document.getElementById("drucken").addEventListener("click", function () {
        window.print();
    });

    // Als App installierbar und offline nutzbar (nur über https oder localhost)
    if ("serviceWorker" in navigator && window.isSecureContext && location.protocol !== "file:") {
        window.addEventListener("load", function () {
            navigator.serviceWorker.register("sw.js").catch(function () { /* ohne Offline-Modus weiter */ });
        });
    }

    // ---------- Menü: immer nur ein Bereich sichtbar ----------

    var ANSICHTEN = Array.prototype.slice.call(document.querySelectorAll(".ansicht"));
    var menueLinks = Array.prototype.slice.call(document.querySelectorAll("#hauptmenue a"));

    function zeigeAnsicht(id, ziel, scrollen) {
        document.documentElement.classList.add("mit-ansichten");
        document.documentElement.setAttribute("data-ansicht", id);
        ANSICHTEN.forEach(function (el) { el.classList.toggle("aktiv", el.id === id); });
        menueLinks.forEach(function (a) {
            if (a.getAttribute("href") === "#" + id) {
                a.setAttribute("aria-current", "page");
            } else {
                a.removeAttribute("aria-current");
            }
        });
        if (id === "schulsuche" && karte && suchModus === "karte") {
            window.setTimeout(function () { karte.invalidateSize(); }, 0);
        }
        if (!scrollen) return;
        var element = ziel || document.getElementById(id);
        var menue = document.getElementById("hauptmenue");
        // Nur hochscrollen, wenn der Anfang des Bereichs nicht zu sehen ist
        if (ziel || element.getBoundingClientRect().top < menue.offsetHeight) {
            element.scrollIntoView({ block: "start" });
        }
    }

    function ansichtAusAdresse(scrollen) {
        var id = decodeURIComponent(window.location.hash.slice(1));
        var el = id ? document.getElementById(id) : null;
        var ansicht = el && el.closest ? el.closest(".ansicht") : null;
        if (!ansicht) {
            zeigeAnsicht(ANSICHTEN[0].id, null, false);
            return;
        }
        zeigeAnsicht(ansicht.id, el !== ansicht ? el : null, scrollen);
    }

    window.addEventListener("hashchange", function () { ansichtAusAdresse(true); });

    // Für den Bundesland-Teil (js/land.js)
    window.App = {
        t: t,
        sprache: function () { return aktuelleSprache; },
        zahl: zahl,
        bisDreiStellen: bisDreiStellen,
        datum: datum,
        datumBereich: datumBereich,
        amtlicherTermin: amtlicherTermin,
        kalenderKnopf: kalenderKnopf,
        kalenderWahl: kalenderWahl,
        element: element
    };

    baueTabelle();
    baueSprachauswahl();
    setzeSprache(waehleStartsprache());
    if (ANSICHTEN.length > 0) {
        ansichtAusAdresse(true);
        // Beim Öffnen mit #abschnitt erneut hinscrollen, wenn alles geladen ist
        if (window.location.hash) {
            window.addEventListener("load", function () { ansichtAusAdresse(true); });
        }
    }
})();
