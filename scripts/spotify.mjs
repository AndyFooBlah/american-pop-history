// Spotify Web API access for the owner's own app. PKCE: no client secret. The refresh token stays in .spotify-token.json (gitignored).
import fs from 'node:fs'; import http from 'node:http'; import crypto from 'node:crypto';
const ROOT = new URL('..', import.meta.url).pathname;
const REDIRECT = 'http://127.0.0.1:8976/callback', SCOPE = 'playlist-modify-private playlist-read-private';
async function token(id) {
  const f = ROOT + '.spotify-token.json'; const post = async (b) => {
    const r = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', body: new URLSearchParams({ client_id: id, ...b }) });
    if (!r.ok) throw new Error(`token: ${r.status} ${await r.text()}`); return r.json(); };
  if (fs.existsSync(f)) { const t = await post({ grant_type: 'refresh_token', refresh_token: JSON.parse(fs.readFileSync(f)).refresh_token }).catch(() => null);
    if (t) { if (t.refresh_token) fs.writeFileSync(f, JSON.stringify({ refresh_token: t.refresh_token }), { mode: 0o600 }); return t.access_token; } }
  const verifier = crypto.randomBytes(48).toString('base64url'), state = crypto.randomBytes(12).toString('hex');
  const url = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({ client_id: id, response_type: 'code', redirect_uri: REDIRECT, scope: SCOPE, state, code_challenge_method: 'S256', code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url') });
  console.log('Open this and approve:\n' + url); fs.writeFileSync(ROOT + '.spotify-token-url', url);
  const code = await new Promise((ok, no) => { const srv = http.createServer((q, r) => { const u = new URL(q.url, REDIRECT); if (u.pathname !== '/callback') return r.writeHead(404).end();
    r.end('Done. You can close this tab.'); srv.close(); u.searchParams.get('state') === state && u.searchParams.get('code') ? ok(u.searchParams.get('code')) : no(new Error('authorization refused')); }).listen(8976, '127.0.0.1'); });
  const t = await post({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT, code_verifier: verifier });
  fs.writeFileSync(f, JSON.stringify({ refresh_token: t.refresh_token }), { mode: 0o600 }); return t.access_token;
}
export async function client() {
  const id = process.env.SPOTIFY_CLIENT_ID ?? fs.readFileSync(ROOT + '.env', 'utf8').match(/^SPOTIFY_CLIENT_ID=(\w+)/m)?.[1];
  if (!id) throw new Error('set SPOTIFY_CLIENT_ID in .env');
  const at = await token(id);
  return async function api(method, path, body) {
    for (let tries = 0; ; tries++) {
      const r = await fetch('https://api.spotify.com/v1' + path, { method, headers: { authorization: `Bearer ${at}`, 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
      if (r.status === 429 && tries < 4) { const wait = Number(r.headers.get('retry-after') ?? 2); if (wait > 60) throw new Error(`rate limited for ${wait}s`); await new Promise((f) => setTimeout(f, (wait + 1) * 1000)); continue; }
      if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${await r.text()}`);
      return r.status === 204 ? null : r.json().catch(() => null);
    }
  };
}
if (import.meta.url === `file://${process.argv[1]}`) { const me = await (await client())('GET', '/me'); console.log('signed in:', Boolean(me.id)); }
