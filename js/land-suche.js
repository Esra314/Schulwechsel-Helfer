/*
 * Schulsuche für die anderen Bundesländer (Brandenburg, Bayern …).
 * Die Schuldaten (data/schulen-xx.js) werden erst geladen, wenn das Land gewählt ist.
 * Die Suche läuft nur im Browser: Ort, Postleitzahl oder Standort werden nirgends hingeschickt.
 */
(function (root) {
    "use strict";

    function entfernungKm(lat1, lon1, lat2, lon2) {
        var r = 6371;
        var rad = Math.PI / 180;
        var dLat = (lat2 - lat1) * rad;
        var dLon = (lon2 - lon1) * rad;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * r * Math.asin(Math.sqrt(a));
    }

    function normal(text) {
        return String(text || "").trim().toLowerCase().replace(/\s+/g, " ");
    }

    // Findet den Mittelpunkt zu einer Eingabe: Postleitzahl oder Ortsname.
    function findeMitte(daten, eingabe) {
        var e = normal(eingabe);
        if (!e) return { fehler: "ls_err_empty" };
        if (/^\d{5}$/.test(e)) {
            if (daten.plz[e]) return { mitte: daten.plz[e] };
            // Postleitzahl ohne Schule (z. B. 80331 in der Münchner Innenstadt):
            // ungefähre Mitte aus den bekannten Postleitzahlen mit gleichem Anfang
            var naehe = ungefaehreMitte(daten.plz, e);
            return naehe ? { mitte: naehe, ungefaehr: true } : { fehler: "ls_err_unknown" };
        }
        if (/^\d+$/.test(e)) return { fehler: "ls_err_unknown" };
        if (daten.orte[e]) return { mitte: daten.orte[e] };
        // Erster Ort, der so beginnt, z. B. "forst" → "forst (lausitz)"
        var namen = Object.keys(daten.orte).filter(function (o) { return o.indexOf(e) === 0; }).sort();
        return namen.length ? { mitte: daten.orte[namen[0]], ort: namen[0] } : { fehler: "ls_err_unknown" };
    }

    // Mittelpunkt der bekannten Postleitzahlen mit denselben ersten 4 (sonst 3) Ziffern
    function ungefaehreMitte(plz, eingabe) {
        for (var stellen = 4; stellen >= 3; stellen--) {
            var anfang = eingabe.slice(0, stellen);
            var treffer = Object.keys(plz).filter(function (p) { return p.indexOf(anfang) === 0; });
            if (treffer.length) {
                var lat = 0, lon = 0;
                treffer.forEach(function (p) { lat += plz[p][0]; lon += plz[p][1]; });
                return [lat / treffer.length, lon / treffer.length];
            }
        }
        return null;
    }

    // Ganztag in der Sekundarstufe I laut "Besonderheiten" der Landesdaten
    function hatGanztag(s) {
        return (s.bm || []).some(function (b) { return /ganztag/i.test(b) && /sek\s?i\b/i.test(b); });
    }

    /*
     * optionen: { eingabe | mitte: [lat, lon], arten: [...], privat, radiusKm, sprache?, ganztag? }
     * Rückgabe: { ok: true, mitte, schulen: [...mit km] } oder { ok: false, fehler }
     */
    function suche(daten, optionen) {
        var mitte = optionen.mitte;
        var ungefaehr = false;
        if (!mitte) {
            var m = findeMitte(daten, optionen.eingabe);
            if (m.fehler) return { ok: false, fehler: m.fehler };
            mitte = m.mitte;
            ungefaehr = !!m.ungefaehr;
        }
        var arten = optionen.arten || [];
        var schulen = daten.schulen
            .filter(function (s) { return arten.indexOf(s.a) !== -1 && (optionen.privat || !s.p); })
            .filter(function (s) { return !optionen.sprache || (s.sp || []).indexOf(optionen.sprache) !== -1; })
            .filter(function (s) { return !optionen.ganztag || hatGanztag(s); })
            .map(function (s) {
                var k = {};
                for (var x in s) k[x] = s[x];
                k.km = entfernungKm(mitte[0], mitte[1], s.lat, s.lon);
                return k;
            })
            .filter(function (s) { return s.km <= optionen.radiusKm; })
            .sort(function (a, b) { return a.km - b.km; });
        return { ok: true, mitte: mitte, schulen: schulen, ungefaehr: ungefaehr };
    }

    var logik = { entfernungKm: entfernungKm, findeMitte: findeMitte, suche: suche, hatGanztag: hatGanztag };
    if (typeof module !== "undefined" && module.exports) {
        module.exports = logik;
        return;
    }
    root.LandSuche = logik;

    // ---------- Oberfläche ----------

    var App, Laender, t, el;
    var bereich = document.getElementById("landSuche");
    var zustand = {};   // je Land: { eingabe, arten, privat, radius, ergebnis, sichtbar }
    var aktuell = null;
    var karte = null, markerSchicht = null, karteAn = false;
    var PRO_SEITE = 10;
    var MERK_SCHLUESSEL = "schulwechsel-land-merkliste";
    var merk = null;

    function merkliste() {
        if (!merk) {
            var speicher = null;
            try { speicher = window.localStorage; } catch (e) { speicher = null; }
            merk = window.Merkliste.erstelle(speicher, MERK_SCHLUESSEL);
        }
        return merk;
    }

    function merkId(s) { return aktuell + ":" + s.id; }

    function daten() { return (window.LANDSCHULEN || {})[aktuell]; }
    function land() { return Laender.LAND[aktuell]; }

    function ladeDaten(code, fertig) {
        if ((window.LANDSCHULEN || {})[code]) { fertig(); return; }
        var s = document.createElement("script");
        s.src = Laender.LAND[code].schuldaten;
        s.onload = function () { fertig(); };
        s.onerror = function () { fertig(new Error("laden")); };
        document.head.appendChild(s);
    }

    function z() {
        if (!zustand[aktuell]) {
            zustand[aktuell] = {
                eingabe: "", arten: Object.keys(land().arten), privat: true,
                radius: 10, sprache: "", ganztag: false, ergebnis: null, sichtbar: PRO_SEITE
            };
        }
        return zustand[aktuell];
    }

    function link(text, href) {
        var a = el("a", "", text);
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener";
        return a;
    }

    function baue(code) {
        App = window.App;
        Laender = window.Laender;
        if (!bereich || !App || !Laender) return;
        t = App.t;
        el = App.element;
        if (code !== aktuell) karteAn = false;
        aktuell = code;
        bereich.textContent = "";
        var vg = document.getElementById("landVergleich");
        if (vg) vg.textContent = "";
        karte = null;
        var l = Laender.LAND[code];
        if (!l || !l.schuldaten) return;
        bereich.appendChild(el("p", "klein", t("ls_loading")));
        ladeDaten(code, function (fehler) {
            if (code !== aktuell) return;
            bereich.textContent = "";
            if (fehler || !daten()) {
                bereich.appendChild(el("div", "fehler-box", t("ls_err_load")));
                return;
            }
            baueForm();
            if (z().ergebnis) zeige();
            zeigeVergleich();
        });
    }

    function baueForm() {
        var l = land();
        var d = daten();
        var st = z();
        bereich.appendChild(el("p", "", t("ls_intro", { land: l.name })));
        if (d.nurStaatlich) {
            var warn = el("div", "info-box");
            warn.appendChild(el("p", "", t("ls_only_state", { land: l.name })));
            bereich.appendChild(warn);
        }

        var form = el("form", "suche");
        form.noValidate = true;
        var zeile = el("div", "suche-zeile");
        var feld = el("label", "feld");
        feld.appendChild(el("span", "", t("ls_place_label")));
        var input = el("input");
        input.id = "lsOrt";
        input.type = "text";
        input.autocomplete = "off";
        input.setAttribute("list", "lsOrte");
        input.placeholder = l.name === "Bayern" ? "Nürnberg / 90402" : "Potsdam / 14467";
        input.value = st.eingabe;
        input.lang = "de";
        feld.appendChild(input);
        var liste = el("datalist");
        liste.id = "lsOrte";
        Object.keys(d.orte).forEach(function (o) {
            var opt = el("option");
            opt.value = o.replace(/(^|[\s(\-/])(\S)/g, function (m, a, b) { return a + b.toUpperCase(); });
            liste.appendChild(opt);
        });
        feld.appendChild(liste);
        zeile.appendChild(feld);

        var rf = el("label", "feld");
        rf.appendChild(el("span", "", t("radius_label")));
        var radius = el("select");
        radius.id = "lsRadius";
        radius.dir = "ltr";
        [5, 10, 15, 25].forEach(function (km) {
            var o = el("option", "", km + " km");
            o.value = String(km);
            if (km === st.radius) o.selected = true;
            radius.appendChild(o);
        });
        rf.appendChild(radius);
        zeile.appendChild(rf);
        form.appendChild(zeile);

        var fs = el("fieldset", "filter");
        fs.appendChild(el("legend", "", t("types_label")));
        Object.keys(l.arten).forEach(function (id) {
            var a = l.arten[id];
            var lab = el("label", "schalter art-" + a.farbe);
            var cb = el("input");
            cb.type = "checkbox";
            cb.name = "lsArt";
            cb.value = id;
            cb.checked = st.arten.indexOf(id) !== -1;
            lab.appendChild(cb);
            lab.appendChild(document.createTextNode(" " + a.name));
            lab.lang = "de";
            fs.appendChild(lab);
        });
        if (!d.nurStaatlich) {
            var pl = el("label", "schalter");
            var pc = el("input");
            pc.type = "checkbox";
            pc.id = "lsPrivat";
            pc.checked = st.privat;
            pl.appendChild(pc);
            pl.appendChild(el("span", "", " " + t("private_label")));
            fs.appendChild(pl);
        }
        form.appendChild(fs);

        var sprachen = {};
        var spJahr = "";
        d.schulen.forEach(function (s) {
            (s.sp || []).forEach(function (x) { sprachen[x] = (sprachen[x] || 0) + 1; });
            if (s.spj && s.spj > spJahr) spJahr = s.spj;
        });
        var namen = Object.keys(sprachen).filter(function (x) { return !/^sonstige/i.test(x); })
            .sort(function (a, b) { return sprachen[b] - sprachen[a]; });
        if (namen.length) {
            var ff = el("fieldset", "filter");
            ff.appendChild(el("legend", "", t("ls_more_filter")));
            var sl = el("label", "feld");
            sl.appendChild(el("span", "", t("ls_lang_filter")));
            var sel = el("select");
            sel.id = "lsSprache";
            var alle = el("option", "", t("ls_lang_any"));
            alle.value = "";
            sel.appendChild(alle);
            namen.forEach(function (n) {
                var o = el("option", "", n);
                o.value = n;
                o.lang = "de";
                if (n === st.sprache) o.selected = true;
                sel.appendChild(o);
            });
            sl.appendChild(sel);
            ff.appendChild(sl);
            if (d.schulen.some(hatGanztag)) {
                var gl = el("label", "schalter");
                var gc = el("input");
                gc.type = "checkbox";
                gc.id = "lsGanztag";
                gc.checked = st.ganztag;
                gl.appendChild(gc);
                gl.appendChild(el("span", "", " " + t("ls_ganztag")));
                ff.appendChild(gl);
            }
            ff.appendChild(el("p", "klein", t("ls_filter_hint", { jahr: spJahr })));
            form.appendChild(ff);
        }

        var knoepfe = el("div", "knoepfe");
        var los = el("button", "", t("btn_search"));
        los.type = "submit";
        knoepfe.appendChild(los);
        if (navigator.geolocation) {
            var hier = el("button", "zweitrangig", "📍 " + t("ls_here"));
            hier.type = "button";
            hier.addEventListener("click", function () {
                hier.disabled = true;
                navigator.geolocation.getCurrentPosition(function (pos) {
                    hier.disabled = false;
                    lies();
                    st.eingabe = "";
                    input.value = "";
                    rechne([pos.coords.latitude, pos.coords.longitude], true);
                }, function () {
                    hier.disabled = false;
                    zeigeFehler("ls_err_geo");
                }, { timeout: 10000, maximumAge: 600000 });
            });
            knoepfe.appendChild(hier);
        }
        form.appendChild(knoepfe);
        form.appendChild(el("p", "klein", t("ls_privacy")));
        bereich.appendChild(form);

        var fehler = el("div", "fehler-box verborgen");
        fehler.id = "lsFehler";
        fehler.setAttribute("role", "alert");
        bereich.appendChild(fehler);

        var erg = el("div", "verborgen");
        erg.id = "lsErgebnis";
        erg.setAttribute("aria-live", "polite");
        bereich.appendChild(erg);

        bereich.appendChild(quelle());

        form.addEventListener("submit", function (e) {
            e.preventDefault();
            lies();
            rechne(null, true);
        });
        form.addEventListener("change", function (e) {
            if (e.target === input) return;
            lies();
            if (st.ergebnis && st.ergebnis.ok) rechne(st.ergebnis.mitte, false, st.ergebnis.ungefaehr);
        });
    }

    function quelle() {
        var d = daten();
        var box = el("div", "klein land-datenquelle");
        var p = el("p");
        p.appendChild(document.createTextNode(t("ls_source") + " "));
        var q = link(d.quelle, d.quelleUrl);
        q.lang = "de";
        p.appendChild(q);
        p.appendChild(document.createTextNode(", " + t("ls_licence") + " "));
        p.appendChild(link(d.lizenz, d.lizenzUrl));
        p.appendChild(document.createTextNode(" (" + d.namensnennung + "). " + t("ls_as_of", { datum: App.datum(d.stand) }) + " " + t("ls_check")));
        box.appendChild(p);
        return box;
    }

    function lies() {
        var st = z();
        st.eingabe = document.getElementById("lsOrt").value;
        st.radius = Number(document.getElementById("lsRadius").value);
        st.arten = Array.prototype.map.call(bereich.querySelectorAll('input[name="lsArt"]:checked'), function (c) { return c.value; });
        var p = document.getElementById("lsPrivat");
        st.privat = p ? p.checked : true;
        var sp = document.getElementById("lsSprache");
        st.sprache = sp ? sp.value : "";
        var gt = document.getElementById("lsGanztag");
        st.ganztag = gt ? gt.checked : false;
    }

    function zeigeFehler(schluessel) {
        var box = document.getElementById("lsFehler");
        if (!box) return;
        box.textContent = schluessel ? t(schluessel, { land: land().name }) : "";
        box.classList.toggle("verborgen", !schluessel);
        if (schluessel) document.getElementById("lsErgebnis").classList.add("verborgen");
    }

    function rechne(mitte, scrollen, ungefaehr) {
        var st = z();
        if (!st.arten || st.arten.length === 0) {
            zeigeFehler("err_no_type");
            return;
        }
        var r = suche(daten(), {
            eingabe: st.eingabe, mitte: mitte, arten: st.arten, privat: st.privat, radiusKm: st.radius,
            sprache: st.sprache, ganztag: st.ganztag
        });
        if (!r.ok) {
            st.ergebnis = null;
            zeigeFehler(r.fehler);
            return;
        }
        if (ungefaehr) r.ungefaehr = true;
        st.ergebnis = r;
        st.sichtbar = PRO_SEITE;
        zeigeFehler(null);
        zeige();
        if (scrollen) document.getElementById("lsErgebnis").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function zeige() {
        var st = z();
        var r = st.ergebnis;
        var erg = document.getElementById("lsErgebnis");
        if (!erg || !r) return;
        var l = land();
        erg.textContent = "";
        erg.classList.remove("verborgen");
        erg.appendChild(el("p", "treffer-anzahl", r.schulen.length
            ? t("near_count", { anzahl: r.schulen.length, km: st.radius })
            : t("near_none")));
        if (r.ungefaehr) erg.appendChild(el("p", "klein hinweis-orange", t("ls_approx")));
        erg.appendChild(el("p", "klein hinweis-blau", t("open_day_hint")));

        // Karte erst nach Zustimmung (OpenStreetMap bekommt die IP-Adresse)
        var kb = el("div", "karte-bereich nur-bildschirm");
        if (!karteAn) {
            var hin = el("div", "karte-einwilligung");
            hin.appendChild(el("p", "karte-einwilligung-titel", t("map_consent_title")));
            var kk = el("button", "", t("btn_map"));
            kk.type = "button";
            kk.addEventListener("click", function () { karteAn = true; zeige(); });
            hin.appendChild(kk);
            hin.appendChild(el("p", "klein", t("map_notice")));
            kb.appendChild(hin);
        } else {
            var kartenEl = el("div", "karte");
            kartenEl.id = "lsKarte";
            kb.appendChild(kartenEl);
        }
        erg.appendChild(kb);

        var ul = el("ul", "schul-liste");
        r.schulen.slice(0, st.sichtbar).forEach(function (s) { ul.appendChild(schule(s, l)); });
        erg.appendChild(ul);
        if (r.schulen.length > st.sichtbar) {
            var mehr = el("button", "zweitrangig", t("show_more"));
            mehr.type = "button";
            mehr.addEventListener("click", function () { st.sichtbar += PRO_SEITE; zeige(); });
            erg.appendChild(mehr);
        }
        if (karteAn) zeichneKarte(r, l);
    }

    function schule(s, l) {
        var art = l.arten[s.a];
        var li = el("li", "schule schule-" + art.farbe);
        li.id = "ls-" + s.id;
        var kopf = el("div", "schule-kopf");
        var name = el("strong", "", s.n);
        name.lang = "de";
        kopf.appendChild(name);
        var km = el("span", "abstand", App.zahl(s.km, 1) + " km");
        km.dir = "ltr";
        kopf.appendChild(km);
        li.appendChild(kopf);

        var info = el("div", "schule-info");
        var badge = el("span", "badge badge-" + art.farbe, s.f && s.f !== art.name ? s.f : art.name);
        badge.lang = "de";
        info.appendChild(badge);
        info.appendChild(el("span", "traeger", s.p ? t("school_private") : t("school_public")));
        li.appendChild(info);

        var adr = el("div", "adresse", s.s + ", " + s.z + " " + s.o);
        adr.lang = "de";
        li.appendChild(adr);

        li.appendChild(merkKnopf(s));
        li.appendChild(details(s, l));

        var kontakt = el("div", "kontakt");
        if (s.w) kontakt.appendChild(link("🌐 " + t("website"), s.w));
        if (s.t) {
            var tel = el("a", "", "☎ " + s.t);
            tel.href = "tel:" + s.t.replace(/[^+\d]/g, "");
            tel.dir = "ltr";
            kontakt.appendChild(tel);
        }
        if (s.e) {
            var mail = el("a", "", "✉ " + s.e);
            mail.href = "mailto:" + s.e;
            mail.dir = "ltr";
            kontakt.appendChild(mail);
        }
        if (kontakt.childNodes.length) li.appendChild(kontakt);
        return li;
    }

    function merkKnopf(s) {
        var knopf = el("button", "merken");
        knopf.type = "button";
        var id = merkId(s);
        function beschriften() {
            var an = merkliste().istGemerkt(id);
            knopf.textContent = an ? t("btn_remembered") : t("btn_remember");
            knopf.setAttribute("aria-pressed", an ? "true" : "false");
        }
        beschriften();
        knopf.addEventListener("click", function () {
            merkliste().umschalten(id);
            beschriften();
            zeigeVergleich();
        });
        return knopf;
    }

    function gemerkte() {
        var d = daten();
        if (!d) return [];
        var nachId = {};
        d.schulen.forEach(function (s) { nachId[aktuell + ":" + s.id] = s; });
        return merkliste().ids().filter(function (id) { return nachId[id]; }).map(function (id) { return nachId[id]; });
    }

    function zeigeVergleich() {
        var box = document.getElementById("landVergleich");
        if (!box || !daten()) return;
        var l = land();
        var schulen = gemerkte();
        var zaehler = document.getElementById("merkZaehler");
        if (zaehler) {
            zaehler.textContent = schulen.length ? String(schulen.length) : "";
            zaehler.classList.toggle("verborgen", schulen.length === 0);
        }
        box.textContent = "";
        if (!schulen.length) {
            box.appendChild(el("p", "klein", t("compare_empty")));
            return;
        }
        var st = z();
        var mitte = st.ergebnis && st.ergebnis.ok ? st.ergebnis.mitte : null;
        var scroll = el("div", "tabelle-scroll");
        var tab = el("table", "vergleich-tabelle");
        var kopf = el("thead");
        var kz = el("tr");
        kz.appendChild(el("th"));
        schulen.forEach(function (s) {
            var th = el("th");
            th.scope = "col";
            var name = el("div", "", s.n);
            name.lang = "de";
            th.appendChild(name);
            var weg = el("button", "entfernen nur-bildschirm", "✕ " + t("compare_remove"));
            weg.type = "button";
            weg.addEventListener("click", function () {
                merkliste().umschalten(merkId(s));
                zeigeVergleich();
                if (st.ergebnis) zeige();
            });
            th.appendChild(weg);
            kz.appendChild(th);
        });
        kopf.appendChild(kz);
        tab.appendChild(kopf);

        var zeilen = [
            ["compare_type", function (s) {
                var sp = el("span", "art-" + l.arten[s.a].farbe, s.f || l.arten[s.a].name);
                sp.lang = "de";
                return sp;
            }],
            ["compare_carrier", function (s) { return s.p ? t("school_private") : t("school_public"); }],
            ["ls_place", function (s) { return s.z + " " + s.o; }],
            ["compare_distance", function (s) {
                if (!mitte) return "–";
                var km = entfernungKm(mitte[0], mitte[1], s.lat, s.lon);
                return App.zahl(km, 1) + " km · 🚶 " + minuten(km, 4.5) + " min";
            }],
            ["ls_languages", function (s) {
                return s.sp && s.sp.length ? s.sp.join(", ") + (s.spj ? " (" + t("ls_sp_year", { jahr: s.spj }) + ")" : "") : "–";
            }],
            ["ls_features", function (s) { return s.bm && s.bm.length ? s.bm.join(", ") : "–"; }],
            ["website", function (s) { return s.w ? link("🌐 " + t("website"), s.w) : "–"; }],
            ["ls_phone", function (s) { return s.t || "–"; }],
            ["f_notes", function (s) {
                var ta = el("textarea", "land-notiz");
                ta.rows = 3;
                ta.value = merkliste().notiz(merkId(s), "notizen");
                ta.setAttribute("aria-label", t("f_notes") + ": " + s.n);
                ta.addEventListener("input", function () { merkliste().setzeNotiz(merkId(s), "notizen", ta.value); });
                return ta;
            }]
        ];
        var rumpf = el("tbody");
        zeilen.forEach(function (zl) {
            var tr = el("tr");
            var th = el("th", "", t(zl[0]));
            th.scope = "row";
            tr.appendChild(th);
            schulen.forEach(function (s) {
                var td = el("td");
                td.dir = "auto";
                var inhalt = zl[1](s);
                if (typeof inhalt === "string") td.textContent = inhalt; else td.appendChild(inhalt);
                tr.appendChild(td);
            });
            rumpf.appendChild(tr);
        });
        tab.appendChild(rumpf);
        scroll.appendChild(tab);
        box.appendChild(scroll);

        var knoepfe = el("div", "knoepfe nur-bildschirm");
        var leeren = el("button", "zweitrangig", t("compare_clear"));
        leeren.type = "button";
        leeren.addEventListener("click", function () {
            gemerkte().forEach(function (s) { merkliste().umschalten(merkId(s)); });
            zeigeVergleich();
            if (st.ergebnis) zeige();
        });
        knoepfe.appendChild(leeren);
        box.appendChild(knoepfe);
    }

    function minuten(km, kmh) {
        // Umweg-Faktor 1,3 gegenüber der Luftlinie, auf 5 Minuten gerundet (wie in Berlin)
        return Math.max(5, Math.round((km * 1.3 / kmh) * 60 / 5) * 5);
    }

    function zeile(titel, text) {
        var p = el("p");
        p.appendChild(el("strong", "", titel + ": "));
        var sp = el("span", "", text);
        sp.lang = "de";
        p.appendChild(sp);
        return p;
    }

    function details(s, l) {
        var d = el("details", "schule-details");
        d.appendChild(el("summary", "", t("ls_details")));

        var fakten = el("div", "fakten");
        fakten.appendChild(el("span", "chip fakt", "🚶 " + t("chip_walk", { min: minuten(s.km, 4.5) })));
        fakten.appendChild(el("span", "chip fakt", "🚲 " + t("chip_bike", { min: minuten(s.km, 15) })));
        d.appendChild(fakten);
        d.appendChild(el("p", "klein", t("travel_note")));
        var ziel = s.s + ", " + s.z + " " + s.o;
        var anfahrt = link("🚌 " + t("travel_link"), "https://www.google.com/maps/dir/?api=1&travelmode=transit&destination=" + encodeURIComponent(ziel));
        anfahrt.className = "anfahrt-link";
        d.appendChild(anfahrt);

        if (s.f) d.appendChild(zeile(t("ls_form"), s.f));
        if (s.sp && s.sp.length) {
            d.appendChild(zeile(t("ls_languages") + (s.spj ? " (" + t("ls_sp_year", { jahr: s.spj }) + ")" : ""), s.sp.join(", ")));
        }
        if (s.bm && s.bm.length) d.appendChild(zeile(t("ls_features"), s.bm.join(", ")));

        if (s.w && s.wg) d.appendChild(el("p", "klein land-web-geprueft", t("ls_web_checked", { datum: App.datum(s.wg) })));
        if (!s.w && !s.t && !s.e) {
            var box = el("div", "info-box");
            box.appendChild(el("p", "", t("ls_no_contact", { land: l.name })));
            var p = el("p");
            p.appendChild(link("🔎 " + t("ls_search_web"), "https://duckduckgo.com/?q=" + encodeURIComponent(s.n + " " + s.o)));
            box.appendChild(p);
            d.appendChild(box);
        }
        return d;
    }

    var FARBEN = { gym: "#1565c0", iss: "#2e7d32", gms: "#8e24aa" };

    function zeichneKarte(r, l) {
        var L = window.L;
        var kartenEl = document.getElementById("lsKarte");
        if (!L || !kartenEl) return;
        karte = L.map(kartenEl, { scrollWheelZoom: false, zoomSnap: 0.5 });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
        }).addTo(karte);
        markerSchicht = L.layerGroup().addTo(karte);
        L.circleMarker(r.mitte, { radius: 6, color: "#333", fillOpacity: 0.9 }).addTo(markerSchicht);
        var punkte = [r.mitte];
        r.schulen.forEach(function (s) {
            var farbe = FARBEN[l.arten[s.a].farbe] || "#555";
            var m = L.circleMarker([s.lat, s.lon], { radius: 7, color: farbe, fillColor: farbe, fillOpacity: 0.8, weight: 2 });
            var div = document.createElement("div");
            var b = document.createElement("strong");
            b.textContent = s.n;
            div.appendChild(b);
            div.appendChild(document.createElement("br"));
            div.appendChild(document.createTextNode(l.arten[s.a].name + " · " + App.zahl(s.km, 1) + " km"));
            m.bindPopup(div);
            m.addTo(markerSchicht);
            punkte.push([s.lat, s.lon]);
        });
        karte.fitBounds(L.latLngBounds(punkte).pad(0.1));
    }

    root.LandSuche.baue = baue;
})(this);
