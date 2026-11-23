/*
 * Bundesländer: Übergang von der Grundschule an die weiterführende Schule.
 *
 * Jedes Land hat hier seine Regeln, Schularten und Termine. Berlin nutzt
 * weiter den eigenen Rechner in js/rechner.js.
 *
 * WICHTIGSTE REGEL: Nur Angaben aus aktuellen amtlichen Quellen (Ministerien,
 * Gesetze und Verordnungen, Staatliche Schulämter). Jede Quelle steht unten in
 * "quellen" und wird mit dem Prüfdatum in der App angezeigt. Was nicht amtlich
 * belegt ist, kommt nicht in die App.
 *
 * Geprüft am 23.11.2026:
 *   Bayern:      GrSO § 6 (gesetze-bayern.de): Gesamtdurchschnittsnote aus Deutsch,
 *                Mathematik, Heimat- und Sachunterricht; Gymnasium "mindestens 2,33",
 *                Realschule "mindestens 2,66" (mit ganzen Notensummen: 7 bzw. 8).
 *                Abs. 6: bis 3,33 für Kinder nichtdeutscher Muttersprache, die nicht ab
 *                Jahrgangsstufe 1 eine deutsche Grundschule besucht haben.
 *                km.bayern.de: Übertrittszeugnis 3. Mai 2027, Anmeldung Gymnasium und
 *                Realschule 10.–14. Mai 2027, Probeunterricht 1.–3. Juni 2027
 *                (drei Tage, Deutsch und Mathematik).
 *   Brandenburg: mbjs.brandenburg.de, Übergang in die Sekundarstufe I: Probeunterricht
 *                nicht nötig, wenn der Durchschnitt aus Deutsch, Mathematik (dreifach),
 *                erster Fremdsprache (zweifach), Gesellschafts- und Naturwissenschaften
 *                (einfach) im Halbjahreszeugnis 6 den Wert 2,3 nicht übersteigt.
 *                Die Gewichte ergeben zusammen 10, der Durchschnitt hat also genau eine
 *                Stelle nach dem Komma: Summe bis 23 = höchstens 2,3.
 *                Zeitplan Ü7-Verfahren zum Schuljahr 2027/28 (MBJS) für die Termine.
 *   Sachsen:     schule.sachsen.de: Bildungsempfehlung Gymnasium bei Durchschnitt
 *                Deutsch, Mathematik, Sachunterricht 2,0 oder besser und keine dieser
 *                Noten "ausreichend" oder schlechter; Eltern können auch ohne Empfehlung
 *                am Gymnasium anmelden (Leistungserhebung und Beratungsgespräch).
 *   Thüringen:   Leistungsbeschreibung des Landes (FIM, Thüringer Ministerium für Bildung)
 *                und Elternbrief des Staatlichen Schulamts (Stand November 2025):
 *                Deutsch, Mathematik, Heimat- und Sachkunde im Halbjahreszeugnis Klasse 4
 *                jeweils mindestens "gut", oder Empfehlung der Grundschule auf Antrag der
 *                Eltern, sonst Aufnahmeprüfung (drei Tage Probeunterricht).
 *
 * Diese Datei hat keine Abhängigkeiten und läuft im Browser und in Node (Tests).
 */
