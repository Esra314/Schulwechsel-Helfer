# Lädt pro Schule die Startseite und bis zu 15 passende Unterseiten (nur Text) herunter.
# Aufruf: python3 -I scripts/schulwebsites_laden.py data/schulen.js roh/web/
# Bereits geladene Schulen werden übersprungen (Abbruch und Neustart möglich).
import sys, os, re, json, html, subprocess, time
from urllib.parse import urljoin, urlparse
from concurrent.futures import ThreadPoolExecutor

quelle = open(sys.argv[1], encoding="utf-8").read()
if sys.argv[1].endswith(".js"):
    quelle = quelle[quelle.index("{"):quelle.rindex("}") + 1]
    schulen = json.loads(quelle)["schulen"]
else:
    schulen = json.loads(quelle)
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)

SCHLUESSEL = [
    (r"offene[nr]?[-_ ]?t(ü|ue|u)r|tag[-_ ]der[-_ ]offenen|tdot|infoabend|informationsabend|info-abend|infotag|schnupper|kennenlern", 10),
    (r"anmeld|aufnahme|klasse[-_ ]?7|7[-_. ]?klasse|jahrgang[-_ ]?7|übergang|uebergang|neue[-_ ]?siebte|zukünftig|zukuenftig|interessierte|bewerbung", 7),
    (r"termin|veranstaltung|kalender|aktuell|news|neuigkeit", 5),
    (r"ganztag|mensa|mittag|essen|verpflegung|caterer", 6),
    (r"sprache|fremdsprach|latein|franz|spanisch|bilingual", 6),
    (r"profil|schwerpunkt|unsere[-_ ]schule|über[-_ ]uns|ueber[-_ ]uns|schulprogramm|konzept|unterricht|angebot", 4),
]
NICHT = re.compile(r"\.(pdf|jpe?g|png|gif|zip|docx?|xlsx?|pptx?|mp4|mp3|ics)(\?|$)|mailto:|tel:|javascript:|impressum|datenschutz|login|wp-admin|#", re.I)


def holen(url, tiefe=0):
    if url.startswith("http://"):
        url = "https://" + url[7:]
    try:
        r = subprocess.run(["curl", "-sL", "--max-time", "25", "--max-filesize", "3000000", "-A",
                            "Mozilla/5.0 (compatible; Schulwechsel-Helfer; Schulinfo)",
                            "-w", "\n__URL__%{url_effective}__CODE__%{http_code}__TYPE__%{content_type}", url],
                           capture_output=True, timeout=40)
        roh = r.stdout.decode("utf-8", "replace")
        m = re.search(r"\n__URL__(.*)__CODE__(\d+)__TYPE__(.*)$", roh)
        if not m:
            return None
        body = roh[:m.start()]
        if m.group(2) != "200" and m.group(1).startswith("http://") and tiefe < 3:
            return holen(m.group(1), tiefe + 1)
        if m.group(2) != "200" or "html" not in m.group(3):
            return None
        return m.group(1), body
    except Exception:
        return None


def text(body):
    t = re.sub(r"(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>", " ", body)
    t = re.sub(r"(?i)<br\s*/?>|</(p|div|li|h[1-6]|tr|td|section|article)>", "\n", t)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html.unescape(t)
    t = re.sub(r"[ \t\r\f\v ]+", " ", t)
    t = re.sub(r"\n\s*\n+", "\n", t)
    return t.strip()


def links(basis, body):
    host = urlparse(basis).hostname or ""
    kern = host[4:] if host.startswith("www.") else host
    gefunden = {}
    for m in re.finditer(r'(?is)<a\b[^>]*href\s*=\s*["\']([^"\']+)["\'][^>]*>(.*?)</a>', body):
        href, label = m.group(1).strip(), re.sub(r"<[^>]+>", " ", m.group(2))
        if NICHT.search(href):
            continue
        url = urljoin(basis, href).split("#")[0]
        if url.startswith("http://"):
            url = "https://" + url[7:]
        h = urlparse(url).hostname or ""
        if not (h == host or h.endswith(kern)):
            continue
        ziel = (url + " " + html.unescape(label)).lower()
        punkte = sum(p for muster, p in SCHLUESSEL if re.search(muster, ziel))
        if punkte:
            gefunden[url] = max(gefunden.get(url, 0), punkte)
    return sorted(gefunden, key=lambda u: -gefunden[u])


def schule(s):
    ziel = os.path.join(OUT, s["id"] + ".json")
    if os.path.exists(ziel):
        return
    start = s["w"] if re.match(r"https?://", s["w"]) else "https://" + s["w"]
    seiten = []
    erst = holen(start)
    if not erst and start.startswith("https://"):
        erst = holen("http://" + start[8:])
    if erst:
        url, body = erst
        seiten.append({"url": url, "text": text(body)})
        kandidaten = links(url, body)[:14]
        gesehen = {url}
        zweite_runde = []
        for u in kandidaten:
            if len(seiten) >= 13 or u in gesehen:
                continue
            gesehen.add(u)
            r = holen(u)
            if r:
                seiten.append({"url": r[0], "text": text(r[1])})
                zweite_runde += links(r[0], r[1])[:4]
            time.sleep(0.3)
        for u in zweite_runde:
            if len(seiten) >= 16 or u in gesehen:
                continue
            gesehen.add(u)
            r = holen(u)
            if r:
                seiten.append({"url": r[0], "text": text(r[1])})
    json.dump({"id": s["id"], "start": start, "abruf": time.strftime("%Y-%m-%d"), "seiten": seiten},
              open(ziel, "w"), ensure_ascii=False)
    print(s["id"], len(seiten), flush=True)


with ThreadPoolExecutor(10) as pool:
    list(pool.map(schule, [s for s in schulen if s.get("w")]))
print("fertig", flush=True)
