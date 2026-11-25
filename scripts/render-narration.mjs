// Records the narration with ElevenLabs (Brian, eleven_v4): narration/<id>.mp3 plus data/narration.json {id: {hash, seconds, starts}}.
// A long piece gets a lower bitrate, to keep files small.
// Only pieces whose text changed are rendered. The key is read from the .env given as argument and is never printed or stored.
//   node scripts/render-narration.mjs path/to/.env [--only id,id]
import fs from 'node:fs'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process'; import { sentences } from '../src/sentences.ts';
const ROOT = new URL('..', import.meta.url).pathname; const VOICE = 'nPczCjzI2devNBz1zQrb', MODEL = 'eleven_v4';
export const hash = (t) => crypto.createHash('sha256').update(`${VOICE}|${MODEL}|${say(t)}`).digest('hex').slice(0, 16);
// How a stylised name is said. Sentence starts must not change.
export const say = (t) => t.replaceAll('HUNTR/X', 'Huntrix');
const ABOUT = JSON.parse(fs.readFileSync(ROOT + 'data/about.json'));
export const pieces = (eras) => [{ id: 'home', text: ABOUT.intro.join(' ') }, ...eras.flatMap((e) => [{ id: `era-${e.n}`, text: e.intro.join(' ') }, ...e.songs.map((s) => ({ id: s.id, text: s.narration }))])];
/** Start time of each sentence, from per-character times. */
export function starts(text, al) {
  const joined = al.characters.join('').replace(/\u00a0/g, ' '); let at = 0;
  return sentences(text).map((s) => { const i = joined.indexOf(s.slice(0, 12).replace(/\u00a0/g, ' '), at); if (i < 0) throw new Error('timing text differs'); at = i + 1; return Math.round(al.character_start_times_seconds[i] * 100) / 100; });
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const key = fs.readFileSync(process.argv[2], 'utf8').match(/^ELEVENLABS_API_KEY=["']?([^"'\s]+)/m)[1];
  const only = process.argv.includes('--only') ? new Set(process.argv[process.argv.indexOf('--only') + 1].split(',')) : null;
  const MF = ROOT + 'data/narration.json'; const m = JSON.parse(fs.readFileSync(MF)); const man = Array.isArray(m) ? {} : m;
  fs.mkdirSync(ROOT + 'narration', { recursive: true }); let chars = 0, n = 0;
  for (const { id, text } of pieces(JSON.parse(fs.readFileSync(ROOT + 'data/eras.json')))) {
    const f = `${ROOT}narration/${id}.mp3`; if (only ? !only.has(id) : man[id]?.hash === hash(text) && fs.existsSync(f)) continue;
    let r; for (let t = 0; t < 4; t++) {
      r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps?output_format=mp3_44100_128`, { method: 'POST', headers: { 'xi-api-key': key, 'content-type': 'application/json' }, body: JSON.stringify({ text: say(text), model_id: MODEL }) });
      if (r.ok || ![429, 500, 502, 503].includes(r.status)) break; await new Promise((x) => setTimeout(x, 5000 * (t + 1)));
    }
    if (!r.ok) { console.error('stopped at', id, r.status, (await r.text()).slice(0, 250)); break; }
    const j = await r.json(); const st = starts(text, j.alignment);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', 'pipe:0', '-af', 'loudnorm=I=-18:TP=-2', '-ac', '1', '-ar', '44100', '-b:a', text.length > 1800 ? '40k' : '64k', f], { input: Buffer.from(j.audio_base64, 'base64') });
    const sec = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
    man[id] = { hash: hash(text), seconds: Math.round(sec * 10) / 10, starts: st }; fs.writeFileSync(MF, JSON.stringify(man, null, 1).replace(/\[\s+([^\]]*?)\s+\]/g, (x) => x.replace(/\s+/g, ' ')) + '\n');
    chars += text.length; n++; if (n % 10 === 0) console.log(n, 'done', chars, 'chars');
  }
  console.log(`rendered ${n} pieces, ${chars} characters; manifest has ${Object.keys(man).length}`);
}
