# Schulwechsel-Helfer

**Von der Grundschule zur weiterführenden Schule**

Unverbindlicher Rechner und Wegweiser für den Übergang von der Grundschule an die weiterführende Schule.
Eltern wählen ihr Bundesland, tragen die Noten aus dem Zeugnis ein und sehen, welche Schularten möglich sind
und wie es weitergeht.

Bundesländer: Berlin (mit Schulsuche, Karte, Merkliste und Frage-Assistent), Brandenburg, Bayern, Sachsen
und Thüringen. Weitere folgen. Die Regeln je Land stehen mit Quellen in `js/laender.js`, die Texte in
`js/i18n-laender.js`. Das Land steht in der Adresse, z. B. `?land=by`.

Hervorgegangen aus dem Oberschul-Helfer Berlin.

## Funktionen

- Noteneingabe wie im Zeugnis (Fächer und Schularten bleiben auf Deutsch)
- Notensumme aus Deutsch, Mathematik und 1. Fremdsprache (bis 14: Gymnasium möglich)
- Durchschnittsnote aller Fächer (Hauptfächer, Naturwissenschaften und Gesellschaftswissenschaften doppelt),
  wie amtlich mit einer Stelle nach dem Komma und nicht gerundet (§ 24 GsVO, Beispiel: 67 : 26 = 2,5)
- Erklärung zu Gymnasium, ISS, Gemeinschaftsschule und Probeunterricht
- Erklärtexte auf Deutsch, Englisch, Türkisch, Arabisch (von rechts nach links), Ukrainisch und Russisch
- Rechenweg zum Aufklappen, Ergebnis als PDF speichern oder drucken
- Schulen in der Nähe: Postleitzahl eingeben, Filter nach Gymnasium, ISS, Gemeinschaftsschule und Privatschulen,
  Liste mit Entfernung und Karte (OpenStreetMap, lädt erst nach Klick)
- Wichtige Termine für den Wechsel und häufige Fragen (FAQ)
- Details pro Schule: Weg zur Schule (Luftlinie, zu Fuß, Fahrrad, Link zu Bus und Bahn) und eine
  Checkliste zum Ausfüllen (Fremdsprachen, Ganztag, Profil, Mittagessen, Tag der offenen Tür, Notizen)
- Schulen merken und nebeneinander vergleichen (nur lokal im Browser gespeichert, `js/merkliste.js`)
- Checkliste für die Schulwahl und 5 Fragen für den Tag der offenen Tür
- Frage-Helfer: kleines Chat-Fenster („Frage-Assistent“) mit vorbereiteten Antworten in allen 6 Sprachen,
  erkennt auch Begrüßungen und Dank; ohne KI, läuft nur im Browser, nichts wird gesendet
- Eingaben werden nicht gesendet oder gespeichert, keine Cookies; nur anonyme Besucherzählung mit GoatCounter (`js/besucherzaehler.js`)
- Impressum und Datenschutzerklärung

## Regeln

