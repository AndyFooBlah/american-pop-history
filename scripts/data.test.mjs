import test from 'node:test'; import assert from 'node:assert'; import fs from 'node:fs'; import { plan } from './sync-playlists.mjs';
const j = (p) => JSON.parse(fs.readFileSync(new URL('../data/' + p, import.meta.url)));
const eras = j('eras.json'), tracks = j('tracks.json'); const songs = eras.flatMap((e) => e.songs);
test('12 eras in order, unique ids', () => { assert.deepEqual(eras.map((e) => e.n), [...Array(12)].map((_, i) => i + 1)); assert.equal(new Set(songs.map((s) => s.id)).size, songs.length); });
test('era dates run forward', () => eras.forEach((e, i) => { assert.ok(e.end === null || e.end > e.start, e.title); if (i) assert.ok(e.start >= eras[i - 1].start && e.start >= eras[i - 1].end - 1, e.title); }));
test('every song has text and a year', () => songs.forEach((s) => { assert.ok(s.narration && s.significance && s.artist, s.id); assert.match(s.dateAsWritten, /\d{4}/); }));
test('every song has a track record with a valid, unique URI', () => { const u = songs.map((s) => tracks[s.id]?.uri).filter(Boolean); songs.forEach((s) => assert.ok(tracks[s.id], s.id)); u.forEach((x) => assert.match(x, /^spotify:track:[A-Za-z0-9]{22}$/)); assert.equal(new Set(u).size, u.length); });
test('playlist names sort chronologically', () => { const n = plan(eras, tracks).map((p) => p.name); assert.deepEqual([...n].sort(), n); });

import { judgeAudio } from './check-durations.mjs';
test('a right label with wrong audio is flagged', () => {
  const rec = (title, length) => ({ title, length });
  // Route 66, 2026-11-24: ISRC recordings ran about 50 s longer than the track, though some cover happened to match its length.
  assert.equal(judgeAudio('(Get Your Kicks on) Route 66', 127000, [rec('Route 66', 174000)], [rec('Route 66', 127500)]), 'ISRC-LENGTH-DIFFERS');
  assert.equal(judgeAudio('(Get Your Kicks on) Route 66', 181000, [rec('(Get Your Kicks On) Route 66', 183000)], []), 'isrc-ok');
  assert.equal(judgeAudio('Maybellene', 140000, [rec('Johnny B. Goode', 140000)], []), 'ISRC-IS-ANOTHER-SONG');
});

import { albumOwner } from './check-albums.mjs';
test('an album by someone else is noticed', () => {
  assert.equal(albumOwner(['Jackie Brenston & His Delta Cats'], ['Elvis Presley'], 'Jackie Brenston and his Delta Cats'), 'other');
  assert.equal(albumOwner(['Jackie Brenston & His Delta Cats'], ['Jackie Brenston'], 'Jackie Brenston and his Delta Cats'), 'own');
  assert.equal(albumOwner(['Marc Shaiman'], ['Marc Shaiman'], 'Big Mama Thornton'), 'other');
  assert.equal(albumOwner(['Chuck Berry'], ['Various Artists'], 'Chuck Berry'), 'various');
});

import { hash, pieces } from './render-narration.mjs'; import { sentences } from '../src/sentences.ts'; import fsN from 'node:fs';
test('every recording is under 1 MB and has one start time per sentence', () => {
  const man = JSON.parse(fsN.readFileSync('data/narration.json'));
  for (const p of pieces(eras)) { const m = man[p.id]; if (!m || m.hash !== hash(p.text) || !fsN.existsSync(`narration/${p.id}.mp3`)) continue;
    assert.equal(m.starts.length, sentences(p.text).length, p.id); m.starts.forEach((v, i) => assert.ok(!i || v > m.starts[i - 1], p.id)); assert.ok(m.starts.at(-1) < m.seconds, p.id);
    assert.ok(fsN.statSync(`narration/${p.id}.mp3`).size < 1_000_000, p.id); }
});

test('links elsewhere are https and only for songs without a Spotify track', () => {
  for (const [id, l] of Object.entries(JSON.parse(fsN.readFileSync('data/links.json')))) { assert.ok(songs.some((s) => s.id === id), id); assert.match(l.url, /^https:\/\//); assert.ok(l.label); assert.equal(tracks[id].uri, null); }
});

test('each era has 20 events in order, inside its years; each linked phrase is in one sentence of its text', () => {
  const ev = JSON.parse(fsN.readFileSync('data/events.json')), wl = JSON.parse(fsN.readFileSync('data/wikilinks.json'));
  for (const e of eras) { const x = ev[e.n]; assert.equal(x.length, 20, `era ${e.n}`); x.forEach((v, i) => { assert.ok(+v.year >= e.start && +v.year <= (e.end ?? 2099), v.text); if (i) assert.ok(v.year >= x[i - 1].year); assert.ok(v.wiki); }); }
  const text = Object.fromEntries([...pieces(eras).map((p) => [p.id, p.text]), ...eras.map((e) => [`b-${e.n}`, e.boundaries])]);
  for (const [id, l] of Object.entries(wl)) for (const [p] of l) assert.ok((id.startsWith('b-') ? [text[id]] : sentences(text[id])).some((s) => s.includes(p)), `${id}: ${p}`);
});

test('every video and short video belongs to a song and has well-formed links', () => {
  const ids = new Set(songs.map((s) => s.id));
  for (const [id, v] of Object.entries(j('videos.json'))) { assert.ok(ids.has(id), id); assert.match(v.yt, /^[\w-]{11}$/, id); assert.ok(v.what && v.channel, id); }
  for (const [id, v] of Object.entries(j('shorts.json'))) { assert.ok(ids.has(id), id); assert.ok(v.what && /^https:\/\//.test(v.article.url) && v.article.source, id); if (v.video) assert.match(v.video.url, /^https:\/\/www\.tiktok\.com\/@[\w.]+\/video\/\d+$/, id); }
});
