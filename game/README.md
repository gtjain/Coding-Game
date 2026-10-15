# Code Hoppers (prototype v3)

Open `index.html` in a browser. Each game is a flash card; Back / Next (or ← →) move through the deck.

## Layout
- `js/catalog.js`: every game as data, plus every spoken line. **Add a game here.**
- `js/core.js`: shared kit (voice playback, grid board, block editor).
- `js/engines/*.js`: game templates. A catalog entry names one with `engine` and passes it `cfg`.
- `js/app.js`: players, per-kid timer, grown-up PIN, home path, deck, stars and streaks.
- `audio/`: pre-recorded voice clips and `voices.js` (text → file). Generated, do not edit.

## Add levels without losing anyone's progress
Progress lives in the browser (localStorage, key `code-hoppers-v3`) on the phone. It is stored by game id, so:
- **Add a game:** give it a new unique `id` in `js/catalog.js`. Existing players keep every point and star. The new game shows a NEW badge until each kid opens it.
- **Never change or reuse an id** of a game that has been released, and never change the storage `KEY`.
- **Change what is saved:** add new fields with defaults in `migrate()` in `js/app.js`. It runs on every load and keeps fields it does not know about.
- **Publish to the same artifact URL.** The browser keeps storage per address, so a new URL starts empty.
- Every save also writes a backup copy. Grown-ups can copy a backup text (🔒 Grown-ups) and paste it back to restore. Clearing the browser's site data or using a private window loses progress.

## Add a game
1. Add an entry to `games` in `js/catalog.js` that reuses an engine (copy a similar entry, change `id`, `title`, `cfg`).
2. Give it `goal` (one line), `steps` (2 to 4 short steps) and `say` (the same thing, simple, for the voice). Re-record the voice: see below.
3. Run the tests.

Engines call `g.mistake()` on a wrong try and `g.finish({title})` on success. Stars: 0 mistakes = 3, 1 = 2, 2+ = 1.

Board options (any grid game): `items: [[x, y, '🥚']]` must all be collected before the goal counts; `gates: [[x, y, '🚧']]` stay shut until every item is collected. `arrowPath` also takes `went` (the trip already driven, for "go back home" puzzles).

Engines for ages 4–6 added in v3.4: `pixelPaint` (colour code), `guessWho` (yes / no questions), `swapSort` (swap neighbours), `eventButtons` (when I tap…), `forEach` (one loop per item, optional IF), `recipe` (read a recipe), and `piano` with `mode` `find`, `copy`, `loop` or `bug`.

## Record the voice
```
node tools/phrases.mjs > tools/phrases.json
python tools/build_voice.py --models /path/to/kokoro-models            # free Kokoro voice, offline
ELEVENLABS_API_KEY=... python tools/build_voice.py --engine elevenlabs --voice <voice-id>
```
Only new or changed lines are recorded. Kokoro model files: `kokoro-v1.0.int8.onnx` and `voices-v1.0.bin`
from the thewh1teagle/kokoro-onnx GitHub releases; also `pip install kokoro-onnx soundfile` and ffmpeg.

## Publish as one file
```
node tools/bundle.mjs      # writes dist/index.html with scripts and audio inlined
```
The claude.ai artifact viewer needs this single file; it does not load the separate js/ and audio/ files.

## Publish as a website (GitHub Pages)
`.github/workflows/pages.yml` publishes the game on every push to `prototypes-v1`. It runs
`node tools/site.mjs`, which wraps `index.html` in a full HTML page (doctype, phone viewport) and
copies `js/` and `audio/` next to it. Needed for the microphone games, which the claude.ai viewer blocks.

One-time setup: the repo must be public (or on a paid GitHub plan), then
Settings → Pages → Build and deployment → Source: **GitHub Actions**.
The address is `https://gtjain.github.io/Coding-Game/`. Progress saved there is separate from the claude.ai link.

To check the site locally: `node tools/site.mjs`, serve `site/` (e.g. `python3 -m http.server`), then
`PAGE_URL=http://127.0.0.1:8000/index.html PW=... node test/play.mjs`.

## Test
```
PW=$(npm root -g)/playwright/index.mjs node test/play.mjs
PAGE=$PWD/dist/index.html PW=... node test/play.mjs   # test the bundle
```
Checks square alignment at 3 widths, plays every card, stars, streak bonus, voice parsing,
profile editing, the per-kid timer and PIN lock, and that every spoken line has a clip.

## Voice input
Uses the browser's speech recognition (Chrome, Edge, Safari). It does not work inside the claude.ai
artifact viewer, which blocks the microphone; host the folder on any web server (or GitHub Pages) to use it.
Word buttons keep every voice game playable without a microphone.
