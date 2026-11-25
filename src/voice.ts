// Narration. A recording is used when there is one for the current text; otherwise the browser's own speech is the stand-in.
import { sentences } from './sentences';
export type Timings = Record<string, number[]>;
type Listener = (s: { id: string | null; sentence: number }) => void;
let timings: Timings = {}; let clips: Record<string, string> = {};
export function setRecordings(t: Timings, c: Record<string, string>) { timings = t; clips = c; }
const listeners = new Set<Listener>();
const audio = new Audio(); audio.preload = 'auto';
let current: string | null = null;
let run = 0;

const emit = (sentence: number) => listeners.forEach((l) => l({ id: current, sentence }));
export const onVoice = (l: Listener) => { listeners.add(l); };
export const speaking = () => current;
export const supported = () => 'speechSynthesis' in window || Object.keys(timings).length > 0;

export function stop() {
  run++; current = null; audio.pause(); audio.ontimeupdate = audio.onended = audio.onerror = null;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  emit(-1);
}

function pickVoice() {
  const en = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
  return en.find((v) => /premium|enhanced|natural/i.test(v.name)) ?? en.find((v) => /Samantha|Google US English/.test(v.name)) ?? en.find((v) => v.lang === 'en-US') ?? null;
}

export function narrate(id: string, text: string) {
  stop();
  const mine = ++run; current = id;
  if (timings[id] && clips[id]) { void recorded(id, text, mine); return; }
  spoken(text, mine);
}

async function recorded(id: string, text: string, mine: number) {
  const at = timings[id]; emit(-1);
  audio.src = `/narration/${clips[id]}`; let last = -1;
  audio.ontimeupdate = () => { if (mine !== run) return; let i = 0; while (i + 1 < at.length && at[i + 1] <= audio.currentTime + 0.1) i++; if (i !== last) emit(last = i); };
  audio.onended = () => { if (mine === run) stop(); };
  audio.onerror = () => { if (mine === run && last < 1) spoken(text, mine); else if (mine === run) stop(); };
  try { await audio.play(); } catch { if (mine === run && !audio.error) stop(); }
}

function spoken(text: string, mine: number) {
  if (!('speechSynthesis' in window)) return stop();
  const parts = sentences(text);
  const say = (i: number) => {
    if (mine !== run) return;
    if (i >= parts.length) return stop();
    const u = new SpeechSynthesisUtterance(parts[i]);
    const v = pickVoice(); if (v) u.voice = v;
    u.rate = 0.97; u.onend = () => say(i + 1); u.onerror = () => mine === run && stop();
    emit(i); speechSynthesis.speak(u);
  };
  say(0);
}
