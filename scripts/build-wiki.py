"""Turns data/src/events.txt and wikilinks.txt into data/events.json and data/wikilinks.json, and checks every Wikipedia title:
the page exists, is not a disambiguation page, and (events) its introduction or opening mentions the year.  python3 scripts/build-wiki.py"""
import json, pathlib, re, sys, time, urllib.parse, urllib.request
R = pathlib.Path(__file__).resolve().parent.parent
rows = lambda f: [l.split('|') for l in (R / f'data/src/{f}').read_text().splitlines() if l and not l.startswith('#')]
E = json.load(open(R / 'data/eras.json')); ev = rows('events.txt'); wl = rows('wikilinks.txt'); bad = []
text = {'home': ' '.join(json.load(open(R / 'data/about.json'))['intro'])} | {f"era-{e['n']}": ' '.join(e['intro']) for e in E} | {f"b-{e['n']}": e['boundaries'] for e in E} | {s['id']: s['narration'] for e in E for s in e['songs']}
for e in E:
    mine = [r for r in ev if int(r[0]) == e['n']]
    if len(mine) != 20: bad.append(f"era {e['n']}: {len(mine)} events")
    for r in mine:
        if not e['start'] <= int(r[1]) <= (e['end'] or 2099): bad.append(f"era {e['n']}: {r[1]} {r[2]} outside the era")
    if [r[1] for r in mine] != sorted(r[1] for r in mine): bad.append(f"era {e['n']} not in order")
for p, phrase, _ in wl:
    if p not in text: bad.append('no piece ' + p)
    elif phrase not in text[p]: bad.append(f'{p}: "{phrase}" not in text')
titles = sorted({r[3] for r in ev} | {r[2] for r in wl}); info = {}
def q(params):
    u = 'https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'format': 'json', 'formatversion': 2, 'redirects': 1, **params})
    for i in range(5):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'link-check/0.1'}), timeout=60))['query']
        except Exception:
            if i == 4: raise
            time.sleep(25 * (i + 1))
# Titles already verified are cached (extract kept for the year check), so a small edit asks Wikipedia for little.
CF = R / 'data/src/wiki-cache.json'; cache = json.load(open(CF)) if CF.exists() else {}
for t in titles:
    if t in cache: info[t] = (cache[t]['to'], {'extract': cache[t]['x']})
todo = [t for t in titles if t not in cache]
for i in range(0, len(todo), 20):
    d = q({'titles': '|'.join(todo[i:i + 20]), 'prop': 'extracts|pageprops', 'exintro': 1, 'explaintext': 1, 'exlimit': 20, 'ppprop': 'disambiguation'}); time.sleep(3)
    go = {n['from']: n['to'] for k in ('normalized', 'redirects') for n in d.get(k, [])}; pages = {p['title']: p for p in d['pages']}
    for t in todo[i:i + 20]:
        x = t
        while x in go: x = go[x]
        info[t] = (x, pages.get(x, {'missing': True}))
for t, (x, p) in info.items():
    if not p.get('missing') and 'disambiguation' not in p.get('pageprops', {}): cache[t] = {'to': x, 'x': p.get('extract', '')[:6000]}
CF.write_text(json.dumps(cache, ensure_ascii=False))
for t, (x, p) in info.items():
    if p.get('missing'): bad.append('missing page: ' + t)
    elif 'disambiguation' in p.get('pageprops', {}): bad.append('disambiguation: ' + t)
    elif x != t: print('redirects:', t, '->', x)
for r in ev:
    x = info[r[3]][1].get('extract', '')
    if r[1] not in x: print('year not in intro:', r[1], '|', r[2], '|', r[3])
final = lambda t: info[t][0]
out = {}; [out.setdefault(r[0], []).append({'year': r[1], 'text': r[2], 'wiki': final(r[3])}) for r in ev]
links = {}; [links.setdefault(p, []).append([ph, final(t)]) for p, ph, t in wl]
(R / 'data/events.json').write_text(json.dumps(out, indent=1, ensure_ascii=False) + '\n'); (R / 'data/wikilinks.json').write_text(json.dumps(links, indent=1, ensure_ascii=False) + '\n')
print(len(ev), 'events,', len(wl), 'links,', len(titles), 'pages'); print('\n'.join(['PROBLEMS:'] + bad) if bad else 'no problems'); sys.exit(bool(bad))