Quelle: [Senatsverwaltung für Bildung, Wechsel zur 7. Klasse](https://www.berlin.de/sen/bildung/schule/bildungswege/uebergang-weiterfuehrende-schule/wechsel-zur-7-klasse/)
(Stand November 2026, Übergang 2027). Die Rechenlogik steht in `js/rechner.js`.

## Aufbau

```text
index.html          Rechner
impressum.html      Impressum
datenschutz.html    Datenschutzerklärung
favicon.svg
css/style.css
js/rechner.js       Berechnung (ohne Abhängigkeiten, auch in Node testbar)
js/i18n.js          Übersetzungen
js/umkreis.js       Umkreissuche (ohne Abhängigkeiten, testbar)
js/app.js           Oberfläche
js/assistent.js     Frage-Helfer (Suche und Chat-Fenster, testbar)
js/assistent-daten.js  Fragen, Antworten und Suchwörter des Frage-Helfers
data/schulen.js     Schulen und Postleitzahlen (erzeugt)
scripts/            Skript zum Aktualisieren der Schuldaten
vendor/leaflet/     Kartenbibliothek Leaflet 1.9.4 (BSD-2-Clause)
tests/              Tests mit node:test
```

## Lokal starten

`index.html` im Browser öffnen. Jede Sprache hat eine eigene Seite: `/` (Deutsch), `/en/`, `/tr/`, `/ar/`, `/uk/`, `/ru/`. Alte Links mit `?lang=tr` leiten dorthin weiter.

## Auf allen Geräten

Die Seite passt sich an Handy, Tablet und Computer an (Android, iPhone/iPad, Windows, Mac, Linux).
Sie lässt sich als App auf den Startbildschirm legen und funktioniert danach auch offline
(`manifest.webmanifest`, `sw.js`, Icons in `icons/`).

- Android/Chrome/Edge: Menü → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“
- iPhone/iPad (Safari): Teilen → „Zum Home-Bildschirm“
- Windows/Mac/Linux (Chrome oder Edge): Installieren-Symbol in der Adressleiste

Der Service Worker lädt online immer die neueste Fassung (zuerst Netz, dann Speicher).
Updates sind daher sofort sichtbar. `VERSION` in `sw.js` nur erhöhen, wenn sich die Dateiliste ändert.

## Texte ändern

Alle Texte stehen in `js/i18n.js`. Sie stehen zusätzlich fertig in den HTML-Seiten
(`index.html` Deutsch, `en/index.html`, `tr/index.html`, `ar/index.html`, `uk/index.html`, `ru/index.html`),
damit Google jede Sprache einzeln findet (eigener Titel, eigene Beschreibung, canonical und hreflang).
Die Sprachseiten werden aus `index.html` erzeugt – nur `index.html` bearbeiten, nie die Kopien.
Das Skript schreibt auch die `sitemap.xml` (Adresse: `DOMAIN` in `scripts/texte-einsetzen.js`). Nach einer Änderung an `index.html` oder den Texten:

```bash
npm run texte
```

`npm test` meldet einen Fehler, wenn das vergessen wurde.

## Tests

```bash
npm test
```

Die Tests laufen auch automatisch bei jedem Push (GitHub Actions).

## Schuldaten aktualisieren

```bash
npm run schuldaten
```

Lädt die offenen Daten aus dem Geoportal Berlin (Schulen: Datenlizenz Deutschland – Zero 2.0,
Postleitzahlen: Amt für Statistik Berlin-Brandenburg, CC BY 3.0 DE) und schreibt `data/schulen.js`.
Am besten einmal pro Schuljahr ausführen.

### Schulen in Brandenburg und Bayern (`data/schulen-bb.js`, `data/schulen-by.js`)

```bash
node scripts/laender-schulen-laden.mjs
```

Lädt die amtlichen Schulstandorte aus den WFS-Diensten der Länder:

- Brandenburg: MBJS, `https://schullandschaft.brandenburg.de/edugis/wfs/schulen`,
  Datenlizenz Deutschland – Namensnennung – Version 2.0, „© Ministerium für Bildung, Jugend und Sport“
- Bayern: StMUK, `https://gdiserv.bayern.de/srv112940/services/schulstandortebayern-wfs`,
  CC BY 4.0, „Bayerisches Staatsministerium für Unterricht und Kultus“ (nur staatliche Schulen)

Die Lizenz steht jeweils auch im GetCapabilities des Dienstes. Hinter einem Proxy die GML-Dateien
vorher mit curl laden und mit `--bb` / `--by` übergeben (siehe Kopf des Skripts).

Webseiten bayerischer Schulen: Der amtliche Datensatz enthält keine. `quellen/by-webseiten.json`
enthält Webseiten, die einzeln gesucht (Schulübersichten von Stadt, Landkreis oder Schulamt, sonst
Websuche; **nicht** km.bayern.de, dessen Datenbank geschützt ist) und auf der Seite der Schule selbst
geprüft wurden (Name und Ort oder Straße sichtbar), mit Prüfdatum. Unsichere Treffer, reine
Wartungsseiten und verdächtige Seiten sind nicht enthalten; dort zeigt die App „Webseite der Schule
suchen“. Das Skript übernimmt die Einträge nach „Schulname|PLZ“. Wird nur diese Datei geändert, mit
`--stand <Datum der GML-Dateien>` neu erzeugen, damit das Datum der amtlichen Daten stimmt.
Sachsen und Thüringen fehlen noch: Für Sachsen ist keine Lizenz angegeben, für Thüringen gibt es
keinen landesweiten offenen Datensatz.

### Schulangebote und Termine (`data/schulinfos.js`)

Fremdsprachen, Ganztag, Profil, AGs und Mittagessen kommen aus den Schulporträts des
[Berliner Schulverzeichnisses](https://www.bildung.berlin.de/Schulverzeichnis/), Tage der offenen Tür und
Infoabende aus dem [Kalender der Senatsverwaltung](https://www.berlin.de/land/kalender/index.php?c=79).
Weil der Kalender nur wenige Schulen enthält, werden zusätzlich die Websites der Schulen
durchsucht (Startseite und passende Unterseiten wie „Tag der offenen Tür“, „Anmeldung“, „Termine“).
Von dort kommen weitere Termine und – nur wo das Schulverzeichnis nichts sagt – Ganztag,
Mittagessen und Fremdsprachen. Jede dieser Angaben trägt die Adresse der Seite, auf der sie
gefunden wurde, und das Abrufdatum. Was nicht gefunden wird, zeigt die App mit einem Link zur
Website der Schule an.

```bash
python3 scripts/schulverzeichnis_laden.py roh/      # schreibt roh/portraets.json (ca. 10 Min.)
python3 scripts/kalender_laden.py roh/termine.json  # Termine ab heute
python3 -I scripts/schulwebsites_laden.py data/schulen.js roh/web/          # ca. 30 Min.
python3 -I scripts/schulwebsites_auswerten.py roh/web/ roh/portraets.json roh/web.json
npm run schulinfos -- roh/portraets.json roh/termine.json "" roh/web.json
```

Die Website-Termine sind automatisch erkannt. Nach jedem Lauf die Liste kurz durchsehen
(`roh/web.json` enthält zu jedem Termin den Textausschnitt `ctx`) und falsche Treffer löschen.

Vor jeder Anmelderunde (Herbst) neu laden: Die Schulen tragen ihre Termine laufend nach.

### Aufnahme in Klasse 7 (`data/aufnahme.js`)

Plätze, Anmeldungen im Erstwunsch und – wo amtlich veröffentlicht – die Durchschnittsnote,
bis zu der aufgenommen wurde, je Schule und Schuljahr. Quellen stehen in
`quellen/aufnahme-quellen.json` (Antworten des Senats auf Schriftliche Anfragen im
Abgeordnetenhaus, Angaben der Bezirksämter, jeweils mit Link und Wortlaut).

Jedes Jahr (meist Juni/Juli) neue Quellen ergänzen, alte Jahre stehen lassen (Archiv):

```
python3 scripts/aufnahme_laden.py roh/aufnahme/
```

Eine Zahl wird nur übernommen, wenn Haupt- und Prüfquelle übereinstimmen. Sonst steht die
Schule unter `offen` und die App zeigt „wird noch geprüft“. Braucht `curl` und `pdftotext`.

## Neue Sprache hinzufügen

1. In `js/i18n.js` die Sprache in `SPRACHEN` eintragen.
2. Einen Block in `TEXTE` mit allen Schlüsseln aus `de` anlegen.
3. `npm test` prüft, dass kein Text fehlt.

## Veröffentlichung (GitHub Pages)

Repository → Settings → Pages → Source: „Deploy from branch“, Branch `main`, Ordner `/ (root)`.
Name und Anschrift in `impressum.html` und `datenschutz.html` sind eingetragen (Impressum-Service Autorenglück, Kundennummer #20605). Bei einem Umzug oder Wechsel des Dienstes beide Dateien anpassen.

Die Adresse `https://esra314.github.io/Schulwechsel-Helfer/` steht in `index.html`
(canonical, hreflang, og:url, og:image), `sitemap.xml` und `robots.txt`. Bei einer eigenen Domain dort anpassen.
Danach die `sitemap.xml` in der Google Search Console einreichen.

Sicherheit: Jede Seite hat eine Content-Security-Policy (meta-Tag). Es gibt keine Inline-Skripte;
fremde Server sind nur für die Kartenbilder von OpenStreetMap erlaubt.

## Lizenz

Alle Rechte vorbehalten. Siehe [LICENSE](LICENSE).

## Kontaktformular einrichten (kontakt.html)

Die Seite ist statisch. Nachrichten aus dem Kontaktformular leitet der Dienst
[Formdall](https://formdall.de) (Betreiber und Server in Deutschland, kostenlos bis 100 Nachrichten/Monat)
per E-Mail weiter. Solange in `kontakt.html` noch `FORMULAR-SCHLUESSEL` steht, zeigt die Seite statt des
Formulars nur die E-Mail-Adresse.

1. Bei formdall.de kostenlos registrieren und den Auftragsverarbeitungsvertrag (AVV) bestätigen.
2. Ein Formular anlegen, Captcha: **keins** (Spam-Schutz läuft über Honigtopf, Zeitsperre und Formdall-Spamfilter).
3. Einstellungen: E-Mail-Aktion mit Empfänger = Impressum-Adresse; „Einsendungen speichern“ **aus** lassen,
   Betreff z. B. `{{anliegen}} – {{seite}}`, erlaubte Herkunft = `esra314.github.io`,
   Weiterleitungs-URL = `https://esra314.github.io/Schulwechsel-Helfer/kontakt.html` (nur für Browser ohne JavaScript).
4. Die Formular-Adresse (`https://api.formdall.de/api/v1/f/…`) in `kontakt.html` im `action`-Attribut eintragen.

Wird der Dienst gewechselt: `action` in `kontakt.html`, `connect-src`/`form-action` in der CSP
derselben Datei und Abschnitt 8 der Datenschutzerklärung anpassen.
