import '@fontsource/vast-shadow/latin-400.css'; import '@fontsource/limelight/latin-400.css'; import '@fontsource/poiret-one/latin-400.css';
import '@fontsource/yellowtail/latin-400.css'; import '@fontsource/bowlby-one/latin-400.css'; import '@fontsource/shrikhand/latin-400.css';
import '@fontsource/righteous/latin-400.css'; import '@fontsource/audiowide/latin-400.css'; import '@fontsource/permanent-marker/latin-400.css';
import '@fontsource/syncopate/latin-700.css'; import '@fontsource/poppins/latin-800.css'; import '@fontsource/unbounded/latin-700.css';
import '@fontsource-variable/newsreader'; import '@fontsource-variable/archivo';
import './style.css';
import { eras, tracks, pd, playlists, links, events, wiki, about, explicit, wikiUrl, setContent, songCount, span, year, FIRST, LAST, type Era, type Song } from './data';
import * as voice from './voice';
import { sentences } from './sentences';
import * as player from './player';
import { load, forgetSignIn } from './content';
import * as notice from './notice';
import { aboutPage } from './about';

const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const SPAN = LAST - FIRST + 1;
const pct = (y: number) => ((y - FIRST) / SPAN) * 100;
const bandEnd = (i: number) => (i + 1 < eras.length ? eras[i + 1].start : LAST + 1);

function dial() {
  const bands = eras.map((e, i) =>
    `<a class="band" data-n="${e.n}" href="#/era/${e.n}" style="left:${pct(e.start)}%;width:${pct(bandEnd(i)) - pct(e.start)}%" title="Era ${e.n}: ${esc(e.title)}"><span class="sr">Era ${e.n}: ${esc(e.title)}, ${span(e)}</span><b aria-hidden="true">${e.n}</b></a>`).join('');
  const ticks = eras.flatMap((e) => e.songs.map((s) => `<i class="tick" data-song="${s.id}" style="left:${pct(year(s) + 0.5)}%"></i>`)).join('');
  const years = Array.from({ length: 14 }, (_, i) => 1890 + i * 10).map((y) => `<span class="yr" style="left:${pct(y)}%">${y}</span>`).join('');
  $('#top').innerHTML = `<a class="brand" href="#/">Introduction to American Pop Music</a>
    <div class="dialwrap"><nav class="dial" aria-label="Eras"><div class="years" aria-hidden="true">${years}</div>${bands}<div class="ticks" aria-hidden="true">${ticks}</div><div class="needle" aria-hidden="true"></div></nav></div>`;
}

