# Lädt Tage der offenen Tür und Infoabende aus dem Kalender der Senatsverwaltung (berlin.de).
# Aufruf: python3 scripts/kalender_laden.py roh/termine.json
import re, html, json, subprocess, sys, time, datetime

BASIS = "https://www.berlin.de/land/kalender/"
out = sys.argv[1]
HEUTE = datetime.date.today().strftime("%d.%m.%Y")
termine = []
seen = set()
for ls in range(0, 200, 10):
    url = f"{BASIS}index.php?ls={ls}&c=79&kategorie%5B47%5D=109&date_start={HEUTE}"
    for versuch in range(5):
        r = subprocess.run(["curl", "-s", "-L", "-A", "Schulwechsel-Helfer/1.0 (Schulinfo-Abruf; +https://esra314.github.io/Schulwechsel-Helfer/kontakt.html)", "-w", "\n%{http_code}", url], capture_output=True, text=True)
        body, code = r.stdout.rsplit("\n", 1)
        if code == "200":
            break
        time.sleep(20)
    else:
        print("fehler", ls, code); break
    links = re.findall(r'href="(index\.php\?detail=(\d+)[^"]*)"', body)
    neu = 0
    t = re.sub(r"<script.*?</script>|<style.*?</style>", "", body, flags=re.S)
    # split by detail link blocks
    bloecke = re.split(r'(?=<[^>]+href="index\.php\?detail=)', t)
    text = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", t)))
    i = text.find("Suchergebnis")
    j = text.find("Seite 1", i)
    teil = text[i:j]
    eintraege = re.split(r"\s*Zur Veranstaltung\s*", teil)
    ids = []
    for _, d in links:
        if d not in ids:
            ids.append(d)
    eintraege = [e for e in eintraege if "Termin:" in e]
    for k, e in enumerate(eintraege):
        e = re.sub(r"^Suchergebnis \([^)]*\)\s*", "", e)
        titel = e.split(" Tag der offenen Tür")[0] if e.find(" Tag der offenen Tür", 5) > 0 else e[:120]
        m = re.search(r"Termin: (\d\d\.\d\d\.\d{4})(?: (\d\d:\d\d)(?: - (\d\d:\d\d))?)?", e)
        ort = re.search(r"Veranstaltungsort: (.*)$", e)
        bsn = re.findall(r"\b(\d\d[A-Z]\d\d)\b", e)
        d = ids[k] if k < len(ids) else None
        key = (d, m.group(1) if m else None, e[:60])
        if key in seen: continue
        seen.add(key); neu += 1
        termine.append({"text": e.strip(), "titel": titel.strip(), "datum": m and m.group(1), "von": m and m.group(2), "bis": m and m.group(3),
                        "ort": ort and ort.group(1).strip(), "bsn": bsn, "detail": d and f"{BASIS}index.php?detail={d}&c=79"})
    print(ls, len(eintraege), len(ids), neu, flush=True)
    if not eintraege: break
    time.sleep(6)
json.dump(termine, open(out, "w"), ensure_ascii=False, indent=1)
print("fertig", len(termine))
