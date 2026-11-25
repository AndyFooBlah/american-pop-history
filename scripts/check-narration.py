"""Transcribes every recording with Gemini (Vertex) and compares it with the text. Prints differences.  python3 scripts/check-narration.py [id ...]"""
import base64, concurrent.futures as cf, difflib, json, os, pathlib, re, subprocess, sys, time, urllib.request, urllib.error
ROOT = pathlib.Path(__file__).resolve().parent.parent; P = os.environ['GCP_PROJECT']  # any project with Vertex AI and billing
TOK = subprocess.check_output(['gcloud', 'auth', 'print-access-token'], text=True).strip()
E = json.load(open(ROOT / 'data/eras.json')); T = {'home': ' '.join(json.load(open(ROOT / 'data/about.json'))['intro'])} | {f"era-{e['n']}": ' '.join(e['intro']) for e in E} | {s['id']: s['narration'] for e in E for s in e['songs']}
words = lambda x: re.sub(r"[^a-z0-9 ]", '', re.sub(r'[-\u2013\u2014/]', ' ', x.lower().replace('&', ' and '))).split()
def one(id):
    b = {'contents': [{'role': 'user', 'parts': [{'inlineData': {'mimeType': 'audio/mpeg', 'data': base64.b64encode((ROOT / f'narration/{id}.mp3').read_bytes()).decode()}}, {'text': 'Transcribe every spoken word verbatim, including stumbles or repeats. Write numbers as digits. Output only the transcript.'}]}], 'generationConfig': {'temperature': 0}}
    for i in range(5):
        try:
            r = json.load(urllib.request.urlopen(urllib.request.Request(f'https://aiplatform.googleapis.com/v1/projects/{P}/locations/global/publishers/google/models/gemini-3.8-flash:generateContent', json.dumps(b).encode(), {'Authorization': 'Bearer ' + TOK, 'x-goog-user-project': P, 'Content-Type': 'application/json'}), timeout=120)); break
        except urllib.error.HTTPError as e:
            if i == 4: return id, ['HTTP %d' % e.code]
            time.sleep(6 * (i + 1))
    a, c = words(T[id]), words(''.join(p.get('text', '') for p in r['candidates'][0]['content']['parts']))
    return id, [(' '.join(a[i:j]), ' '.join(c[k:l])) for o, i, j, k, l in difflib.SequenceMatcher(None, a, c).get_opcodes() if o != 'equal' and ''.join(a[i:j]) != ''.join(c[k:l])]
ids = sys.argv[1:] or [p.stem for p in sorted((ROOT / 'narration').glob('*.mp3'))]
with cf.ThreadPoolExecutor(4) as ex:
    res = list(ex.map(one, ids))
for id, d in res:
    if d: print(id, d)
print(sum(not d for _, d in res), 'of', len(res), 'match word for word')