(function (root) {
    "use strict";

    function istNote(wert) {
        return typeof wert === "number" && Number.isInteger(wert) && wert >= 1 && wert <= 6;
    }

    // Durchschnitt mit festen Stellen, ohne Rundung (abgeschnitten), mit ganzen Zahlen gerechnet.
    function abschneiden(summe, anzahl, stellen) {
        var faktor = Math.pow(10, stellen);
        return Math.floor((summe * faktor) / anzahl) / faktor;
    }

    function pruefe(faecher, noten) {
        var fehler = [];
        var werte = [];
        faecher.forEach(function (fach) {
            var wert = noten ? noten[fach.id] : undefined;
            if (!istNote(wert)) {
                fehler.push({ fach: fach.id });
            } else {
                werte.push(wert);
            }
        });
        var summe = werte.reduce(function (a, b) { return a + b; }, 0);
        return { fehler: fehler, werte: werte, summe: summe };
    }

    // ---------- Rechner der Länder ----------

    function berechneBY(noten) {
        var p = pruefe(LAND.BY.faecher, noten);
        if (p.fehler.length) return { ok: false, fehler: p.fehler };
        var gym = p.summe <= 7;
        var rs = p.summe <= 8;
        return {
            ok: true, fehler: [], werte: p.werte, summe: p.summe,
            durchschnitt: abschneiden(p.summe, 3, 2),
            durchschnittGenau: p.summe / 3,
            arten: [
                { id: "gym", status: gym ? "ja" : "probe" },
                { id: "rs", status: rs ? "ja" : "probe" },
                { id: "ms", status: "ja" }
            ],
            alleDirekt: gym
        };
    }

    // Gewichteter Durchschnitt: Deutsch und Mathematik dreifach, 1. Fremdsprache zweifach,
    // Gesellschafts- und Naturwissenschaften einfach (zusammen 10).
    function berechneBB(noten) {
        var faecher = LAND.BB.faecher;
        var p = pruefe(faecher, noten);
        if (p.fehler.length) return { ok: false, fehler: p.fehler };
        var gewichtet = 0;
        var gewichte = 0;
        faecher.forEach(function (f) {
            gewichtet += noten[f.id] * f.gewicht;
            gewichte += f.gewicht;
        });
        var ohneProbe = gewichtet <= 23;
        return {
            ok: true, fehler: [], werte: p.werte, summe: gewichtet, gewichte: gewichte,
            durchschnitt: abschneiden(gewichtet, gewichte, 1),
            durchschnittGenau: gewichtet / gewichte,
            arten: [
                { id: "gym", status: ohneProbe ? "ja" : "probe" },
                { id: "ges", status: "ja" },
                { id: "os", status: "ja" }
            ],
            alleDirekt: ohneProbe
        };
    }

    function berechneSN(noten) {
        var p = pruefe(LAND.SN.faecher, noten);
        if (p.fehler.length) return { ok: false, fehler: p.fehler };
        var keineVier = p.werte.every(function (n) { return n <= 3; });
        var gym = p.summe <= 6 && keineVier;
        return {
            ok: true, fehler: [], werte: p.werte, summe: p.summe,
            durchschnitt: abschneiden(p.summe, 3, 2),
            durchschnittGenau: p.summe / 3,
            keineVier: keineVier,
            arten: [
                { id: "gym", status: gym ? "ja" : "test" },
                { id: "os", status: "ja" },
                { id: "gms", status: "ja" }
            ],
            alleDirekt: gym
        };
    }

    function berechneTH(noten) {
        var p = pruefe(LAND.TH.faecher, noten);
        if (p.fehler.length) return { ok: false, fehler: p.fehler };
        var alleGut = p.werte.every(function (n) { return n <= 2; });
        return {
            ok: true, fehler: [], werte: p.werte, summe: p.summe,
            durchschnitt: abschneiden(p.summe, 3, 2),
            durchschnittGenau: p.summe / 3,
            alleGut: alleGut,
            arten: [
                { id: "gym", status: alleGut ? "ja" : "pruefung" },
                { id: "rs", status: "ja" },
                { id: "gms", status: "ja" },
                { id: "ges", status: "ja" }
            ],
            alleDirekt: alleGut
        };
    }

    // ---------- Länder ----------
    // klasse: nach welcher Klasse gewechselt wird. aktiv: schon in der App.
    // Schularten: name bleibt Deutsch, farbe passt zu den Farben der App (gym, iss, gms).

    var GEPRUEFT = "2026-11-23";

    var LAND = {
        BW: { name: "Baden-Württemberg", klasse: 4 },
        BY: {
            name: "Bayern", klasse: 4, aktiv: true,
            faecher: [
                { id: "deutsch", name: "Deutsch" },
                { id: "mathe", name: "Mathematik" },
                { id: "hsu", name: "Heimat- und Sachunterricht" }
            ],
            spalte: "lr_col_by",
            arten: {
                gym: { name: "Gymnasium", farbe: "gym" },
                rs: { name: "Realschule", farbe: "iss", text: "by_desc_rs" },
                ms: { name: "Mittelschule", farbe: "gms", text: "by_desc_ms" }
            },
            regel: "by_rule", weg: "by_way", wahl: "by_choice", tipp: "tip_4",
            schnittStellen: 2, zeigeSumme: true,
            berechne: berechneBY,
            amtlich: "https://www.km.bayern.de/lernen/ubertritt-und-bildungswege/uebertritt",
            terminQuelle: "https://www.km.bayern.de/termine/schulanmeldungen",
            termine: [
                { von: "2027-05-03", text: "by_t1" },
                { von: "2027-05-10", bis: "2027-05-14", text: "by_t2" },
                { von: "2027-06-01", bis: "2027-06-03", text: "by_t3" }
            ],
            quellen: [
                { titel: "Grundschulordnung (GrSO) § 6", url: "https://www.gesetze-bayern.de/Content/Document/BayVSO-6" },
                { titel: "Staatsministerium für Unterricht und Kultus: Übertritt", url: "https://www.km.bayern.de/lernen/ubertritt-und-bildungswege/uebertritt" },
                { titel: "Staatsministerium für Unterricht und Kultus: Schulanmeldungen", url: "https://www.km.bayern.de/termine/schulanmeldungen" },
                { titel: "Staatsministerium für Unterricht und Kultus: Prüfungen und Zeugnisse", url: "https://www.km.bayern.de/termine/pruefungen-und-zeugnisse" }
            ]
        },
        BE: { name: "Berlin", klasse: 6, aktiv: true },
        BB: {
            name: "Brandenburg", klasse: 6, aktiv: true,
            faecher: [
                { id: "deutsch", name: "Deutsch", gewicht: 3 },
                { id: "mathe", name: "Mathematik", gewicht: 3 },
                { id: "fremdsprache", name: "1. Fremdsprache", gewicht: 2 },
                { id: "gewi", name: "Gesellschaftswissenschaften", gewicht: 1 },
                { id: "nawi", name: "Naturwissenschaften", gewicht: 1 }
            ],
            spalte: "lr_col_bb",
            arten: {
                gym: { name: "Gymnasium", farbe: "gym", text: "bb_desc_gym" },
                ges: { name: "Gesamtschule", farbe: "gms", text: "bb_desc_ges" },
                os: { name: "Oberschule", farbe: "iss", text: "bb_desc_os" }
            },
            regel: "bb_rule", weg: "bb_way", wahl: "bb_choice", tipp: "tip_bb",
            schnittStellen: 1, zeigeSumme: false,
            berechne: berechneBB,
            amtlich: "https://mbjs.brandenburg.de/bildung/allgemeinbildende-schulen/grundschule/uebergang-in-die-sekundarstufe-i.html",
            terminQuelle: "https://mbjs.brandenburg.de/sixcms/media.php/140/zeitplan_ue7-verfahren_zum_schuljahr_2027_28.pdf",
            termine: [
                { von: "2027-01-29", text: "bb_t1" },
                { von: "2027-02-08", bis: "2027-02-10", text: "bb_t2" },
                { von: "2027-03-01", bis: "2027-03-19", text: "bb_t3" },
                { von: "2027-03-05", text: "bb_t4" },
                { von: "2027-04-05", bis: "2027-04-16", text: "bb_t5" },
                { von: "2027-05-25", text: "bb_t6" }
            ],
            quellen: [
                { titel: "MBJS: Übergang in die Sekundarstufe I", url: "https://mbjs.brandenburg.de/bildung/allgemeinbildende-schulen/grundschule/uebergang-in-die-sekundarstufe-i.html" },
                { titel: "MBJS: Zeitplan Ü7-Verfahren zum Schuljahr 2027/28", url: "https://mbjs.brandenburg.de/sixcms/media.php/140/zeitplan_ue7-verfahren_zum_schuljahr_2027_28.pdf" },
                { titel: "Sekundarstufe I-Verordnung vom 6. August 2026", url: "https://bravors.brandenburg.de/verordnungen/sek_i_v" }
            ]
        },
        HB: { name: "Bremen", klasse: 4 },
        HH: { name: "Hamburg", klasse: 4 },
        HE: { name: "Hessen", klasse: 4 },
        MV: { name: "Mecklenburg-Vorpommern", klasse: 6 },
        NI: { name: "Niedersachsen", klasse: 4 },
        NW: { name: "Nordrhein-Westfalen", klasse: 4 },
        RP: { name: "Rheinland-Pfalz", klasse: 4 },
        SL: { name: "Saarland", klasse: 4 },
        SN: {
            name: "Sachsen", klasse: 4, aktiv: true,
            faecher: [
                { id: "deutsch", name: "Deutsch" },
                { id: "mathe", name: "Mathematik" },
                { id: "su", name: "Sachunterricht" }
            ],
            spalte: "lr_col_sn",
            arten: {
                gym: { name: "Gymnasium", farbe: "gym", text: "sn_desc_gym" },
                os: { name: "Oberschule", farbe: "iss", text: "sn_desc_os" },
                gms: { name: "Gemeinschaftsschule", farbe: "gms", text: "sn_desc_gms" }
            },
            regel: "sn_rule", weg: "sn_way", wahl: "sn_choice", tipp: "tip_4",
            schnittStellen: 2, zeigeSumme: false,
            berechne: berechneSN,
            amtlich: "https://www.schule.sachsen.de/wechsel-an-weiterfuehrende-schularten-4010.html",
            termine: [
                { wann: "step_1", text: "sn_t1" },
                { wann: "step_2", text: "sn_t2" },
                { wann: "step_3", text: "sn_t3" }
            ],
            quellen: [
                { titel: "Schulportal Sachsen: Wechsel an weiterführende Schularten", url: "https://www.schule.sachsen.de/wechsel-an-weiterfuehrende-schularten-4010.html" },
                { titel: "Schulportal Sachsen: Gymnasium", url: "https://www.schule.sachsen.de/gymnasium-3994.html" },
                { titel: "Schulportal Sachsen: Oberschule", url: "https://www.schule.sachsen.de/oberschule-3995.html" },
                { titel: "Schulportal Sachsen: Gemeinschaftsschule", url: "https://www.schule.sachsen.de/gemeinschaftsschule-7398.html" }
            ]
        },
        ST: { name: "Sachsen-Anhalt", klasse: 4 },
        SH: { name: "Schleswig-Holstein", klasse: 4 },
        TH: {
            name: "Thüringen", klasse: 4, aktiv: true,
            faecher: [
                { id: "deutsch", name: "Deutsch" },
                { id: "mathe", name: "Mathematik" },
                { id: "hsk", name: "Heimat- und Sachkunde" }
            ],
            spalte: "lr_col_th",
            arten: {
                gym: { name: "Gymnasium", farbe: "gym" },
                rs: { name: "Regelschule", farbe: "iss" },
                gms: { name: "Gemeinschaftsschule", farbe: "gms" },
                ges: { name: "Gesamtschule", farbe: "gms" }
            },
            regel: "th_rule", weg: "th_way", wahl: "th_choice", tipp: "tip_4",
            schnittStellen: 2, zeigeSumme: false,
            berechne: berechneTH,
            amtlich: "https://bildung.thueringen.de/schule/schularten/gymnasium",
            termine: [
                { wann: "step_1", text: "th_t1" },
                { wann: "step_2", text: "th_t2" },
                { wann: "step_3", text: "th_t3" },
                { wann: "step_4", text: "th_t4" }
            ],
            quellen: [
                { titel: "Leistungsbeschreibung Thüringen: Aufnahme am Gymnasium", url: "https://fimportal.de/api/v0/xzufi-services/L100038/354858/de/pdf" },
                { titel: "Thüringer Ministerium für Bildung: Gymnasium", url: "https://bildung.thueringen.de/schule/schularten/gymnasium" },
                { titel: "Staatliches Schulamt Ostthüringen: Elternbrief Anmeldung am Gymnasium (November 2025)", url: "https://angergymnasium.jena.de/wp-content/uploads/2025/12/Elternbrief-2026-Anmeldung-am-Gymnasium.pdf" }
            ]
        }
    };

    // Alphabetisch nach Namen, so wie die Liste in der App erscheint.
    var CODES = Object.keys(LAND).sort(function (a, b) {
        return LAND[a].name.localeCompare(LAND[b].name, "de");
    });

    var STANDARD = "BE";

    function finde(code) {
        if (!code) return null;
        var c = String(code).toUpperCase();
        return LAND[c] && LAND[c].aktiv ? c : null;
    }

    var api = {
        LAND: LAND,
        CODES: CODES,
        STANDARD: STANDARD,
        GEPRUEFT: GEPRUEFT,
        finde: finde,
        istNote: istNote,
        abschneiden: abschneiden,
        berechneBY: berechneBY,
        berechneBB: berechneBB,
        berechneSN: berechneSN,
        berechneTH: berechneTH
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    } else {
        root.Laender = api;
    }
})(this);
