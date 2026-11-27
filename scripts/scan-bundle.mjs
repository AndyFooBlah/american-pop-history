// Fails the build if dist/ holds anything that should not be public: unexpected files, keys, tokens, email addresses, or Firebase.
import fs from 'node:fs'; import path from 'node:path'; const bad = [];
const files = fs.readdirSync('dist', { recursive: true }).map(String).filter((f) => fs.statSync(path.join('dist', f)).isFile());
const OK = /^(index\.html|content\.json|robots\.txt|assets\/[\w.-]+\.(js|css|woff2?)|(narration|pd)\/[a-z0-9-]+\.[0-9a-f]{10}\.mp3)$/;
for (const f of files) if (!OK.test(f)) bad.push('unexpected file ' + f);
const rules = { 'a Google key': /AIza[\w-]{35}/, 'a Firebase reference': /firebaseapp\.com|identitytoolkit|firestore/i, 'a secret': /client_secret|refresh_token|xi-api-key|sk_[0-9a-f]{20}|gh[pousr]_\w{30}|-----BEGIN|ya29\./, 'an email address': /[\w.+-]+@[\w-]+\.(com|org|net|io|dev|app)\b/i, 'a local path': /\/Users\//, 'a source map': /sourceMappingURL/, 'a Google Doc link': /docs\.google\.com/ };
for (const f of files.filter((x) => /\.(js|css|html|json|txt)$/.test(x))) { const t = fs.readFileSync(path.join('dist', f), 'utf8'); for (const [what, re] of Object.entries(rules)) if (re.test(t)) bad.push(`${what} in ${f}`); }
const app = fs.existsSync('.env') && fs.readFileSync('.env', 'utf8').match(/^SPOTIFY_CLIENT_ID=(\w+)/m)?.[1];
if (app && files.some((f) => /\.(js|html|json)$/.test(f) && fs.readFileSync(path.join('dist', f), 'utf8').includes(app))) bad.push('the Spotify app id');
const c = JSON.parse(fs.readFileSync('dist/content.json')); const want = 'about,clips,eras,events,explicit,links,pd,playlists,shorts,timings,tracks,videos,wiki';
if (Object.keys(c).sort().join() !== want) bad.push('content.json has other fields: ' + Object.keys(c).sort());
if (Object.values(c.tracks).some((t) => !/^spotify:track:\w{22}$/.test(t))) bad.push('track data beyond ids');
if (bad.length) { console.error('NOT FIT TO PUBLISH:', bad.slice(0, 8).join('; ')); process.exit(1); }
console.log(`dist is clean (${files.length} files, ${(files.reduce((n, f) => n + fs.statSync(path.join('dist', f)).size, 0) / 1e6).toFixed(1)} MB)`);
