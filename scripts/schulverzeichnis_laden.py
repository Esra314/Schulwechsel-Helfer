# Lädt die Schulporträts (Gymnasien, ISS, Gemeinschaftsschulen) aus dem Berliner Schulverzeichnis.
# Aufruf: python3 scripts/schulverzeichnis_laden.py roh/   -> roh/portraets.json
import sys, re, html, json, time, subprocess, os
out_dir = sys.argv[1]
BASE = "https://www.bildung.berlin.de/Schulverzeichnis/"
ARTEN = {"Gymnasien", "Integrierte Sekundarschule", "Gemeinschaftsschule"}

def get(url):
    for versuch in range(3):
        r = subprocess.run(["curl", "-sS", "-A", "Schulwechsel-Helfer/1.0 (Schulinfo-Abruf; +https://esra314.github.io/Schulwechsel-Helfer/kontakt.html)", "--max-time", "40", url], capture_output=True)
        if r.returncode == 0 and len(r.stdout) > 1000:
            return r.stdout.decode("utf-8", "replace")
        time.sleep(3)
    return ""

def feld(s, name):
    m = re.search(r'id="ContentPlaceHolderMenuListe_%s"[^>]*>([^<]*)<' % name, s)
    return re.sub(r"\s+", " ", html.unescape(m.group(1))).strip() if m else ""

ids = {}
for bez in range(1, 13):
    s = get(BASE + "SchulListe.aspx?BezNr=%02d" % bez)
    for m in re.finditer(r'IDSchulzweig=(\d+)"><b>([^<]+)</b></a><br />\s*<span[^>]*>([^<]+)</span>', s):
        if m.group(3).strip() in ARTEN:
            ids[m.group(1)] = html.unescape(m.group(2))
    time.sleep(1)
print("Porträts:", len(ids), flush=True)

ergebnis = {}
for n, (zid, name) in enumerate(sorted(ids.items())):
    s = get(BASE + "Schulportrait.aspx?IDSchulzweig=" + zid)
    kopf = feld(s, "lblSchulname")
    m = re.search(r"-\s*(\d{2}[A-Z]\d{2})\s*$", kopf)
    if not m:
        print("ohne BSN", zid, kopf, flush=True)
        continue
    tag = re.search(r'id="ContentPlaceHolderMenuListe_HLinkTag"[^>]*href="([^"]+)"', s)
    ergebnis[m.group(1)] = {
        "zweig": zid,
        "sprachen": feld(s, "lblSprachen"),
        "angebote": feld(s, "lblAngebote"),
        "bemerkungen": feld(s, "lblBemerkungenSchulzweig"),
        "ags": feld(s, "lblAGs"),
        "mittag": feld(s, "lblMittag"),
        "oberstufe": bool(re.search(r'id="ContentPlaceHolderMenuListe_lblGymnasialeOberstufe"', s)),
        "tag_link": html.unescape(tag.group(1)) if tag else ""
    }
    if n % 25 == 0:
        print(n, flush=True)
    time.sleep(0.8)

with open(os.path.join(out_dir, "portraets.json"), "w") as f:
    json.dump(ergebnis, f, ensure_ascii=False, indent=1)
print("fertig", len(ergebnis))
