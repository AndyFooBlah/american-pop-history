// Spotify iFrame embed. Loaded only when the listener first presses play, so nothing is fetched from Spotify before that.
// Narration and music never overlap: callers stop narration before a song starts. "Play the whole era" moves from story
// to song to story without further clicks (owner's decision, 2026-11-25, accepting the risk under Developer Policy III.7).
interface Update { isPaused: boolean; position: number; duration: number }
interface Controller { loadUri(u: string): void; play(): void; pause(): void; addListener(e: string, f: (d: { data: Update }) => void): void }
interface Api { createController(el: HTMLElement, o: object, cb: (c: Controller) => void): void }
declare global { interface Window { onSpotifyIframeApiReady?: (a: Api) => void } }
let controller: Promise<Controller> | null = null;

export function load(host: HTMLElement, uri: string): Promise<Controller> {
  controller ??= new Promise((ok, fail) => {
    window.onSpotifyIframeApiReady = (api) => {
      const el = document.createElement('div'); host.replaceChildren(el);
      api.createController(el, { uri, width: '100%', height: 152 }, ok);
    };
    const s = document.createElement('script');
    s.src = 'https://open.spotify.com/embed/iframe-api/v1'; s.async = true;
    s.onerror = () => { controller = null; ready = false; s.remove(); fail(new Error('Spotify player did not load')); };
    document.head.append(s);
  });
  return controller;
}
let ready = false;
/** True once the current song has actually started playing. */
let started = false;
let waiting: ((ended: boolean) => void) | null = null;
const settle = (ended: boolean) => { const w = waiting; waiting = null; w?.(ended); };

/** A song has ended when its position reaches its length (Spotify does not pause there), or when it stops at its start or
 *  near its end after playing. A pause part way through is the listener's. Previews report a length of about 30 seconds. */
function watch(c: Controller) {
  c.addListener('playback_update', ({ data: d }) => {
    if (!started) { if (!d.isPaused && d.position > 0 && d.position < d.duration - 50) started = true; return; }
    const atEnd = d.duration > 0 && d.position >= d.duration - 50;
    if (atEnd || (d.isPaused && (d.position === 0 || d.position >= d.duration - 1500))) { started = false; settle(true); }
  });
}
/** Plays a song. Asked again while the player is still starting, it switches to the latest song and plays once ready. */
export async function play(host: HTMLElement, uri: string) {
  const first = !controller; started = false;
  const c = await load(host, uri);
  if (first) { watch(c); c.addListener('ready', () => { if (!ready) { ready = true; c.play(); } }); }
  else { c.loadUri(uri); if (ready) c.play(); }
}
/** Resolves true when the current song ends, false if cancel() comes first. */
export const ended = () => new Promise<boolean>((ok) => { settle(false); waiting = ok; });
export const cancel = () => settle(false);
export const playing = () => started;
export const pause = () => { void controller?.then((c) => c.pause()); };
