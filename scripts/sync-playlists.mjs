// Creates or updates the 12 "Pop History NN" playlists from data/eras.json + data/tracks.json, in order.
//   node scripts/sync-playlists.mjs [--apply] [--era N]
// Without --apply it only prints what it would do.
// Spotify ignores public:false here (checked 2026-11-24): playlists come out public. Privacy can only be set by hand in the Spotify app.
// Never deletes a playlist. Re-running replaces the items of playlists recorded in data/playlists.json, and nothing else.
import fs from 'node:fs'; import { client } from './spotify.mjs';
const ROOT = new URL('..', import.meta.url).pathname;
const read = (p, d) => (fs.existsSync(ROOT + p) ? JSON.parse(fs.readFileSync(ROOT + p, 'utf8')) : d);
const apply = process.argv.includes('--apply'); const only = process.argv.includes('--era') ? +process.argv[process.argv.indexOf('--era') + 1] : null;
const eras = read('data/eras.json'), tracks = read('data/tracks.json'), playlists = read('data/playlists.json', {});

export function plan(eras, tracks) {
  return eras.map((e) => ({ n: e.n, name: e.playlistTitle, description: `Era ${e.n} of ${eras.length}: ${e.title}`.slice(0, 300),
    uris: e.songs.map((s) => tracks[s.id]?.uri).filter(Boolean), skipped: e.songs.filter((s) => !tracks[s.id]?.uri).map((s) => s.title) }));
}
async function main() {
  const todo = plan(eras, tracks).filter((p) => !only || p.n === only);
  for (const p of todo) console.log(`${p.name}: ${p.uris.length} tracks${p.skipped.length ? `, skipping ${p.skipped.join('; ')}` : ''}`);
  if (!apply) return console.log('Dry run. Add --apply to write.');
  const api = await client();
  for (const p of todo) {
    if (!playlists[p.n]) { const c = await api('POST', '/me/playlists', { name: p.name, description: p.description, public: false }); playlists[p.n] = c.id; fs.writeFileSync(ROOT + 'data/playlists.json', JSON.stringify(playlists, null, 1) + '\n'); }
    else await api('PUT', `/playlists/${playlists[p.n]}`, { name: p.name, description: p.description });
    await api('PUT', `/playlists/${playlists[p.n]}/items`, { uris: p.uris });
    console.log(`wrote ${p.name}`);
  }
}
if (import.meta.url === `file://${process.argv[1]}`) await main();
