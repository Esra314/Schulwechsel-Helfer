# Erzeugt data/aufnahme.js (Plätze, Erstwünsche und Aufnahme-Noten je Schule und Jahr)
# aus den amtlichen Quellen in quellen/aufnahme-quellen.json.
#
# Aufruf: python3 scripts/aufnahme_laden.py [Ordner-für-PDFs]
# Braucht curl und pdftotext (poppler-utils).
#
# Neues Schuljahr: in quellen/aufnahme-quellen.json eine Quelle und unter "tabellen"
# das Jahr mit Haupt- und Prüfquelle ergänzen. Alte Jahre bleiben stehen (Archiv).
# Eine Zahl wird nur übernommen, wenn beide Quellen übereinstimmen; sonst landet
# die Schule unter "offen" und wird in der App nicht mit Zahlen gezeigt.
import sys, os, re, json, subprocess, tempfile

WURZEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZEILE = re.compile(r"^\s*(\d{2}[KYPAG]\d{2})\b.*?\s(\d+|k\.\s?A\.)\s+(\d+|k\.\s?A\.)\s*$")


def text_aus_pdf(url, ordner):
    pdf = os.path.join(ordner, re.sub(r"[^\w.-]", "_", url.rsplit("/", 1)[-1]))
    if not os.path.exists(pdf):
        subprocess.run(["curl", "-sS", "--fail", "--max-time", "60", "-o", pdf, url], check=True)
    return subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, check=True).stdout.decode("utf-8")


def tabelle(text):
    werte = {}
    for zeile in text.splitlines():
        m = ZEILE.match(zeile)
        if m:
            zahl = lambda x: None if x.startswith("k") else int(x)
            werte[m.group(1)] = (zahl(m.group(2)), zahl(m.group(3)))
    return werte


def main():
    ordner = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp()
    os.makedirs(ordner, exist_ok=True)
    with open(os.path.join(WURZEL, "quellen", "aufnahme-quellen.json"), encoding="utf-8") as f:
        cfg = json.load(f)
    with open(os.path.join(WURZEL, "data", "schulen.js"), encoding="utf-8") as f:
        bekannt = set(re.findall(r'"id":"(\w+)"', f.read()))

    schulen, offen = {}, {}
    korrektur = {}
    for k in cfg.get("korrekturen", []):
        for bsn in k["ids"]:
            korrektur[(k["j"], bsn)] = k
    for jahr, t in sorted(cfg["tabellen"].items()):
        haupt = tabelle(text_aus_pdf(cfg["quellen"][t["haupt"]]["url"], ordner))
        pruef = tabelle(text_aus_pdf(cfg["quellen"][t["pruef"]]["url"], ordner))
        nach_quelle = {t["haupt"]: haupt, t["pruef"]: pruef}
        if len(haupt) < 150:
            sys.exit("%s: zu wenige Zeilen erkannt (%d) – Tabellenformat prüfen" % (jahr, len(haupt)))
        for bsn, (plaetze, erstwunsch) in haupt.items():
            if bsn not in bekannt:
                print("nicht in data/schulen.js:", jahr, bsn)
                continue
            quelle, abweichend = t["haupt"], None
            if pruef.get(bsn) != (plaetze, erstwunsch):
                k = korrektur.get((jahr, bsn))
                if not k:
                    offen.setdefault(bsn, []).append(jahr)
                    print("widersprüchlich:", jahr, bsn, (plaetze, erstwunsch), pruef.get(bsn))
                    continue
                quelle, abweichend = k["quelle"], k["abweichend"]
                plaetze, erstwunsch = nach_quelle[quelle][bsn]
                print("korrigiert:", jahr, bsn, "nach", quelle, (plaetze, erstwunsch))
            if not plaetze:
                continue  # keine Regelplätze in Klasse 7 (z. B. nur ab Klasse 5)
            eintrag = {"q": quelle}
            if abweichend:
                eintrag["a"] = abweichend
            eintrag["p"] = plaetze
            if erstwunsch is not None:
                eintrag["e"] = erstwunsch
            schulen.setdefault(bsn, {})[jahr] = eintrag

    for g in cfg["grenzen"]:
        if g["id"] not in bekannt:
            sys.exit("Grenze für unbekannte Schule: " + g["id"])
        if g["q"] not in cfg["quellen"]:
            sys.exit("unbekannte Quelle: " + g["q"])
        neu = {k: g[k] for k in ("w", "art", "plus", "teil", "q") if k in g}
        schulen.setdefault(g["id"], {}).setdefault(g["j"], {}).setdefault("g", []).append(neu)

    daten = {
        "stand": cfg["geprueft"],
        "quellen": {k: {"t": v["titel"], "k": v["kurz"], "u": v["url"]} for k, v in cfg["quellen"].items()},
        "schulen": {k: schulen[k] for k in sorted(schulen)},
        "offen": {k: offen[k] for k in sorted(offen)},
    }
    kopf = ("// Automatisch erzeugt mit scripts/aufnahme_laden.py – nicht von Hand ändern.\n"
            "// Quellen: Antworten des Senats auf Schriftliche Anfragen im Abgeordnetenhaus Berlin\n"
            "// und Angaben der Bezirksämter (siehe quellen/aufnahme-quellen.json).\n"
            "// p = Plätze (Kapazität Regelschulplätze), e = Anmeldungen im Erstwunsch,\n"
            "// g = Durchschnittsnote/Noten-/Punktsumme, bis zu der im Kriterienkontingent aufgenommen wurde.\n")
    with open(os.path.join(WURZEL, "data", "aufnahme.js"), "w", encoding="utf-8") as f:
        f.write(kopf + "window.AUFNAHME = " + json.dumps(daten, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print("Schulen:", len(schulen), "· widersprüchlich:", len(offen))


if __name__ == "__main__":
    main()
