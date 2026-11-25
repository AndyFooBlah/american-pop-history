// Finds Spotify tracks for songs that have none, using the owner's app. Fixed rules only; no model sees Spotify's metadata
// (Developer Policy III.14). Prints song ids and statuses. Titles, artists, albums and dates go to the gitignored review page.
//   node scripts/resolve-tracks.mjs           resolve missing songs
import fs from 'node:fs'; import { client } from './spotify.mjs';
const ROOT = new URL('..', import.meta.url).pathname;
const load = (p) => JSON.parse(fs.readFileSync(ROOT + p, 'utf8'));

export const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/['’‘`.]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
/** Title without edition suffixes: "X - Remastered 2009", "X (feat. Y)", "X - Mono Version". */
export const core = (t) => norm(t.replace(/\s+-\s+.*\b(remaster|remastered|mono|stereo|single|album|original|soundtrack|from|version)\b.*$/i, '').replace(/[([][^)\]]*\b(feat|featuring|with|remaster|remastered|mono|stereo|single|album|original|from|soundtrack)\b[^)\]]*[)\]]/gi, ''));
const BAD = /\b(live|karaoke|tribute|instrumental|cover|made famous|originally performed|re-?recorded|rerecorded|acoustic|demo|unplugged|session|sessions|take \d|rehearsal|remix|mix|sped up|slowed|acapella|a cappella|medley|workout|lullaby|edit|clean)\b/i;
const names = (a) => a.split(/\s+(?:feat\.|&|and|\/)\s+|,\s*/).map(norm).filter(Boolean);

export function judge(song, t) {
  const wantsRemix = /remix/i.test(song.title) || song.id === 'old-town-road';
  const label = `${t.name} ${t.album?.name ?? ''}`;
  if (core(t.name) !== core(song.title) && norm(t.name) !== norm(song.title)) return null;
  const titleBad = BAD.test(t.name.replace(wantsRemix ? /remix/i : /$^/, ''));
  if (titleBad || /\b(live|karaoke|tribute|unplugged|re-?recorded)\b/i.test(label)) return null;
  const lead = names(song.artist)[0]; const got = t.artists.map((a) => norm(a.name));
  const plain = (x) => x.replace(/^the /, '').replace(/ and (his|her|the) .*$/, '');
  if (!got.some((g) => plain(g) === plain(lead) || (plain(g).includes(' ') && plain(lead).startsWith(plain(g) + ' ')))) return null; // "Soulja Boy" for "Soulja Boy Tell 'Em"; never "X Revival Band" for "X"
  const guest = song.artist.match(/feat\. (.+)$/)?.[1];
  if (guest && !t.artists.some((a) => norm(a.name).includes(norm(guest).split(' ').pop())) && !norm(t.name).includes(norm(guest).split(' ').pop())) return null;
  const want = Number(song.dateAsWritten.match(/\d{4}/)[0]); const year = Number((t.album?.release_date ?? '0').slice(0, 4));
  const type = t.album?.album_type ?? 'compilation';
  const gap = Math.abs(year - want);
  return { gap, type, score: Math.min(gap, 30) + (type === 'compilation' ? 8 : 0) + (/remaster/i.test(t.name) ? 1 : 0) };
}
export const pick = (song, items) => items.map((t) => ({ t, j: judge(song, t) })).filter((x) => x.j).sort((a, b) => a.j.score - b.j.score);

async function main() {
  const eras = load('data/eras.json'), tracks = load('data/tracks.json'), api = await client();
  const picks = fs.existsSync(ROOT + 'data/resolved.json') ? load('data/resolved.json') : {};
  const review = []; const songs = eras.flatMap((e) => e.songs);
  for (const s of songs) {
    if (tracks[s.id].uri && tracks[s.id].source !== 'web-api') continue;
    const found = new Map(); const lead = s.artist.split(/\s+(?:feat\.|&)\s+/)[0]; const title = s.title.replace(/\s*\(Remix\)/, '');
    for (const q of [`track:"${title}" artist:"${lead}"`, `${s.title} ${s.artist.replace('feat. ', '')}`]) for (const offset of [0, 10])
      for (const t of (await api('GET', '/search?' + new URLSearchParams({ q, type: 'track', limit: 10, offset, market: 'US' }))).tracks.items) if (t) found.set(t.id, t);
    const ranked = pick(s, [...found.values()]); const best = ranked[0];
    // A release date near the song's year, on an album or single, is strong evidence of the original. Reissues need an ear.
    const status = !best ? 'missing' : best.j.gap <= 2 && best.j.type !== 'compilation' ? 'exact' : 'check';
    if (best) picks[s.id] = { status, uri: best.t.uri }; else delete picks[s.id];
    review.push({ s, status, ranked: ranked.slice(0, 4) });
    console.log(status.padEnd(8), s.id);
  }
  fs.writeFileSync(ROOT + 'data/resolved.json', JSON.stringify(picks, null, 1) + '\n');
  const esc = (x) => String(x).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  fs.writeFileSync(ROOT + '.spotify-review.html', `<meta charset=utf-8><title>Track review</title><body style="font:16px system-ui;max-width:60em;margin:2em auto">` + review.map((r) => `<h3>${esc(r.s.title)}, ${esc(r.s.artist)} (${esc(r.s.dateAsWritten)}): ${r.status}</h3>` + r.ranked.map((x) => `<div><a href="${esc(x.t.external_urls.spotify)}">${esc(x.t.name)}</a> by ${esc(x.t.artists.map((a) => a.name).join(', '))}, ${esc(x.t.album.name)} (${esc(x.t.album.release_date)})</div>`).join('')).join(''));
}
if (import.meta.url === `file://${process.argv[1]}`) await main();