function tune(y: number | null, era: number | null, song?: string) {
  const n = $('.needle'); n.style.opacity = y === null ? '0' : '1';
  if (y !== null) n.style.left = `${pct(y)}%`;
  document.querySelectorAll<HTMLElement>('.band').forEach((b) => (Number(b.dataset.n) === era ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  document.querySelectorAll<HTMLElement>('.tick').forEach((t) => t.classList.toggle('on', t.dataset.song === song));
  const w = $('.dialwrap');
  if (y !== null && w.scrollWidth > w.clientWidth) w.scrollTo({ left: (pct(y) / 100) * w.scrollWidth - w.clientWidth / 2, behavior: 'smooth' });
}

const away = (t: string, label: string) => `<a class="wiki" href="${esc(wikiUrl(t))}" target="_blank" rel="noopener">${esc(label)}</a>`;
/** Text with each listed phrase linked to Wikipedia at its first use. `left` holds the phrases still to place. */
function linked(text: string, left: [string, string][]): string {
  let best: { at: number; k: number } | null = null;
  left.forEach(([p], k) => { const at = text.indexOf(p); if (at >= 0 && (!best || at < best.at || (at === best.at && p.length > left[best.k][0].length))) best = { at, k }; });
  if (!best) return esc(text);
  const { at, k } = best as { at: number; k: number }; const [[p, t]] = left.splice(k, 1);
  return esc(text.slice(0, at)) + away(t, p) + linked(text.slice(at + p.length), left);
}
const marked = (id: string, text: string) => { const left = [...(wiki[id] ?? [])]; return sentences(text).map((s, i) => `<span data-say="${id}" data-i="${i}">${linked(s, left)} </span>`).join(''); };
/** Like marked, in paragraphs; sentence numbers run on from one paragraph to the next. */
function markedParas(id: string, paras: string[]) {
  const left = [...(wiki[id] ?? [])]; let i = 0;
  return paras.map((p) => `<p>${sentences(p).map((s) => `<span data-say="${id}" data-i="${i++}">${linked(s, left)} </span>`).join('')}</p>`).join('');
}
const timeline = (n: number) => events[n]?.length ? `<h3>Timeline</h3><ol class="timeline">${events[n].map((x) => `<li><span class="when">${x.year}</span>${away(x.wiki, x.text)}</li>`).join('')}</ol>` : '';
const readBtn = (id: string, label: string) => voice.supported() ? `<button class="read" data-read="${id}" data-label="${esc(label)}">${label}</button>` : '';

function home() {
  document.body.dataset.era = '0'; document.title = 'Introduction to American Pop Music'; tune(null, null);
  $('#main').innerHTML = `<section class="home"><h1>Turn the dial.</h1>
    <p class="lede">${eras.length} eras and ${songCount()} recordings, from parlor songs on wax cylinders to songs made for a feed. Read each story or have it read to you, then play the record; the Next button in the player bar steps through each era, from story to song. A few of the oldest recordings are in the public domain and play from this site. The rest play through Spotify, the most widely used streaming service; sign in to Spotify in this browser to hear whole songs rather than previews, or follow the links to other services.</p>
    ${about ? `<div class="about"><div class="acts top">${readBtn('home', 'Read the introduction')}</div>${markedParas('home', about.intro)}${about.note.map((p) => `<p class="note">${esc(p)} <b>${esc(about!.signed)}</b></p>`).join('')}</div>` : ''}
    <h2>The eras</h2>
    <ol class="eras">${eras.map((e) => `<li data-era="${e.n}"><a href="#/era/${e.n}"><span class="when">${span(e)}</span><span class="disp">${esc(e.title)}</span><span class="count">${e.songs.length} songs</span></a></li>`).join('')}</ol>
    ${about ? `<details class="context made"><summary>How this was made</summary>${about.made.map((p) => `<p>${esc(p)}</p>`).join('')}<dl class="stats">${about.stats.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p class="by">Written by Claude</p></details>` : ''}</section>`;
}

function elsewhere(s: Song) {
  const l = links[s.id] ?? { label: 'Find on Spotify', url: `https://open.spotify.com/search/${encodeURIComponent(`${s.title} ${s.artist}`)}` };
  return `<a class="find" data-away href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`;
}

function songRow(s: Song) {
  const playable = !!tracks[s.id] || !!pd[s.id];
  return `<li class="song" id="${s.id}"><div class="meta"><span class="when">${esc(s.dateAsWritten)}</span></div>
    <div class="body"><h3>${esc(s.title)}${explicit.has(s.id) ? ' <span class="exp">Strong language</span>' : ''}</h3><p class="artist">${esc(s.artist)}</p>
    <p class="story">${marked(s.id, s.narration)}</p>
    <p class="why">${esc(s.significance)}</p>
    <div class="acts">${readBtn(s.id, 'Read to me')}${playable ? `<button class="play" data-play="${s.id}">Play song</button>` : elsewhere(s)}</div></div></li>`;
}

function eraView(e: Era) {
  document.body.dataset.era = String(e.n); document.title = `${span(e)}: ${e.title}`;
  tune((e.start + bandEnd(e.n - 1)) / 2, e.n);
  const prev = eras[e.n - 2], next = eras[e.n];
  const id = `era-${e.n}`;
  $('#main').innerHTML = `<article class="era"><header><p class="when">Era ${e.n} of ${eras.length} · ${span(e)}</p><h1 class="disp">${esc(e.title)}</h1></header>
    <div class="acts top">${readBtn(id, 'Read the introduction')}${playlists[e.n] ? `<a class="find" href="https://open.spotify.com/playlist/${playlists[e.n]}" target="_blank" rel="noopener">Open the playlist on Spotify</a>` : ''}</div><div class="intro">${marked(id, e.intro.join(' '))}</div>
    <details class="context"><summary>What was going on</summary><dl><dt>History</dt><dd>${linked(e.boundaries, [...(wiki[`b-${e.n}`] ?? [])])}</dd><dt>Music</dt><dd>${esc(e.trends)}</dd><dt>Technology and business</dt><dd>${esc(e.tech)}</dd></dl>${timeline(e.n)}</details>
    <h2>The records</h2><ol class="songs">${e.songs.map(songRow).join('')}</ol>
    <nav class="turn" aria-label="Neighboring eras">${prev ? `<a href="#/era/${prev.n}">← ${span(prev)}</a>` : '<span></span>'}${next ? `<a href="#/era/${next.n}">${span(next)} →</a>` : '<span></span>'}</nav></article>`;
}

let playing: string | null = null;
function route() {
  voice.stop();
  const m = location.hash.match(/^#\/era\/(\d+)(?:\/([\w-]+))?/);
  const e = m ? eras[Number(m[1]) - 1] : undefined;
  if (e) eraView(e); else if (location.hash === '#/about') { document.body.dataset.era = '0'; document.title = 'Terms, privacy, and credits'; tune(null, null); $('#main').innerHTML = aboutPage(); } else home();
  mark(); deck();
  const el = m?.[2] ? document.getElementById(m[2]) : null;
  if (el) requestAnimationFrame(() => el.scrollIntoView()); else window.scrollTo(0, 0);
}

const songs = new Map<string, { s: Song; e: Era }>();
const textFor = (id: string) => id === 'home' ? about!.intro.join(' ') : id.startsWith('era-') && eras[Number(id.slice(4)) - 1] ? eras[Number(id.slice(4)) - 1].intro.join(' ') : songs.get(id)!.s.narration;

/** Listening goes in steps: an era's introduction, then each song's story and the song itself. Every step starts on a press
 *  (Spotify's policy III.7 rules out running one into the next), and the player bar always offers the next one. */
type Step = { kind: 'read' | 'song'; id: string; era: number };
const canPlay = (id: string) => !!(pd[id] || tracks[id]);
function stepsOf(n: number): Step[] {
  const e = eras[n - 1]; if (!e) return [];
  return [{ kind: 'read', id: `era-${n}`, era: n }, ...e.songs.flatMap((s): Step[] => [{ kind: 'read', id: s.id, era: n }, ...(canPlay(s.id) ? [{ kind: 'song' as const, id: s.id, era: n }] : [])])];
}
function after(st: Step): Step | null {
  if (st.id === 'home') return stepsOf(1)[0] ?? null;
  const list = stepsOf(st.era); const i = list.findIndex((x) => x.kind === st.kind && x.id === st.id);
  return list[i + 1] ?? stepsOf(st.era + 1)[0] ?? null;
}
const titleOf = (id: string) => songs.get(id)?.s.title ?? '';
const nextLabel = (st: Step) => st.kind === 'song' ? `Play “${titleOf(st.id)}”` : st.id.startsWith('era-') ? `Era ${st.era} introduction` : `The story of “${titleOf(st.id)}”`;
let at: Step | null = null;

/** Search links for other services, under the player; a song's own entry in links.json replaces the matching search. */
const services: [string, (q: string) => string][] = [
  ['YouTube', (q) => `https://www.youtube.com/results?search_query=${q}`],
  ['YouTube Music', (q) => `https://music.youtube.com/search?q=${q}`],
  ['Apple Music', (q) => `https://music.apple.com/us/search?term=${q}`],
  ['Amazon Music', (q) => `https://music.amazon.com/search/${q}`],
];
function alts(id: string) {
  const s = songs.get(id)?.s; if (!s) return '';
  const q = encodeURIComponent(`${s.title} ${s.artist}`); const own = links[id];
  const list = services.map(([name, url]) => own && own.url.includes(new URL(url('x')).hostname) ? [name, own.url] : [name, url(q)]);
  if (tracks[id] && pd[id]) list.unshift(['Spotify', `https://open.spotify.com/track/${tracks[id].split(':')[2]}`]);
  return `<p class="alts">${pd[id] ? `Public domain recording, from <a href="${esc(pd[id].url)}" target="_blank" rel="noopener">${esc(pd[id].source)}</a>. ` : ''}Also on ${list.map(([n, u]) => `<a data-away href="${esc(u)}" target="_blank" rel="noopener">${n}</a>`).join(' · ')}</p>`;
}

/** Draws the player bar for the current step: what is on, the Next button, and links to other services. */
function deck() {
  const d = $('#deck'); if (!at) return;
  d.classList.add('open'); document.body.classList.add('playing');
  if (!d.querySelector('#embed')) d.innerHTML = '<div class="now"></div><div id="embed" hidden></div><audio id="pd" controls preload="none" hidden></audio><div class="alt"></div>';
  const nx = after(at); const s = songs.get(at.id)?.s;
  const what = at.kind === 'song' ? `<b>${esc(s!.title)}</b> ${esc(s!.artist)}` : at.id === 'home' ? '<b>Introduction</b>' : at.id.startsWith('era-') ? `<b>Era ${at.era} introduction</b>` : `The story of <b>${esc(s!.title)}</b>`;
  d.querySelector('.now')!.innerHTML = `<p>${what}</p>${nx ? `<button class="play" data-next aria-label="Next: ${esc(nextLabel(nx))}">Next<span class="nx">: ${esc(nextLabel(nx))}</span></button>` : ''}`;
  d.querySelector('.alt')!.innerHTML = s ? alts(s.id) : '';
}

/** Plays one step, moving to its era's page first if needed. Called from a press, so browsers let the audio start. */
async function go(st: Step) {
  const page = st.id === 'home' ? '#/' : `#/era/${st.era}`;
  if (st.era && !location.hash.startsWith(page + '/') && location.hash !== page) { history.pushState(null, '', page); route(); }
  if (st.kind === 'song') return start(st.id, true);
  read(st);
}
function read(st: Step) {
  player.pause(); pdEl()?.pause(); at = st; deck();
  if (songs.has(st.id)) showSong(st.id);
  void voice.narrate(st.id, textFor(st.id));
}
const pdEl = () => document.querySelector<HTMLAudioElement>('#pd');

document.addEventListener('click', async (ev) => {
  if ((ev.target as HTMLElement).closest('[data-away]')) { voice.stop(); player.pause(); pdEl()?.pause(); return; }
  const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('button'); if (!b) return;
  if (b.dataset.next !== undefined && at) { const nx = after(at); if (nx) await go(nx); return; }
  if (b.dataset.read) {
    const id = b.dataset.read;
    if (voice.speaking() === id) voice.stop();
    else read({ kind: 'read', id, era: id === 'home' ? 0 : id.startsWith('era-') ? Number(id.slice(4)) : songs.get(id)!.e.n });
  }
  if (b.dataset.play) await start(b.dataset.play);
});

async function start(id: string, fromDeck = false) {
  voice.stop();
  const own = pd[id];
  if (!own && !(await notice.ask())) return;
  playing = id; at = { kind: 'song', id, era: songs.get(id)!.e.n }; deck(); mark();
  if (fromDeck) $('#deck').querySelector<HTMLButtonElement>('[data-next]')?.focus();
  const embed = $('#embed'), audio = pdEl()!;
  embed.hidden = !!own; audio.hidden = !own;
  if (own) { player.pause(); audio.src = `/pd/${own.clip}`; try { await audio.play(); } catch { /* the controls stay for a manual start */ } return; }
  audio.pause(); const uri = tracks[id];
  try { await player.play(embed, uri); }
  catch { embed.innerHTML = `<p class="none">The Spotify player didn’t load. <a href="https://open.spotify.com/track/${uri.split(':')[2]}" target="_blank" rel="noopener">Open the song on Spotify</a>.</p>`; }
}
/** Brings a song into view without changing the address, which would redraw the page. */
function showSong(id: string) {
  document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}
/** Marks the playing song on the page and the dial, if its era is showing. */
function mark() {
  const p = playing ? songs.get(playing) : undefined; if (!p || document.body.dataset.era !== String(p.e.n)) return;
  document.querySelectorAll('.song').forEach((x) => x.classList.toggle('on', x.id === playing)); tune(year(p.s) + 0.5, p.e.n, p.s.id);
}
voice.onVoice(({ id, sentence }) => {
  document.querySelectorAll<HTMLElement>('[data-say]').forEach((x) => x.classList.toggle('saying', x.dataset.say === id && Number(x.dataset.i) === sentence));
  document.querySelectorAll<HTMLButtonElement>('[data-read]').forEach((x) => { const on = x.dataset.read === id; x.textContent = on ? 'Stop reading' : x.dataset.label!; x.setAttribute('aria-pressed', String(on)); });
});
document.title = 'Introduction to American Pop Music';
forgetSignIn();
try {
  const content = await load();
  setContent(content); voice.setRecordings(content.timings ?? {}, content.clips ?? {});
  for (const e of eras) for (const s of e.songs) songs.set(s.id, { s, e });
  dial(); window.addEventListener('hashchange', route); route();
} catch { $('#main').innerHTML = '<h1>Couldn’t load</h1><p class="lede">Check your connection and reload.</p>'; }
