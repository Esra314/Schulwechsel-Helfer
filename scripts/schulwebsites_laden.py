# Lädt pro Schule die Startseite und bis zu 15 passende Unterseiten (nur Text) herunter.
# Aufruf: python3 -I scripts/schulwebsites_laden.py data/schulen.js roh/web/
# Bereits geladene Schulen werden übersprungen (Abbruch und Neustart möglich).
# Die robots.txt jeder Website wird beachtet (gesperrte Seiten werden nicht geladen,
# Crawl-delay wird eingehalten). Der User-Agent nennt die Seite und das Kontaktformular.
# Gespeichert wird nur der Text; ausgewertet und veröffentlicht werden nur einzelne Fakten
# (Datum, Uhrzeit, Ganztag, Fremdsprachen) mit Quell-URL, keine Texte und keine Bilder.
import sys, os, re, json, html, subprocess, time, threading
import urllib.robotparser
from urllib.parse import urljoin, urlparse

UA = "Schulwechsel-Helfer/1.0 (Schulinfo-Abruf; +https://esra314.github.io/Schulwechsel-Helfer/kontakt.html)"
_robots = {}
_robots_lock = threading.Lock()


def robots(url):
    # Liefert den RobotFileParser für den Host der URL (einmal pro Host geladen).
    p = urlparse(url)
    basis = "https://" + (p.hostname or "")
    with _robots_lock:
        if basis in _robots:
            return _robots[basis]
    rp = urllib.robotparser.RobotFileParser()
    try:
        r = subprocess.run(["curl", "-sL", "--max-time", "20", "-A", UA, "-w", "\n__CODE__%{http_code}",
                            basis + "/robots.txt"], capture_output=True, timeout=30)
        roh = r.stdout.decode("utf-8", "replace")
        body, _, code = roh.rpartition("\n__CODE__")
        if code in ("401", "403") or code.startswith("5") or code == "000":
            rp.disallow_all = True
        elif code == "200" and "<html" not in body[:500].lower():
            rp.parse(body.splitlines())
        else:
            rp.allow_all = True
    except Exception:
        rp.disallow_all = True  # im Zweifel nicht laden
    with _robots_lock:
        _robots[basis] = rp
    return rp


def erlaubt(url):
    return robots(url).can_fetch(UA, url)


def pause(url):
    v = robots(url).crawl_delay(UA)
    time.sleep(max(0.5, float(v or 0)))
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
    if not erlaubt(url):
        return None
    try:
        r = subprocess.run(["curl", "-sL", "--max-time", "25", "--max-filesize", "3000000", "-A",
                            UA,
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
        if m.group(1) != url and not erlaubt(m.group(1)):
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
            pause(u)
        for u in zweite_runde:
            if len(seiten) >= 16 or u in gesehen:
                continue
            gesehen.add(u)
            r = holen(u)
            if r:
                seiten.append({"url": r[0], "text": text(r[1])})
            pause(u)
    json.dump({"id": s["id"], "start": start, "abruf": time.strftime("%Y-%m-%d"), "seiten": seiten},
              open(ziel, "w"), ensure_ascii=False)
    print(s["id"], len(seiten), flush=True)


with ThreadPoolExecutor(5) as pool:
    list(pool.map(schule, [s for s in schulen if s.get("w")]))
print("fertig", flush=True)
