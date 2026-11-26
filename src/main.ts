import '@fontsource/vast-shadow/latin-400.css'; import '@fontsource/limelight/latin-400.css'; import '@fontsource/poiret-one/latin-400.css';
import '@fontsource/yellowtail/latin-400.css'; import '@fontsource/bowlby-one/latin-400.css'; import '@fontsource/shrikhand/latin-400.css';
import '@fontsource/righteous/latin-400.css'; import '@fontsource/audiowide/latin-400.css'; import '@fontsource/permanent-marker/latin-400.css';
import '@fontsource/syncopate/latin-700.css'; import '@fontsource/poppins/latin-800.css'; import '@fontsource/unbounded/latin-700.css';
import '@fontsource-variable/newsreader'; import '@fontsource-variable/archivo';
import './style.css';
import { eras, tracks, playlists, links, events, wiki, about, explicit, wikiUrl, setContent, songCount, span, year, FIRST, LAST, type Era, type Song } from './data';
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
    <p class="lede">${eras.length} eras and ${songCount()} recordings, from parlor songs on wax cylinders to songs made for a feed. Read each story or have it read to you, then play the record. Sign in to Spotify in this browser to hear whole songs rather than previews.</p>
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
  const playable = !!tracks[s.id];
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
    <div class="acts top">${eraBtn(e.n)}${readBtn(id, 'Read the introduction')}${playlists[e.n] ? `<a class="find" href="https://open.spotify.com/playlist/${playlists[e.n]}" target="_blank" rel="noopener">Open the playlist on Spotify</a>` : ''}</div><div class="intro">${marked(id, e.intro.join(' '))}</div>
    <details class="context"><summary>What was going on</summary><dl><dt>History</dt><dd>${linked(e.boundaries, [...(wiki[`b-${e.n}`] ?? [])])}</dd><dt>Music</dt><dd>${esc(e.trends)}</dd><dt>Technology and business</dt><dd>${esc(e.tech)}</dd></dl>${timeline(e.n)}</details>
    <h2>The records</h2><ol class="songs">${e.songs.map(songRow).join('')}</ol>
    <nav class="turn" aria-label="Neighboring eras">${prev ? `<a href="#/era/${prev.n}">← ${span(prev)}</a>` : '<span></span>'}${next ? `<a href="#/era/${next.n}">${span(next)} →</a>` : '<span></span>'}</nav></article>`;
}

let playing: string | null = null;
function route() {
  eraStop(); voice.stop();
  const m = location.hash.match(/^#\/era\/(\d+)(?:\/([\w-]+))?/);
  const e = m ? eras[Number(m[1]) - 1] : undefined;
  if (e) eraView(e); else if (location.hash === '#/about') { document.body.dataset.era = '0'; document.title = 'Terms, privacy, and credits'; tune(null, null); $('#main').innerHTML = aboutPage(); } else home();
  mark();
  const el = m?.[2] ? document.getElementById(m[2]) : null;
  if (el) el.scrollIntoView(); else window.scrollTo(0, 0);
}

const songs = new Map<string, { s: Song; e: Era }>();
const textFor = (id: string) => id === 'home' ? about!.intro.join(' ') : id.startsWith('era-') && eras[Number(id.slice(4)) - 1] ? eras[Number(id.slice(4)) - 1].intro.join(' ') : songs.get(id)!.s.narration;

document.addEventListener('click', async (ev) => {
  if ((ev.target as HTMLElement).closest('[data-away]')) { eraStop(); voice.stop(); player.pause(); return; }
  const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('button'); if (!b) return;
  if (b.dataset.era) { const n = Number(b.dataset.era); if (chain?.n === n) { eraStop(); voice.stop(); player.pause(); } else void playEra(n); return; }
  if (b.dataset.skip && chain) { chain.skipTo = Number(b.dataset.skip); voice.stop(); player.cancel(); player.pause(); return; }
  if (b.dataset.read || b.dataset.play || b.dataset.go) eraStop();
  if (b.dataset.read) { if (voice.speaking() === b.dataset.read) voice.stop(); else { player.pause(); voice.narrate(b.dataset.read, textFor(b.dataset.read)); } }
  if (b.dataset.play) await start(b.dataset.play);
  if (b.dataset.go) { const id = b.dataset.go; show(id); await start(id, true); }
});

/** Shows a song on its era page without waiting for the hashchange event, which would redraw the page after the player starts. */
function show(id: string) {
  const h = `#/era/${songs.get(id)!.e.n}/${id}`;
  if (location.hash !== h) history.pushState(null, '', h);
  route();
}
async function start(id: string, fromDeck = false) {
  voice.stop(); if (!(await notice.ask())) return; playing = id;
  const { s, e } = songs.get(id)!; const uri = tracks[id];
  const deck = $('#deck'); deck.classList.add('open'); document.body.classList.add('playing');
  if (!deck.querySelector('#embed')) deck.innerHTML = '<div class="now"></div><div id="embed"></div>';
  const i = e.songs.indexOf(s);
  if (chain) {
    const nx = e.songs[i + 1];
    deck.querySelector('.now')!.innerHTML = `<p><b>${esc(s.title)}</b> ${esc(s.artist)}<span class="hint" hidden> · Press play in the Spotify player to keep going.</span></p><span class="btns">${nx ? `<button data-skip="${i + 1}" aria-label="Next: ${esc(nx.title)}">Next<span class="nx">: ${esc(nx.title)}</span></button>` : ''}<button data-era="${e.n}" aria-label="Stop the era">Stop</button></span>`;
  } else {
    const nx = e.songs.slice(i + 1).find((x) => tracks[x.id]);
    deck.querySelector('.now')!.innerHTML = `<p><b>${esc(s.title)}</b> ${esc(s.artist)}</p>${nx ? `<button data-go="${nx.id}">Next: ${esc(nx.title)}</button>` : ''}`;
  }
  if (fromDeck) deck.querySelector<HTMLButtonElement>('[data-go]')?.focus();
  mark();
  try { await player.play($('#embed'), uri); }
  catch { $('#embed').innerHTML = `<p class="none">The Spotify player didn’t load. <a href="https://open.spotify.com/track/${uri.split(':')[2]}" target="_blank" rel="noopener">Open the song on Spotify</a>.</p>`; }
}
/** "Play the whole era": the introduction, then each story followed by its song, with no further clicks. */
let chain: { n: number; run: number; skipTo: number | null } | null = null;
let chainRun = 0;
const eraBtn = (n: number) => `<button class="play" data-era="${n}" aria-pressed="${chain?.n === n}">${chain?.n === n ? 'Stop the era' : 'Play the whole era'}</button>`;
function eraButtons() {
  document.querySelectorAll<HTMLButtonElement>('button[data-era]').forEach((b) => {
    const on = chain?.n === Number(b.dataset.era);
    if (b.closest('#deck')) { if (!on) b.remove(); } else { b.textContent = on ? 'Stop the era' : 'Play the whole era'; b.setAttribute('aria-pressed', String(on)); }
  });
  if (!chain) document.querySelectorAll('#deck [data-skip]').forEach((b) => b.remove());
}
function eraStop() { if (!chain) return; chain = null; chainRun++; player.cancel(); eraButtons(); }
/** Brings a song into view during era play without changing the address, which would redraw the page. */
function showSong(id: string) {
  playing = id; mark();
  document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}
