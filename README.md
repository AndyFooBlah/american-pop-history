# Introduction to American Pop Music

An interactive history of American popular music from 1890 to today: twelve eras, 116 recordings, and the events, movements, and technologies around them. Pick an era on the tuning dial, read each story or have it read to you, then play the song in Spotify's player.

Found a mistake, a wrong recording, or a rights problem? Please [open an issue](https://github.com/AndyFooBlah/american-pop-history/issues). Issues are public.

## How it is built
Vite and TypeScript, no framework, no server, no accounts, no analytics. `scripts/build-content.mjs` turns `data/` into one JSON file; `scripts/scan-bundle.mjs` refuses to publish anything that looks like a secret or private file. Songs play only through Spotify's embedded player, only after a click, and never over the narration. Spotify is not contacted until a visitor continues past a short notice.

    npm ci
    npm run dev      # http://localhost:5211
    npm run check    # tests and types
    npm run build    # dist/, scanned

The narration recordings are not in this repository; without them the browser's own voice reads. Text edits go in `data/eras.json` and `data/about.json`, events and links in `data/src/` (then `python3 scripts/build-wiki.py`).

## Licenses
- Code: [Apache License 2.0](LICENSE).
- Text, timelines, and the selection of songs (`data/`): [CC BY 4.0](LICENSE-CONTENT), to the extent they are protected by copyright. They were mostly written by AI (Gemini, then Claude) under human direction.
- Not covered: Spotify's player, music, artwork, playlists, and identifiers; the recorded narration (made with ElevenLabs); the typefaces (SIL OFL); names and trademarks.

Not affiliated with Spotify or any artist, label, or publisher. Provided as is, without warranty. This repository is a published copy: commits are exported from a private working repository, so please use issues rather than pull requests.
