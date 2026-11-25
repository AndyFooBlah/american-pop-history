// The player shows the album's cover, so a right recording on someone else's album shows the wrong face. For each song: is the album
// by the song's artist? If not, looks for the same recording (same ISRC, or same title, artist and length) on one that is.
// Fixed rules; prints song ids, verdicts and URIs only.   node scripts/check-albums.mjs
import fs from 'node:fs'; import { client } from './spotify.mjs'; import { norm, core } from './resolve-tracks.mjs';
const ROOT = new URL('..', import.meta.url).pathname; const load = (p) => JSON.parse(fs.readFileSync(ROOT + p, 'utf8'));
const key = (x) => norm(x).replace(/^the /, '').replace(/ (and|with) (his|her|the|their) .*$/, '');
/** 'own' = album by one of the artists; 'various' = Various Artists (a compilation or soundtrack); 'other' = somebody else's album. */
export function albumOwner(trackArtists, albumArtists, credit) {
  // Only the song's own credit counts: a soundtrack can list its composer as the artist of every track (Hound Dog, A Few Good Men).
  const mine = [key(credit), ...credit.split(/\s+(?:feat\.|&|and|with)\s+|,\s*/i).map(key)].filter((x) => x.length > 2); const a = albumArtists.map(key);
  const hit = (x) => mine.some((m) => x === m || (x.length > 4 && m.includes(x)) || (m.length > 4 && x.includes(m)));
  if (a.some(hit)) return trackArtists.map(key).some(hit) ? 'own' : 'other';
  return a.some((x) => /^various/.test(x)) ? 'various' : 'other';
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const api = await client(), tracks = load('data/tracks.json'); const count = {};
  for (const e of load('data/eras.json')) for (const s of e.songs) {
    const uri = tracks[s.id]?.uri; if (!uri) continue;
    const t = await api('GET', '/tracks/' + uri.split(':')[2]); const owner = albumOwner(t.artists.map((a) => a.name), t.album.artists.map((a) => a.name), s.artist);
    count[owner] = (count[owner] ?? 0) + 1; if (owner === 'own') continue;
    const found = new Map(); const isrc = t.external_ids?.isrc; const lead = s.artist.split(/\s+(?:feat\.|&|and)\s+/i)[0];
    for (const q of [isrc && `isrc:${isrc}`, `track:"${t.name.replace(/"/g, '')}" artist:"${lead}"`, `${s.title} ${lead}`].filter(Boolean)) for (const offset of [0, 10, 20])
      for (const x of (await api('GET', '/search?' + new URLSearchParams({ q, type: 'track', limit: 10, offset, market: 'US' }))).tracks.items) if (x) found.set(x.id, x);
    const alt = [...found.values()].filter((x) => x.uri !== uri && albumOwner(x.artists.map((a) => a.name), x.album.artists.map((a) => a.name), s.artist) === 'own'
      && x.artists.some((a) => key(a.name) === key(lead)) && core(x.name) === core(s.title) && !/\b(live|karaoke|remix|re-?recorded|take)\b/i.test(x.name)
      && (x.external_ids?.isrc === isrc || Math.abs(x.duration_ms - t.duration_ms) <= 3000))
      .map((x) => ({ uri: x.uri, sameIsrc: x.external_ids?.isrc === isrc, gap: Math.round((x.duration_ms - t.duration_ms) / 100) / 10, comp: x.album.album_type === 'compilation', year: x.album.release_date }))
      .sort((a, b) => b.sameIsrc - a.sameIsrc || a.comp - b.comp || a.year.localeCompare(b.year));
    console.log(owner.padEnd(8), s.id.padEnd(34), alt.length ? `${alt.length} alternatives, best ${alt[0].uri.split(':')[2]} sameIsrc=${alt[0].sameIsrc} gap=${alt[0].gap}s` : 'no alternative');
  }
  console.log(count);
}
