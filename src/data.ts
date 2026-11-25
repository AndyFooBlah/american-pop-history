// src/content.ts loads the content and main.ts calls setContent.
export interface Song { id: string; title: string; artist: string; dateAsWritten: string; significance: string; narration: string }
export interface Era { n: number; title: string; start: number; end: number | null; boundaries: string; trends: string; tech: string; playlistTitle: string; intro: string[]; songs: Song[] }
export interface Content { eras: Era[]; tracks: Record<string, string>; playlists: Record<string, string>; timings?: Record<string, number[]>; clips?: Record<string, string>; explicit?: string[]; links?: Record<string, { label: string; url: string }>; events?: Record<string, HistoryEvent[]>; wiki?: Record<string, [string, string][]>; about?: About }
export interface About { intro: string[]; note: string[]; signed: string; made: string[]; stats: [string, string][] }
export interface HistoryEvent { year: string; text: string; wiki: string }

export let eras: Era[] = [];
/** Song id → Spotify URI, for songs that have one. */
export let tracks: Record<string, string> = {};
export let playlists: Record<string, string> = {};
/** Song id → where to hear it, for songs that are not on Spotify. */
export let links: Record<string, { label: string; url: string }> = {};
/** Era number → its 20 events. */
export let events: Record<string, HistoryEvent[]> = {};
/** Text id → [phrase, Wikipedia title], in the order they were written. */
export let wiki: Record<string, [string, string][]> = {};
/** The home page's introduction, Andy's note, and how the site was made. */
export let about: About | null = null;
/** Songs known to have strong language. */
export let explicit = new Set<string>();
export const wikiUrl = (t: string) => `https://en.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`;
export function setContent(c: Content) { eras = c.eras; tracks = c.tracks; playlists = c.playlists; links = c.links ?? {}; events = c.events ?? {}; wiki = c.wiki ?? {}; about = c.about ?? null; explicit = new Set(c.explicit ?? []); }
export const songCount = () => eras.reduce((n, e) => n + e.songs.length, 0);
export const FIRST = 1890;
export const LAST = new Date().getFullYear();
export const span = (e: Era) => `${e.start}–${e.end ?? 'now'}`;
/** First four-digit year in the written date, e.g. "1899 / 1916 piano roll" → 1899. */
export const year = (s: Song) => Number(s.dateAsWritten.match(/\d{4}/)![0]);
