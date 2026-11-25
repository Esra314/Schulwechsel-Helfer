/*
 * Bundesland-Auswahl und alles, was sich je nach Land ändert:
 * Rechner, Ergebnis, Termine und "Gut zu wissen".
 * Berlin nutzt weiter die Bereiche aus index.html (Klasse "nur-be"),
 * die anderen Länder die Bereiche mit der Klasse "nur-land".
 * Das gewählte Land steht in der Adresse (?land=by) und im Browser (localStorage).
 */
(function () {
    "use strict";

    var App = window.App;
    var Laender = window.Laender;
    if (!App || !Laender) return;

    var SPEICHER = "schulwechsel-land";
    var t = App.t;
    var el = App.element;
    var aktuell = Laender.STANDARD;
    var eingaben = {};        // Noten je Land, damit beim Sprachwechsel nichts verloren geht
    var ergebnisSichtbar = {};

    function lesen() {
        try { return window.localStorage.getItem(SPEICHER); } catch (e) { return null; }
    }
    function speichern(code) {
        try { window.localStorage.setItem(SPEICHER, code); } catch (e) { /* ohne Speicher weiter */ }
    }

    function startLand() {
        var ausUrl = new URLSearchParams(window.location.search).get("land");
        return Laender.finde(ausUrl) || Laender.finde(lesen()) || Laender.STANDARD;
    }

    function land() { return Laender.LAND[aktuell]; }

    function tl(schluessel, werte) {
        werte = werte || {};
        var l = land();
        if (werte.land === undefined) werte.land = l.name;
        if (werte.k === undefined) werte.k = l.klasse;
        if (werte.k1 === undefined) werte.k1 = l.klasse + 1;
        return t(schluessel, werte);
    }

    // ---------- Auswahl im Kopf ----------

    var knopf = document.getElementById("landKnopf");
    var knopfName = document.getElementById("landName");
    var dialog = document.getElementById("landDialog");

    function baueDialog() {
        dialog.textContent = "";
        var innen = el("div", "land-innen");
        var kopf = el("div", "land-kopf");
        var titel = el("h2", "", t("land_choose"));
        titel.id = "landTitel";
        var zu = el("button", "land-zu", "✕");
        zu.type = "button";
        zu.setAttribute("aria-label", t("land_close"));
        zu.addEventListener("click", function () { dialog.close(); });
        kopf.appendChild(titel);
        kopf.appendChild(zu);
        innen.appendChild(kopf);

        var liste = el("ul", "land-liste");
        Laender.CODES.forEach(function (code) {
            var l = Laender.LAND[code];
            var li = el("li");
            var b = el("button", "land-option");
            b.type = "button";
            b.lang = "de";
            var name = el("span", "land-option-name", l.name);
            var marke = el("span", "land-marke", l.aktiv ? t("land_after", { k: l.klasse }) : t("land_soon"));
            marke.lang = document.documentElement.lang;
            b.appendChild(name);
            b.appendChild(marke);
            if (!l.aktiv) {
                b.disabled = true;
                b.classList.add("bald");
            }
            if (code === aktuell) {
                b.setAttribute("aria-current", "true");
                name.textContent = l.name + " ✓";
            }
            b.addEventListener("click", function () {
                waehle(code, true);
                dialog.close();
            });
            li.appendChild(b);
            liste.appendChild(li);
        });
        innen.appendChild(liste);
        innen.appendChild(el("p", "klein land-mehr", t("land_more")));
        dialog.appendChild(innen);
    }

    if (dialog) {
        dialog.setAttribute("aria-labelledby", "landTitel");
        dialog.addEventListener("click", function (e) {
            if (e.target === dialog) dialog.close();
        });
        dialog.addEventListener("close", function () { if (knopf) knopf.focus(); });
    }

    if (knopf) {
        knopf.addEventListener("click", function () {
            baueDialog();
            if (typeof dialog.showModal === "function") {
                dialog.showModal();
            } else {
                dialog.setAttribute("open", "");
            }
            var gewaehlt = dialog.querySelector('[aria-current="true"]');
            if (gewaehlt) gewaehlt.focus();
        });
    }

    // ---------- Rechner für die Länder ----------

    var bereich = document.getElementById("landRechner");

    function notenSelect(id, beschriftung) {
        var select = el("select");
        select.id = id;
        select.setAttribute("aria-labelledby", beschriftung);
        var leer = el("option", "", t("choose"));
        leer.value = "";
        select.appendChild(leer);
        for (var n = 1; n <= 6; n++) {
            var opt = el("option", "", String(n));
            opt.value = String(n);
            select.appendChild(opt);
        }
        return select;
    }

    function leseEingaben() {
        var l = land();
        var werte = {};
        l.faecher.forEach(function (f) {
            var s = document.getElementById("lr-" + f.id);
            werte[f.id] = s && s.value !== "" ? Number(s.value) : undefined;
        });
        return werte;
    }

    function setzeEingaben(werte) {
        if (!werte) return;
        Object.keys(werte).forEach(function (id) {
            var s = document.getElementById("lr-" + id);
            if (s && werte[id] !== undefined) s.value = String(werte[id]);
        });
    }

    function baueRechner() {
        if (!bereich) return;
        var l = land();
        bereich.textContent = "";
        if (!l.faecher) return;

        var form = el("form");
        form.id = "landForm";
        form.noValidate = true;
        var fs = el("fieldset");
        fs.appendChild(el("legend", "", t("legend_grades")));

        var tabelle = el("table", "noten-tabelle land-tabelle");
        var kopf = el("thead");
        var kz = el("tr");
        var th1 = el("th", "", t("col_subject"));
        th1.scope = "col";
        var th2 = el("th", "", t(l.spalte));
        th2.scope = "col";
        th2.id = "lr-kopf";
        kz.appendChild(th1);
        kz.appendChild(th2);
        kopf.appendChild(kz);
        tabelle.appendChild(kopf);
        var rumpf = el("tbody");
        l.faecher.forEach(function (f) {
            var tr = el("tr");
            var th = el("th", "fachname", f.name);
            th.scope = "row";
            th.lang = "de";
            if (f.gewicht) th.appendChild(el("small", "fach-gewicht", " (×" + f.gewicht + ")"));
            th.id = "lr-fach-" + f.id;
            tr.appendChild(th);
            var td = el("td");
            td.appendChild(notenSelect("lr-" + f.id, th.id + " lr-kopf"));
            tr.appendChild(td);
            rumpf.appendChild(tr);
        });
        tabelle.appendChild(rumpf);
        fs.appendChild(tabelle);

        form.appendChild(fs);

        var fehler = el("div", "fehler-box verborgen");
        fehler.id = "landFehler";
        fehler.setAttribute("role", "alert");
        form.appendChild(fehler);

        var knoepfe = el("div", "knoepfe");
        var rechnen = el("button", "", t("btn_calc"));
        rechnen.type = "submit";
        var neu = el("button", "zweitrangig", t("btn_reset"));
        neu.type = "button";
        knoepfe.appendChild(rechnen);
        knoepfe.appendChild(neu);
        form.appendChild(knoepfe);
        bereich.appendChild(form);

        var erg = el("section", "ergebnis verborgen");
        erg.id = "landErgebnis";
        erg.setAttribute("aria-live", "polite");
        erg.tabIndex = -1;
        bereich.appendChild(erg);

        setzeEingaben(eingaben[aktuell]);

        form.addEventListener("submit", function (e) {
            e.preventDefault();
            rechne(true);
        });
        form.addEventListener("change", function () {
            eingaben[aktuell] = leseEingaben();
            if (ergebnisSichtbar[aktuell] || !fehler.classList.contains("verborgen")) rechne(false);
        });
        neu.addEventListener("click", function () {
            var etwas = Object.keys(leseEingaben()).some(function (k) { return leseEingaben()[k] !== undefined; });
            if (etwas && !window.confirm(t("confirm_reset"))) return;
            form.reset();
            eingaben[aktuell] = {};
            ergebnisSichtbar[aktuell] = false;
            erg.classList.add("verborgen");
            zeigeFehler([]);
        });

        if (ergebnisSichtbar[aktuell]) rechne(false);
    }

    function zeigeFehler(liste) {
        var box = document.getElementById("landFehler");
        if (!box) return;
        bereich.querySelectorAll("select").forEach(function (s) { s.removeAttribute("aria-invalid"); });
        box.textContent = "";
        if (!liste.length) {
            box.classList.add("verborgen");
            return;
        }
        var l = land();
        box.appendChild(el("p", "", t("err_missing")));
        var ul = el("ul");
        liste.forEach(function (f) {
            var s = document.getElementById("lr-" + f.fach);
            if (s) s.setAttribute("aria-invalid", "true");
            var fach = l.faecher.filter(function (x) { return x.id === f.fach; })[0];
            if (fach) ul.appendChild(el("li", "", fach.name));
        });
        box.appendChild(ul);
        box.classList.remove("verborgen");
    }

    function statusText(status) {
        if (status === "ja") return t("status_yes");
        if (status === "probe") return t("status_probe");
        if (status === "test") return t("st_test");
        if (status === "pruefung") return t("st_pruefung");
        return "";
    }

    function kennzahl(titel, wert, hinweis) {
        var k = el("div", "kennzahl");
        k.appendChild(el("div", "kennzahl-titel", titel));
        k.appendChild(el("div", "kennzahl-wert", wert));
        if (hinweis) k.appendChild(el("p", "klein", hinweis));
        return k;
    }

    function rechne(scrollen) {
        var l = land();
        var werte = leseEingaben();
        eingaben[aktuell] = werte;
        var r = l.berechne(werte);
        var erg = document.getElementById("landErgebnis");
        zeigeFehler(r.fehler);
        if (!r.ok) {
            ergebnisSichtbar[aktuell] = false;
            erg.classList.add("verborgen");
            if (scrollen) document.getElementById("landFehler").scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
        ergebnisSichtbar[aktuell] = true;
        erg.textContent = "";
        erg.appendChild(el("h2", "", t("result_title")));

        var zahlen = el("div", "kennzahlen");
        if (l.zeigeSumme) zahlen.appendChild(kennzahl(t("sum_label"), String(r.summe)));
        zahlen.appendChild(kennzahl(t("avg_label"), App.zahl(r.durchschnitt, l.schnittStellen)));
        erg.appendChild(zahlen);
        erg.appendChild(el("p", "klein land-regel", t(l.regel)));

        erg.appendChild(el("p", "ergebnis-lob", t("lr_cheer")));
        erg.appendChild(el("h3", "", t("lr_schools")));
        var arten = el("ul", "schularten");
        r.arten.forEach(function (a) {
            var art = l.arten[a.id];
            var li = el("li", "schulart " + (a.status === "ja" ? "ok" : "bedingt"));
            var kopf = el("div", "schulart-kopf");
            var name = el("strong", "art-" + art.farbe, art.name);
            name.lang = "de";
            kopf.appendChild(name);
            kopf.appendChild(el("span", "status", statusText(a.status)));
            li.appendChild(kopf);
            if (art.text) li.appendChild(el("p", "", t(art.text)));
            arten.appendChild(li);
        });
        erg.appendChild(arten);

        if (!r.alleDirekt) {
            var box = el("div", "info-box");
            box.appendChild(el("h3", "", t("probe_title")));
            box.appendChild(el("p", "", t(l.weg)));
            erg.appendChild(box);
        }

        var weg = el("details", "rechenweg");
        weg.appendChild(el("summary", "", t("details_title")));
        var namen = l.faecher.map(function (f) { return f.name; }).join(", ");
        if (r.gewichte) {
            var teile = l.faecher.map(function (f, i) { return r.werte[i] + " × " + f.gewicht; });
            weg.appendChild(el("p", "", t("sum_label") + " (" + namen + "): " + teile.join(" + ") + " = " + r.summe));
            weg.appendChild(el("p", "", t("avg_label") + ": " + r.summe + " ÷ " + r.gewichte + " = " +
                App.bisDreiStellen(r.durchschnittGenau) + " → " + App.zahl(r.durchschnitt, l.schnittStellen)));
        } else {
            weg.appendChild(el("p", "", t("sum_label") + " (" + namen + "): " + r.werte.join(" + ") + " = " + r.summe));
            weg.appendChild(el("p", "", t("avg_label") + ": " + r.summe + " ÷ " + r.werte.length + " = " +
                App.bisDreiStellen(r.durchschnittGenau) + " → " + App.zahl(r.durchschnitt, l.schnittStellen)));
        }
        if (aktuell === "TH") weg.appendChild(el("p", "", t(r.alleGut ? "check_th_ja" : "check_th_nein")));
        if (aktuell === "SN") weg.appendChild(el("p", "", t(r.keineVier ? "check_sn_ja" : "check_sn_nein")));
        erg.appendChild(weg);

        var knoepfe = el("div", "knoepfe");
        var drucken = el("button", "zweitrangig", t("btn_print"));
        drucken.type = "button";
        drucken.addEventListener("click", function () { window.print(); });
        knoepfe.appendChild(drucken);
        var teilen = el("button", "zweitrangig nur-bildschirm", "📤 " + t("btn_share"));
        teilen.type = "button";
        knoepfe.appendChild(teilen);
        erg.appendChild(knoepfe);
        erg.appendChild(el("p", "klein nur-bildschirm teilen-hinweis", t("share_hint")));
        var teilenStatus = el("p", "klein nur-bildschirm teilen-status");
        teilenStatus.setAttribute("role", "status");
        erg.appendChild(teilenStatus);
        teilen.addEventListener("click", function () { App.teileSeite(teilenStatus); });

        erg.classList.remove("verborgen");
        if (scrollen) {
            erg.focus({ preventScroll: true });
            erg.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    // ---------- Termine ----------

    function baueTermine() {
        var liste = document.getElementById("landTermine");
        if (!liste) return;
        liste.textContent = "";
        var l = land();
        (l.termine || []).forEach(function (termin) {
            var li = el("li");
            var wann = el("strong", "termin-datum");
            if (termin.wann) {
                wann.textContent = t(termin.wann);
                li.className = "allgemein";
            } else {
                wann.textContent = termin.bis ? App.datumBereich(termin.von, termin.bis) : App.datum(termin.von);
            }
            li.appendChild(wann);
            li.appendChild(el("span", "", t(termin.text)));
            if (!termin.wann) {
                li.appendChild(App.kalenderKnopf([App.amtlicherTermin(termin, l.amtlich)], t(termin.text), App.datum(termin.von)));
            }
            liste.appendChild(li);
        });
        var kal = document.getElementById("landKalender");
        if (kal) {
            kal.textContent = "";
            var mitDatum = (l.termine || []).filter(function (x) { return !x.wann; });
            kal.hidden = mitDatum.length === 0;
            if (mitDatum.length) {
                var alle = el("button", "kalender-gross", t("cal_all"));
                alle.type = "button";
                alle.addEventListener("click", function () {
                    App.kalenderWahl(mitDatum.map(function (x) { return App.amtlicherTermin(x, l.amtlich); }),
                        "termine-" + aktuell.toLowerCase(), alle);
                });
                kal.appendChild(alle);
                kal.appendChild(el("p", "klein", t("cal_note")));
            }
        }
        var hinweis = document.getElementById("landTerminQuelle");
        if (!hinweis) return;
        hinweis.textContent = "";
        if (l.terminQuelle) {
            var a = el("a", "", t("li_official"));
            a.href = l.terminQuelle;
            a.target = "_blank";
            a.rel = "noopener";
            hinweis.appendChild(a);
            hinweis.appendChild(document.createTextNode(" · " + t("li_checked", { datum: App.datum(Laender.GEPRUEFT) })));
        } else if (l.faecher) {
            hinweis.textContent = t("lt_note");
        }
    }

    // ---------- Gut zu wissen ----------

    function eintrag(frage, antwort) {
        var d = el("details", "faq-eintrag");
        d.appendChild(el("summary", "", frage));
        if (typeof antwort === "string") {
            d.appendChild(el("p", "", antwort));
        } else {
            d.appendChild(antwort);
        }
        return d;
    }

    function baueInfo() {
        var box = document.getElementById("landInfo");
        if (!box) return;
        box.textContent = "";
        var l = land();
        if (!l.faecher) return;
        box.appendChild(el("h2", "", tl("li_title")));
        box.appendChild(eintrag(t("li_when_q"), tl("li_when_a")));
        box.appendChild(eintrag(t("li_rule_q"), t(l.regel)));
        box.appendChild(eintrag(t("probe_title"), t(l.weg)));
        box.appendChild(eintrag(t("li_choice_q"), t(l.wahl)));
        var arten = el("ul", "land-arten");
        Object.keys(l.arten).forEach(function (id) {
            var a = l.arten[id];
            var li = el("li");
            var name = el("strong", "art-" + a.farbe, a.name);
            name.lang = "de";
            li.appendChild(name);
            if (a.text) li.appendChild(document.createTextNode(": " + t(a.text)));
            arten.appendChild(li);
        });
        box.appendChild(eintrag(t("li_types_q"), arten));

        var quellen = el("div", "land-quellen");
        quellen.appendChild(el("h3", "", t("li_sources")));
        var ql = el("ul");
        (l.quellen || []).forEach(function (q) {
            var li = el("li");
            var link = el("a", "", q.titel);
            link.href = q.url;
            link.target = "_blank";
            link.rel = "noopener";
            link.lang = "de";
            li.appendChild(link);
            ql.appendChild(li);
        });
        quellen.appendChild(ql);
        quellen.appendChild(el("p", "klein", t("li_checked", { datum: App.datum(Laender.GEPRUEFT) })));
        box.appendChild(quellen);
        var p = el("p");
        var a = el("a", "", t("li_official"));
        a.href = l.amtlich;
        a.target = "_blank";
        a.rel = "noopener";
        p.appendChild(a);
        box.appendChild(p);
    }

    // ---------- Kopf, Schulsuche, Hinweise ----------

    function baueRest() {
        var l = land();
        if (knopfName) knopfName.textContent = l.name;
        if (knopf) knopf.setAttribute("aria-label", t("land_label") + ": " + l.name + ". " + t("land_choose"));

        var tipp = document.getElementById("heroTipp");
        if (tipp) {
            tipp.dataset.i18n = aktuell === "BE" ? "hero_tip" : l.tipp;
            tipp.textContent = t(tipp.dataset.i18n);
        }

        var heroArten = document.getElementById("heroArten");
        if (heroArten) {
            heroArten.textContent = "";
            if (l.arten) {
                Object.keys(l.arten).forEach(function (id) {
                    var a = l.arten[id];
                    var li = el("li");
                    li.appendChild(el("span", "b-punkt " + a.farbe));
                    li.appendChild(document.createTextNode(a.name));
                    heroArten.appendChild(li);
                });
            }
        }

        var bald = document.getElementById("sucheBald");
        if (bald) bald.hidden = !!l.schuldaten;
        var soonTitel = document.getElementById("sucheBaldTitel");
        if (soonTitel) soonTitel.textContent = tl("ss_soon_title");
        var soonText = document.getElementById("sucheBaldText");
        if (soonText) soonText.textContent = tl("ss_soon_text");
        var soonLink = document.getElementById("sucheBaldLink");
        if (soonLink && l.amtlich) {
            soonLink.href = l.amtlich;
            soonLink.textContent = t("li_official");
        }
        var amtlich = document.getElementById("landAmtlich");
        if (amtlich && l.amtlich) amtlich.href = l.amtlich;
    }

    function allesNeu() {
        baueRest();
        baueRechner();
        baueTermine();
        baueInfo();
        if (window.LandSuche && window.LandSuche.baue) window.LandSuche.baue(aktuell);
        if (dialog && dialog.open) baueDialog();
    }

    function waehle(code, vomNutzer) {
        aktuell = Laender.finde(code) || Laender.STANDARD;
        document.documentElement.setAttribute("data-land", aktuell);
        var url = new URL(window.location.href);
        if (aktuell === Laender.STANDARD) {
            url.searchParams.delete("land");
        } else {
            url.searchParams.set("land", aktuell.toLowerCase());
        }
        window.history.replaceState(null, "", url.toString());
        if (vomNutzer) speichern(aktuell);
        allesNeu();
    }

    document.addEventListener("app:sprache", allesNeu);
    waehle(startLand(), false);
})();
