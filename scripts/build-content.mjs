// Writes what the site serves: public/content.json (text, Spotify URIs, playlist ids, timings; no match notes) and public/narration/.
// Runs before `npm run dev` and `npm run build`. Without narration/ (it is not in the public repository) the browser's own voice reads.
import fs from 'node:fs'; import crypto from 'node:crypto'; import { hash, pieces } from './render-narration.mjs';
const ROOT = new URL('..', import.meta.url).pathname; const j = (p) => JSON.parse(fs.readFileSync(ROOT + 'data/' + p));
export function content() {
  const tracks = Object.fromEntries(Object.entries(j('tracks.json')).filter(([, t]) => t.uri).map(([id, t]) => [id, t.uri]));
  const eras = j('eras.json').map((e) => ({ ...e, songs: e.songs.map(({ id, title, artist, dateAsWritten, significance, narration }) => ({ id, title, artist, dateAsWritten, significance, narration })) }));
  // Only recordings of the current text: an edited piece falls back to the browser's speech until it is re-recorded.
  const man = j('narration.json'); const timings = {}, clips = {};
  for (const p of pieces(eras)) { const f = `${ROOT}narration/${p.id}.mp3`;
    if (man[p.id]?.hash === hash(p.text) && fs.existsSync(f)) { timings[p.id] = man[p.id].starts; clips[p.id] = `${p.id}.${crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 10)}.mp3`; } }
  // Public-domain recordings (data/pd.json, files in audio/pd/), served under content-hashed names like the narration.
  const pd = {};
  for (const [id, r] of Object.entries(j('pd.json'))) { const f = `${ROOT}audio/pd/${id}.mp3`;
    if (fs.existsSync(f)) pd[id] = { clip: `${id}.${crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 10)}.mp3`, source: r.source, url: r.url }; }
  return { eras, tracks, pd, playlists: j('playlists.json'), timings, clips, links: j('links.json'), videos: j('videos.json'), shorts: j('shorts.json'), events: j('events.json'), wiki: j('wikilinks.json'), about: j('about.json'), explicit: j('explicit.json') };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const c = content(); fs.rmSync(ROOT + 'public', { recursive: true, force: true }); fs.mkdirSync(ROOT + 'public/narration', { recursive: true });
  fs.writeFileSync(ROOT + 'public/content.json', JSON.stringify(c)); fs.writeFileSync(ROOT + 'public/robots.txt', 'User-agent: *\nDisallow: /\n');
  for (const [id, f] of Object.entries(c.clips)) fs.copyFileSync(`${ROOT}narration/${id}.mp3`, `${ROOT}public/narration/${f}`);
  fs.mkdirSync(ROOT + 'public/pd'); for (const [id, r] of Object.entries(c.pd)) fs.copyFileSync(`${ROOT}audio/pd/${id}.mp3`, `${ROOT}public/pd/${r.clip}`);
  console.log(`content.json and ${Object.keys(c.clips).length} recordings`);
}
