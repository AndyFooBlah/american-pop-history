// The whole history is one public file, written by scripts/build-content.mjs.
import type { Content } from './data';
export async function load(): Promise<Content> { const r = await fetch('/content.json'); if (!r.ok) throw new Error(String(r.status)); return r.json(); }
/** Clears what the invite-only version (before 2026-11-25) kept in this browser. */
export function forgetSignIn() {
  try { localStorage.removeItem('pop-history.signin.email'); } catch { /* no storage */ }
  try { indexedDB.deleteDatabase('firebaseLocalStorageDb'); indexedDB.deleteDatabase('firebase-heartbeat-database'); } catch { /* no storage */ }
}