async function playEra(n: number) {
  const e = eras[n - 1]; eraStop(); player.pause();
  const run = ++chainRun; const me = { n, run, skipTo: null as number | null }; chain = me; eraButtons();
  const live = () => chain === me && run === chainRun;
  // The first piece must start inside the click, or Safari keeps it silent; the notice, if shown, supplies its own click.
  const songsOk = notice.seen() || (await notice.ask());
  console.info('[era] start', n, songsOk ? 'with songs' : 'stories only');
  for (let i = -1; i < e.songs.length; i++) {
    if (!live()) return;
    const jump = () => { if (me.skipTo === null) return false; i = me.skipTo - 1; me.skipTo = null; return true; };
    if (i < 0) { await voice.narrate(`era-${n}`, e.intro.join(' ')); jump(); continue; }
    const s = e.songs[i]; showSong(s.id);
    await voice.narrate(s.id, s.narration);
    if (!live()) return; if (jump()) continue;
    if (!songsOk || !tracks[s.id]) continue;
    await start(s.id);
    if (!live()) return; if (jump()) continue;
    const hint = setTimeout(() => { if (live() && !player.playing()) $('#deck .hint')?.removeAttribute('hidden'); }, 5000);
    const ended = await player.ended(); clearTimeout(hint);
    console.info('[era] song', s.id, ended ? 'ended' : 'skipped');
    if (!live()) return; jump();
  }
  if (live()) { console.info('[era] done', n); eraStop(); }
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
