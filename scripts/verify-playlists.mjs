// Reads the live playlists back and compares them with the plan. Prints names and counts only.
import fs from 'node:fs'; import { client } from './spotify.mjs'; import { plan } from './sync-playlists.mjs';
const j = (p) => JSON.parse(fs.readFileSync(new URL('../data/' + p, import.meta.url)));
const api = await client(), ids = j('playlists.json'); let bad = 0;
for (const p of plan(j('eras.json'), j('tracks.json'))) {
  if (!ids[p.n]) { console.log(p.n, 'not created'); bad++; continue; }
  const pl = await api('GET', `/playlists/${ids[p.n]}`); const it = await api('GET', `/playlists/${ids[p.n]}/items?limit=50`);
  const got = it.items.map((x) => (x.item ?? x.track)?.uri);
  const ok = pl.name === p.name && JSON.stringify(got) === JSON.stringify(p.uris); if (!ok) bad++;
  console.log(ok ? 'ok ' : 'BAD', p.n, pl.public === false ? 'private' : `public=${pl.public}`, `${got.length}/${p.uris.length}`);
}
console.log(bad ? `${bad} problems` : 'all match');
