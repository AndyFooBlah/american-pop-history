// Catches tracks whose label is right but whose audio is another song or another take: compares each Spotify track's length
// with the lengths MusicBrainz lists for that song and artist, and asks MusicBrainz what recording its ISRC is.
// Prints song ids and verdicts only (no Spotify metadata).   node scripts/check-durations.mjs
import fs from 'node:fs'; import { client } from './spotify.mjs'; import { norm, core } from './resolve-tracks.mjs';
const ROOT = new URL('..', import.meta.url).pathname; const load = (p) => JSON.parse(fs.readFileSync(ROOT + p, 'utf8'));
const MB = 'https://musicbrainz.org/ws/2/recording?fmt=json&limit=100&query='; let last = 0;
async function mb(q) {
  for (let i = 0; i < 4; i++) {
    const wait = last + 1200 - Date.now(); if (wait > 0) await new Promise((f) => setTimeout(f, wait)); last = Date.now();
    const r = await fetch(MB + encodeURIComponent(q), { headers: { 'user-agent': 'pop-history-check/0.1' } });
    if (r.ok) return (await r.json()).recordings; await new Promise((f) => setTimeout(f, 3000 * (i + 1)));
  } throw new Error('musicbrainz unavailable');
}
// The same words, whatever the order or brackets: every word of the shorter title is in the longer one.
export const same = (a, b) => { const A = core(a).split(' '), B = core(b).split(' '); const [s, l] = A.length < B.length ? [A, B] : [B, A]; return s.every((w) => l.includes(w)) || norm(a).replace(/ /g, '') === norm(b).replace(/ /g, ''); };
const near = (recs, ms, tol) => recs.some((r) => r.length && Math.abs(r.length - ms) <= tol);
/** The ISRC names one recording, so its length is strong evidence. Title-and-artist lengths include covers and live takes: weak. */
export function judgeAudio(title, ms, byIsrc, byTitle) {
  const mine = byIsrc.filter((r) => same(r.title, title));
  if (byIsrc.length && !mine.length) return 'ISRC-IS-ANOTHER-SONG';
  if (mine.some((r) => r.length)) return near(mine, ms, 8000) ? 'isrc-ok' : 'ISRC-LENGTH-DIFFERS';
  return near(byTitle, ms, 4000) ? 'weak-ok' : byTitle.length ? 'LENGTH-DIFFERS' : 'no-reference';
}
if (import.meta.url === `file://${process.argv[1]}`) {
const CONTROL = process.argv.includes('--control'); // the mislabelled Route 66 the owner heard; must be flagged
const api = await client(), tracks = load('data/tracks.json'); const count = {};
for (const e of load('data/eras.json')) for (const s of e.songs) {
  const uri = CONTROL ? 'spotify:track:2a7wPG1cvZvDfDYa6jMrLi' : tracks[s.id]?.uri; if (!uri || (CONTROL && s.id !== 'get-your-kicks-on-route-66')) continue;
  const t = await api('GET', '/tracks/' + uri.split(':')[2]); const lead = s.artist.split(/\s+(?:feat\.|&|with)\s+/i)[0].replace(/^the /i, '');
  const title = s.title.replace(/[()"]/g, ' ').replace(/Remix/, '').trim();
  const recs = (await mb(`recording:(${title.replace(/[^\p{L}\p{N} ']/gu, ' ')}) AND artist:(${lead.replace(/[^\p{L}\p{N} ']/gu, ' ')})`)).filter((r) => r.length && same(r.title, s.title));
  const isrc = t.external_ids?.isrc; const byIsrc = isrc ? await mb('isrc:' + isrc) : [];
  const verdict = judgeAudio(s.title, t.duration_ms, byIsrc, recs);
  count[verdict] = (count[verdict] ?? 0) + 1;
  if (verdict !== 'isrc-ok') console.log(verdict.padEnd(22), s.id.padEnd(40), tracks[s.id].status);
}
console.log(count);
}
