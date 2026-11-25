// Shown once, before the first song. Nothing is fetched from Spotify until the visitor continues; the answer stays in this browser.
const KEY = 'pop-history.notice';
let agreed = false;
const seen = () => { try { return agreed || localStorage.getItem(KEY) === '1'; } catch { return agreed; } };
export function ask(): Promise<boolean> {
  if (seen()) return Promise.resolve(true);
  const d = document.createElement('dialog'); d.className = 'notice'; d.setAttribute('aria-labelledby', 'notice-h');
  d.innerHTML = `<h2 id="notice-h">Before the first song</h2>
    <p>Songs play through Spotify’s own player, which sets its own cookies and is for people 13 and older.</p>
    <p>Some lyrics, and some of the history told here, are not suitable for children. Songs we know to have strong language are marked; we may have missed some.</p>
    <p>By continuing, you say that you are at least 13 and accept the <a href="#/about">terms and privacy notes</a>. You can read and listen to every story without the songs.</p>
    <form method="dialog" class="acts"><button class="play" value="yes" autofocus>Continue</button><button value="no">Not now</button></form>`;
  document.body.append(d); d.showModal();
  return new Promise((ok) => {
    d.querySelector('a')!.addEventListener('click', () => d.close('no'));
    d.addEventListener('close', () => { const yes = d.returnValue === 'yes'; if (yes) { agreed = true; try { localStorage.setItem(KEY, '1'); } catch { /* asked again next visit */ } } d.remove(); ok(yes); });
  });
}
