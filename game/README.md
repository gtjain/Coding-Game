# Code Hoppers (prototype v3)

Open `index.html` in a browser. Each game is a flash card; Back / Next (or ← →) move through the deck.

## Layout
- `js/catalog.js`: every game as data, plus every spoken line. **Add a game here.**
- `js/core.js`: shared kit (voice playback, grid board, block editor).
- `js/engines/*.js`: game templates. A catalog entry names one with `engine` and passes it `cfg`.
- `js/app.js`: players, per-kid timer, grown-up PIN, home path, deck, stars and streaks.
- `audio/`: pre-recorded voice clips and `voices.js` (text → file). Generated, do not edit.

## Add a game
1. Add an entry to `games` in `js/catalog.js` that reuses an engine (copy a similar entry, change `id`, `title`, `cfg`).
2. If it adds spoken text (`say`), re-record: see below.
3. Run the tests.

Engines call `g.mistake()` on a wrong try and `g.finish({title})` on success. Stars: 0 mistakes = 3, 1 = 2, 2+ = 1.

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
