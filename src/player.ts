// Spotify iFrame embed. Loaded only when the listener first presses play, so nothing is fetched from Spotify before that.
// Policy: never overlap, mix or segue Spotify audio with narration (Developer Policy III.7). Callers stop narration first,
// and every song starts on a press.
interface Controller { loadUri(u: string): void; play(): void; pause(): void; addListener(e: string, f: () => void): void }
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
/** Plays a song. Asked again while the player is still starting, it switches to the latest song and plays once ready. */
export async function play(host: HTMLElement, uri: string) {
  const first = !controller;
  const c = await load(host, uri);
  if (first) c.addListener('ready', () => { if (!ready) { ready = true; c.play(); } });
  else { c.loadUri(uri); if (ready) c.play(); }
}
export const pause = () => { void controller?.then((c) => c.pause()); };
