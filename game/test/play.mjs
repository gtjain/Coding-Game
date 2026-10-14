// End-to-end checks for game/index.html.
// Run: PW=/path/to/playwright/index.mjs node game/test/play.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PW || 'playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = 'file://' + (process.env.PAGE || path.join(ROOT, 'index.html'));
let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

/* 0. every spoken line has a recording on disk */
const voices = JSON.parse(fs.readFileSync(path.join(ROOT, 'audio/voices.js'), 'utf8').replace(/^[\s\S]*?window\.CH_VOICE = /, '').replace(/;\s*$/, ''));
const phrases = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/phrases.json'), 'utf8'));
const missing = phrases.filter(p => !voices[p] || !fs.existsSync(path.join(ROOT, 'audio', voices[p])));
check(`all ${phrases.length} spoken lines have a recorded clip`, missing.length === 0, missing.join(' | '));

const browser = await chromium.launch();
const NEW_YOUNG = ['A10', 'A11', 'A12', 'A13', 'A14', 'A15', 'A16'], NEW_OLDER = ['B13', 'B14', 'B15', 'B16', 'B17', 'B18', 'B19', 'B20', 'B21'];
const BOARD_CARDS = ['A1', 'A9', 'A4', 'A7', 'A8', 'B1', 'B12', 'B2', 'B8', 'B11'];

/* 1. sprite lands exactly on each square, every board card, three widths */
for (const [W, H] of [[360, 780], [768, 1000], [1280, 900]]) {
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  await p.goto(PAGE);
  await p.addStyleTag({ content: '.sprite{transition:none!important}' });
  const bad = [];
  for (const id of BOARD_CARDS) {
    await p.evaluate(id => { location.hash = id; }, id); await p.waitForSelector(`#card-${id} .board`);
    const r = await p.evaluate(() => {
      const b = window.__boards.filter(b => b.el.isConnected).at(-1);
      let worst = 0;
      const hs = b.cells.map(c => c.getBoundingClientRect().height);
      for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
        if (b.blocked(x, y)) continue;
        b.place(x, y);
        const s = b.sprite.getBoundingClientRect(), c = b.cells[y * b.w + x].getBoundingClientRect();
        worst = Math.max(worst, Math.abs(s.left - c.left), Math.abs(s.top - c.top), Math.abs(s.width - c.width), Math.abs(s.height - c.height));
      }
      b.reset();
      return { worst, spread: Math.max(...hs) - Math.min(...hs), cell: b.cells[0].getBoundingClientRect().width };
    });
    if (!(r.cell >= 28 && r.worst <= 1 && r.spread <= 1)) bad.push(`${id}: square ${r.cell.toFixed(1)}px, offset ${r.worst.toFixed(2)}px`);
  }
  check(`squares line up on all ${BOARD_CARDS.length} board cards @${W}px`, bad.length === 0, bad.join('; '));
  check(`no sideways scroll @${W}px`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  await p.close();
}

/* 2. deck, every card, stars, streak (phone width) */
const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
p.on('pageerror', e => errors.push(e.message));
p.on('console', m => m.type() === 'error' && errors.push(m.text()));
await p.goto(PAGE);
const wait = ms => p.waitForTimeout(ms);
const open = async id => {
  if ((await p.evaluate(() => location.hash)) === '#' + id) { await p.evaluate(() => { location.hash = 'home'; }); await p.waitForSelector('#home:not([hidden])'); }
  await p.evaluate(id => { location.hash = id; }, id); await p.waitForSelector(`#card-${id}`);
};
const R = id => `#card-${id} .result`;
const txt = async id => (await p.locator(R(id)).isVisible()) ? (await p.locator(R(id)).innerText()).replace(/\s+/g, ' ') : '(no result)';
const C = id => `#card-${id} .play`;
const clickN = async (sel, n) => { for (let i = 0; i < n; i++) await p.click(sel); };
const stars = async (id, n, re = /./) => { const t = await txt(id); check(`${id} finished with ${n} star(s)`, t.includes('⭐'.repeat(n) + '☆'.repeat(3 - n)) && re.test(t), t); };

check('home shows players and a path', await p.locator('#players .ptile').count() === 2 && await p.locator('#path .node').count() > 3);
check('kids cannot add new players from home', await p.locator('#players :text("New player")').count() === 0);

// deck navigation
await p.click('#playBtn'); await wait(300);
const firstCard = await p.evaluate(() => location.hash);
check('Play opens the first unfinished card', firstCard === '#A9', firstCard);
await p.click('#nextBtn'); await wait(200);
check('Next goes forward one card', await p.evaluate(() => location.hash) === '#A6');
await p.click('#prevBtn'); await wait(200);
check('Back goes back one card', await p.evaluate(() => location.hash) === '#A9');
await p.keyboard.press('ArrowRight'); await wait(200);
check('Right arrow key goes forward', await p.evaluate(() => location.hash) === '#A6');
await p.goBack(); await wait(200);
check('Browser back button works', await p.evaluate(() => location.hash) === '#A9');
check('progress bar has one segment per card', await p.locator('#progress .seg').count() === await p.evaluate(() => window.__app.deckFor('young').length));
await open('A1');
check('first card has Back disabled', await p.locator('#prevBtn').isDisabled());

// A1: first try = 3 stars; also checks the real animated hop lands on the carrot
await open('A1');
for (const k of ['up', 'up', 'up', 'right', 'right', 'right']) await p.click(`${C('A1')} [aria-label="Add ${k}"]`);
await p.click(`${C('A1')} .go`); await wait(4500);
const land = await p.evaluate(() => { const b = window.__boards.filter(b => b.el.isConnected).at(-1); const s = b.sprite.getBoundingClientRect(), c = b.cells[3].getBoundingClientRect(); return Math.max(Math.abs(s.left - c.left), Math.abs(s.top - c.top)); });
check('A1 animated hop lands on the carrot square', land <= 1, land.toFixed(2) + 'px');
await stars('A1', 3, /First try/);
check('A1 streak bonus (Pip already had 1 perfect game)', /2 in a row: \+5 bonus/.test(await txt('A1')), await txt('A1'));

// A9: one bump, then success = 2 stars, streak resets
await open('A9');
await p.click(`${C('A9')} [aria-label="Add right"]`); await p.click(`${C('A9')} .go`); await wait(1500);
await p.click(`${R('A9')} button`); await p.click(`${C('A9')} .clear`);
for (const k of ['up', 'up', 'right', 'right', 'right', 'up', 'up', 'right']) await p.click(`${C('A9')} [aria-label="Add ${k}"]`);
await p.click(`${C('A9')} .go`); await wait(4200);
await stars('A9', 2, /2 tries/);
check('A9 no bonus after a miss', !/bonus/.test(await txt('A9')));

await open('A6');
await p.click(`${C('A6')} .watch`); await wait(3900);
for (const m of ['clap', 'wave', 'clap']) await p.click(`${C('A6')} [aria-label="${m}"]`);
await wait(1000); await p.click(`${C('A6')} .watch`); await wait(5000);
for (const m of ['stomp', 'spin', 'wave', 'stomp']) await p.click(`${C('A6')} [aria-label="${m}"]`);
await wait(1000); await stars('A6', 3);

await open('A2');
for (const a of ['🔵', '🐱', '🍇']) { await p.click(`${C('A2')} .choice:has-text("${a}")`); await wait(1000); }
await stars('A2', 3, /2 in a row/);

await open('A3');
for (const a of ['Dig a hole.', 'Plant the seed.', 'Water it.', 'The flower grows!']) await p.click(`${C('A3')} [aria-label="${a}"]`);
await stars('A3', 3, /3 in a row: \+10 bonus/);

await open('A4');
await p.click(`${C('A4')} [aria-label="Add right"]`); await clickN(`${C('A4')} .hslot >> nth=0 >> .plus`, 2);
await p.click(`${C('A4')} [aria-label="Add up"]`); await clickN(`${C('A4')} .hslot >> nth=1 >> .plus`, 3);
await p.click(`${C('A4')} [aria-label="Add right"]`);
await p.click(`${C('A4')} .go`); await wait(4400); await stars('A4', 3);

await open('A5');
for (const it of ['Sunglasses.', 'Umbrella.', 'Scarf.']) await p.click(`${C('A5')} [aria-label="${it}"]`);
await p.click(`${C('A5')} .go`); await wait(3800); await stars('A5', 3);

await open('A7');
await p.click(`${C('A7')} .cell >> nth=10`); await wait(2400); await p.click(`${C('A7')} .cell >> nth=6`); await wait(3600); await p.click(`${C('A7')} .cell >> nth=7`); await wait(3300);
await stars('A7', 3);

// A8 voice: misheard words go through the same parser as the microphone
await open('A8');
const heard = await p.evaluate(() => document.querySelector('#card-A8 .play').__hear('hop up write right'));
check('A8 parser maps "hop up write right"', JSON.stringify(heard) === '["U","R","R"]', JSON.stringify(heard));
await wait(1600);
await p.evaluate(() => document.querySelector('#card-A8 .play').__hear('down'));  // bumps a rock: one mistake
await wait(900);
for (const w of ['up', 'up', 'right']) await p.click(`${C('A8')} .sayword[data-cmd="${{ up: 'U', right: 'R' }[w]}"]`);
await wait(1800); await stars('A8', 2);
check('A8 has a word button for every voice command', await p.locator(`${C('A8')} .sayword`).count() === 4);

await open('B1');
await p.click(`${C('B1')} .loopbtn`); await p.click(`${C('B1')} [aria-label="Add right"]`); await p.click(`${C('B1')} [aria-label="Add up"]`);
await clickN(`${C('B1')} .loop .plus`, 3);
await p.click(`${C('B1')} .go`); await wait(4800); await stars('B1', 3);
await open('B1');
for (let i = 0; i < 7; i++) await p.click(`${C('B1')} [aria-label="Add right"]`);
check('B1 caps the program at 6 blocks', /6 of 6/.test(await p.innerText(`${C('B1')} .counter`)));

await open('B12');
await p.click(`${C('B12')} .loopbtn`); for (const k of ['right', 'right', 'up']) await p.click(`${C('B12')} [aria-label="Add ${k}"]`);
await p.click(`${C('B12')} .loop .plus`);
await p.click(`${C('B12')} .go`); await wait(4400); await stars('B12', 3);

await open('B2');
await p.click(`${C('B2')} .go`); await wait(2800);
check('B2 first crash is free (no star lost)', /There it is/.test(await txt('B2')));
await p.click(`${R('B2')} button`); await clickN(`${C('B2')} .prog .blk >> nth=4`, 3);
await p.click(`${C('B2')} .go`); await wait(4000); await stars('B2', 3);

await open('B4');
await clickN(`${C('B4')} [data-k="stop"] .plus`, 2); await p.click(`${C('B4')} .go`); await wait(3000); await p.click(`${R('B4')} button`);
await p.click(`${C('B4')} [data-k="start"] .plus`); await clickN(`${C('B4')} [data-k="stop"] .plus`, 3); await p.click(`${C('B4')} .chip[data-j="2"]`);
await p.click(`${C('B4')} .go`); await wait(2500); await p.click(`${R('B4')} button`);
await clickN(`${C('B4')} [data-k="start"] .plus`, 3); await clickN(`${C('B4')} [data-k="stop"] .minus`, 7); await p.click(`${C('B4')} .chip[data-j="-1"]`);
await p.click(`${C('B4')} .go`); await wait(3000); await stars('B4', 3);

await open('B8');
await p.click(`${C('B8')} .fnbody`); for (const k of ['up', 'right', 'right', 'down']) await p.click(`${C('B8')} [aria-label="Add ${k}"]`);
// the natural way: fill My block, then tap ⭐ (no need to tap the main program first)
for (const k of ['my block', 'right', 'my block', 'right', 'my block']) await p.click(`${C('B8')} [aria-label="Add ${k}"]`);
check('B8 ⭐ goes to the main program even while My block is selected', await p.locator(`${C('B8')} .prog > .blk`).count() === 5 && await p.locator(`${C('B8')} .fnbody .blk`).count() === 4);
await p.click(`${C('B8')} .go`); await wait(6800); await stars('B8', 3);

await open('B10');
await p.click(`${C('B10')} .loopbtn`); for (const k of ['forward', 'forward', 'turn right']) await p.click(`${C('B10')} [aria-label="Add ${k}"]`);
await clickN(`${C('B10')} .loop .plus`, 2); await p.click(`${C('B10')} .go`); await wait(5200); await p.click(`${R('B10')} button`);
await p.click(`${C('B10')} .loopbtn`); for (const k of ['forward', 'turn right', 'forward', 'turn left']) await p.click(`${C('B10')} [aria-label="Add ${k}"]`);
await p.click(`${C('B10')} .loop .plus`); await p.click(`${C('B10')} .go`); await wait(5200); await stars('B10', 3);

await open('B3');
await p.click(`${C('B3')} .chip:has-text("red")`); await p.click(`${C('B3')} .go`); await wait(2800); await p.click(`${R('B3')} button`);
await p.click(`${C('B3')} .chip:has-text("a star")`); await p.click(`${C('B3')} .go`); await wait(2800); await p.click(`${R('B3')} button`);
await p.click(`${C('B3')} .chip:has-text("blue")`); await p.click(`${C('B3')} .go`); await wait(2800); await stars('B3', 2);

await open('B5');
for (const d of [0, 2, 4, 6, 8]) await p.click(`${C('B5')} .digits .chip >> nth=${d}`);
await p.click(`${C('B5')} .go`); await wait(3400); await stars('B5', 3);

await open('B9');
for (const [a, ms] of [[7, 2600], [13, 3900], [14, 2600]]) { await p.click(`${C('B9')} .choice:text-is("${a}")`); await wait(ms); if (a !== 14) await p.click(`${R('B9')} button`); }
await stars('B9', 3);

await open('B6');
const act = a => p.click(`${C('B6')} [data-act="${a}"]`);
await act('ones'); await act('tens'); await act('read'); await p.click(`${C('B6')} .choice:text-is("68")`); await p.click(`${R('B6')} button`);
await act('ones'); await act('trade'); await act('tens'); await act('read'); await p.click(`${C('B6')} .choice:text-is("62")`); await p.click(`${R('B6')} button`);
await act('ones'); await act('trade'); await act('tens'); await act('read'); await p.click(`${C('B6')} .choice:text-is("84")`);
await stars('B6', 3);

await open('B7');
for (const n of [121, 44, 1221, 7, 3443]) await p.click(`${C('B7')} .tiles .num:text-is("${n}")`);
await p.click(`${C('B7')} .check`); await p.click(`${R('B7')} button`);
await clickN(`${C('B7')} .flipb`, 2); await p.click(`${C('B7')} .stopb`); await p.click(`${R('B7')} button`);
await clickN(`${C('B7')} .flipb`, 3); await p.click(`${C('B7')} .stopb`); await stars('B7', 3);

// B11 voice coding: build F F RT F F LT F F RT F F by "voice", then say go
await open('B11');
const cmds = await p.evaluate(() => document.querySelector('#card-B11 .play').__hear('go forward forward turn write forward four word left forward forward'));
check('B11 parser handles "go forward", "write", "four word"', JSON.stringify(cmds) === '["F","F","RT","F","F","LT","F","F"]', JSON.stringify(cmds));
await p.evaluate(() => document.querySelector('#card-B11 .play').__hear('right forward forward forward undo'));
check('B11 "undo" removes the last block', await p.locator(`${C('B11')} .prog .blk`).count() === 11);
await p.click(`${C('B11')} .sayword[data-cmd="GO"]`); await wait(5600); await stars('B11', 3);


/* ---------- the 16 new games ---------- */
// A10 Squish the Bug
await open('A10');
for (const [bug, fix] of [[2, '🥬'], [1, '☀️'], [3, '👂']]) {
  await p.click(`${C('A10')} .scard >> nth=${bug}`); await p.click(`${C('A10')} .fixes [data-e="${fix}"]`); await wait(1200);
}
await stars('A10', 3);
// A11 Letter Spotter (one wrong tap first, so 2 stars)
await open('A11');
await p.click(`${C('A11')} .ltile >> nth=0`);
for (const idx of [[1, 2], [1, 3, 5], [2, 7, 8]]) { for (const i of idx) await p.click(`${C('A11')} .ltile >> nth=${i}`); await wait(1800); }
await stars('A11', 2);
// A12 Word Glue
await open('A12');
for (const [a, b] of [['sun', 'flower'], ['rain', 'bow'], ['cup', 'cake']]) {
  await p.click(`${C('A12')} .gtile[data-w="${a}"]`); await p.click(`${C('A12')} .gtile[data-w="${b}"]`); await wait(2800);
}
await stars('A12', 3);
await open('A12');
await p.click(`${C('A12')} .gtile[data-w="flower"]`);
check('A12 refuses the wrong word order', await p.locator(`${C('A12')} .gslot.full`).count() === 0);
// A16 Rhyme Monster
await open('A16');
for (let rd = 0; rd < 3; rd++) { for (let k = 0; k < 3; k++) await p.click(`${C('A16')} .ritem[data-r="1"]:not(.fed) >> nth=0`); await wait(2500); }
await stars('A16', 3);
await open('A16'); await p.click(`${C('A16')} .ritem[data-r="0"] >> nth=0`);
check('A16 a non-rhyme is not eaten', await p.locator(`${C('A16')} .ritem.fed`).count() === 0);
// A13 Apple Basket, A14 Monkey Snack
await open('A13');
for (const [t, ans] of [[1500, 5], [1800, 6], [2700, 9]]) { await p.click(`${C('A13')} .sumact`); await wait(t); await p.click(`${C('A13')} .sumopts [data-n="${ans}"]`); await wait(1300); }
await stars('A13', 3);
await open('A14');
for (const [t, ans] of [[1100, 3], [1900, 2], [1500, 5]]) { await p.click(`${C('A14')} .sumact`); await wait(t); await p.click(`${C('A14')} .sumopts [data-n="${ans}"]`); await wait(1300); }
await stars('A14', 3);
// A15 Memory Match: read the cards, flip each pair
await open('A15');
const faces = await p.$$eval('#card-A15 .mcard', els => els.map(e => e.dataset.e));
for (const e of [...new Set(faces)]) { const [i, j] = faces.map((f, k) => f === e ? k : -1).filter(k => k >= 0); await p.click(`${C('A15')} .mcard >> nth=${i}`); await p.click(`${C('A15')} .mcard >> nth=${j}`); }
await stars('A15', 3);
await open('A15');
const f2 = await p.$$eval('#card-A15 .mcard', els => els.map(e => e.dataset.e));
const a0 = f2.indexOf(f2.find(e => f2.indexOf(e) !== f2.lastIndexOf(e))); let b0 = f2.findIndex((e, k) => e !== f2[a0] && k > -1);
await p.click(`${C('A15')} .mcard >> nth=${a0}`); await p.click(`${C('A15')} .mcard >> nth=${b0}`); await wait(1200);
check('A15 a mismatch flips back', await p.locator(`${C('A15')} .mcard.up`).count() === 0);

// B17 Letter Counter
await open('B17');
for (const [n, ms] of [[3, 5200], [4, 5800], [3, 5200]]) { await p.click(`${C('B17')} .lopts [data-n="${n}"]`); await wait(ms); if (n !== 3 || ms !== 5200 || (await txt('B17')).includes('Yes')) { if ((await txt('B17')).includes('Yes,')) await p.click(`${R('B17')} button`); } }
await stars('B17', 3);
// B18 Word Glue Code
await open('B18');
for (const v of ['sunflower', 'Hi Maya', 'cream ice', 'Room 7']) { await p.click(`${C('B18')} .cch[data-v="${v}"]`); await wait(1500); }
await stars('B18', 3);
// B19 Number Hunt
await open('B19');
for (const round of [[4], [5, 8, 10, 9], [7, 11, 13]]) {
  for (const i of round) await p.click(`${C('B19')} .ncard >> nth=${i}`);
  await wait(300); if (round !== undefined && (await txt('B19')).includes('Found it')) await p.click(`${R('B19')} button`);
}
await stars('B19', 3);
await open('B19');
await p.click(`${C('B19')} .ncard >> nth=4`); await p.click(`${R('B19')} button`);
for (let i = 0; i <= 9; i++) await p.click(`${C('B19')} .ncard >> nth=${i}`);
check('B19 too many flips in a sorted round is noticed', /flips/.test(await txt('B19')), await txt('B19'));
// B20 Pet Shelf
await open('B20');
await p.click(`${C('B20')} .abox[data-i="0"]`);   // wrong box first
check('B20 explains zero-based boxes', /start at 0|number zero|first box is 0/i.test(await p.innerText('#card-B20')));
await p.click(`${C('B20')} .abox[data-i="2"]`); await wait(900);
await p.click(`${C('B20')} .apal [data-e="🐸"]`); await p.click(`${C('B20')} .abox[data-i="1"]`); await wait(900);
await p.click(`${C('B20')} .apal [data-e="🦄"]`); await p.click(`${C('B20')} .abox[data-i="4"]`); await wait(900);
await p.click(`${C('B20')} .alen [data-n="5"]`); await wait(1100);
await stars('B20', 2);
// B21 Flip the Grid
await open('B21');
await p.click(`${C('B21')} .tphead[data-c="1"]`);   // column before choosing a row: nudge only
for (const i of [0, 1]) { await p.click(`${C('B21')} .tprow[data-r="${i}"]`); await p.click(`${C('B21')} .tphead[data-c="${i}"]`); }
await p.click(`${C('B21')} .tpcell.d[data-r="2"][data-c="1"]`); await wait(1400);
for (const i of [0, 1, 2]) { await p.click(`${C('B21')} .tprow[data-r="${i}"]`); await p.click(`${C('B21')} .tphead[data-c="${i}"]`); }
await p.click(`${C('B21')} .tpcell.d[data-r="2"][data-c="0"]`); await wait(1400);
await stars('B21', 3);
await open('B21'); await p.click(`${C('B21')} .tprow[data-r="0"]`); await p.click(`${C('B21')} .tphead[data-c="1"]`);
check('B21 a row cannot go into the wrong column', await p.locator(`${C('B21')} .tpcell.d:not(.empty)`).count() === 0);
// B13 Lucky Number: wrong guess first (if possible), then the right number
await open('B13');
const secret = await p.evaluate(() => document.querySelector('#card-B13 .play').__secret());
const v0 = +(await p.innerText(`${C('B13')} .gv`));
if (secret !== v0) { await p.click(`${C('B13')} .guessgo`); check('B13 says higher or lower', /higher|lower/.test(await p.innerText(`${C('B13')} .glog`))); }
let cur = +(await p.innerText(`${C('B13')} .gv`));
while (cur !== secret) { const d = secret - cur; const step = Math.abs(d) >= 5 ? 5 : 1; await p.click(`${C('B13')} [data-d="${d > 0 ? step : -step}"]`); cur += d > 0 ? step : -step; }
await p.click(`${C('B13')} .guessgo`); await stars('B13', 3);
// B14 Random Machine
await open('B14');
const roll3 = async () => { for (let i = 0; i < 3; i++) { await p.click(`${C('B14')} .roll`); await wait(650); } };
await clickN(`${C('B14')} [data-k="max"] .plus`, 3); await roll3();
const vals = await p.$$eval('#card-B14 .rollrow .gchip', els => els.map(e => +e.textContent));
check('B14 rolls stay inside the range', vals.length === 3 && vals.every(v => v >= 1 && v <= 6), vals.join(','));
await p.click(`${C('B14')} .rcheck`); await p.click(`${R('B14')} button`);
await clickN(`${C('B14')} [data-k="max"] .minus`, 2); await roll3(); await p.click(`${C('B14')} .rcheck`); await p.click(`${R('B14')} button`);
await clickN(`${C('B14')} [data-k="min"] .plus`, 2); await clickN(`${C('B14')} [data-k="max"] .minus`, 5); await roll3(); await p.click(`${C('B14')} .rcheck`);
await stars('B14', 3);
await open('B14');
check('B14 Check stays locked until the machine is tested', await p.locator(`${C('B14')} .rcheck`).isDisabled());
// B15 Memory Vault
await open('B15');
for (let rd = 0; rd < 2; rd++) {
  await p.click(`${C('B15')} .vready`); await wait(rd ? 4700 : 3700);
  for (let q = 0; q < 3; q++) { const v = await p.evaluate(() => document.querySelector('#card-B15 .play').__vault()); await p.click(`${C('B15')} .vopts [data-e="${v.items[v.idx]}"]`); await wait(1000); }
  if (rd === 0) await p.click(`${R('B15')} button`);
}
await stars('B15', 3);
// B16 Bug Detective
await open('B16');
for (const [runMs, line, opt] of [[2300, 2, 1], [1600, 1, 1], [2300, 2, 2]]) {
  await p.click(`${C('B16')} .go`); await wait(runMs);
  check(`B16 first run shows the wrong answer`, /✗/.test(await p.innerText(`${C('B16')} .vres`)));
  await p.click(`${C('B16')} .cline[data-i="${line}"]`); await p.click(`${C('B16')} .fixopt[data-k="${opt}"]`);
  await p.click(`${C('B16')} .go`); await wait(runMs);
  if (/Bug fixed/.test(await txt('B16'))) await p.click(`${R('B16')} button`);
}
await stars('B16', 3);


/* ---------- batch 3: 35 more games ---------- */
const clickCells = async (id, n) => { const end = await p.evaluate(id => document.querySelector(`#card-${id} .play`).__end(), id); const W = await p.evaluate(id => window.CH_CATALOG.games.find(g => g.id === id).cfg.board.w, id); await p.click(`${C(id)} .cell >> nth=${end[1] * W + end[0]}`); };
const stepsOf = id => p.evaluate(id => document.querySelectorAll(`#card-${id} .prog .blk, #card-${id} .prog .kloop`).length, id);
// Seed Steps 2-4
for (const [id, order] of [['A17', ['Put toothpaste on the brush.', 'Brush your teeth.', 'Rinse with water.', 'Big clean smile!']], ['A18', ['An egg.', 'The egg cracks.', 'A chick comes out.', 'It grows into a hen.']], ['A19', ['Crack the eggs.', 'Mix it all up.', 'Bake it in the oven.', 'Put on the candles.', 'Party time!']]]) {
  await open(id); for (const a of order) await p.click(`${C(id)} [aria-label="${a}"]`); await stars(id, 3);
}
check('Cake Steps shows 5 boxes in one row', await p.evaluate(() => { const s = [...document.querySelectorAll('#card-A19 .slot')].map(e => Math.round(e.getBoundingClientRect().top)); return s.length === 5 && new Set(s).size === 1; }));
// Squish the Bug 2-3
for (const [id, rounds] of [['A20', [[2, '🚰'], [2, '🫧'], [1, '🪥']]], ['A21', [[2, '🍬'], [2, '💧'], [3, '💦']]]]) {
  await open(id); for (const [bug, fix] of rounds) { await p.click(`${C(id)} .scard >> nth=${bug}`); await p.click(`${C(id)} .fixes [data-e="${fix}"]`); await wait(1200); } await stars(id, 3);
}
// Repeat Drum
await open('A22');
for (const [body, n] of [[['🥁'], 4], [['👏'], 3], [['🥁', '👏'], 3], [['🐸', '🐸', '⭐'], 2]]) {
  for (const e of body) await p.click(`${C('A22')} .licons [data-e="${e}"]`);
  await clickN(`${C('A22')} .loopmaker .plus`, n - 1); await p.click(`${C('A22')} .go`); await wait(body.length * n * 380 + 1100);
}
await stars('A22', 3);
await open('A22'); await p.click(`${C('A22')} .licons [data-e="🥁"]`); await clickN(`${C('A22')} .loopmaker .plus`, 2); await p.click(`${C('A22')} .go`); await wait(1800);
check('Repeat Drum catches a wrong count', /That made 3, not 4/.test(await txt('A22')), await txt('A22'));
// Car Park, Race Track, Hop Hop Hop 2
for (const [id, cards, ms] of [['A23', [['right', 3], ['down', 3]], 3800], ['A24', [['up', 4], ['right', 4], ['down', 1]], 5000], ['A25', [['down', 2], ['right', 3], ['up', 2]], 4500]]) {
  await open(id);
  for (let i = 0; i < cards.length; i++) { await p.click(`${C(id)} [aria-label="Add ${cards[i][0]}"]`); await clickN(`${C(id)} .hslot >> nth=${i} >> .plus`, cards[i][1]); }
  await p.click(`${C(id)} .go`); await wait(ms); await stars(id, 3);
}
// Pattern Train 2-3 (gaps in the middle and at the start)
for (const [id, answers] of [['A26', ['🔵', '🐱', '🌙']], ['A27', ['🟡', '🐟', '🚌']]]) {
  await open(id); for (const a of answers) { await p.click(`${C(id)} .choice:has-text("${a}")`); await wait(1000); } await stars(id, 3);
}
// Where Will It Land 2, Rook, Bishop, Knight; older Robot Steps, Loop Landing, Block Landing
const endsSeen = {};
for (const id of ['A28', 'A29', 'A30', 'A31', 'B22', 'B23', 'B24']) {
  await open(id); endsSeen[id] = [];
  for (let rd = 0; rd < 3; rd++) { const n = await p.evaluate(id => document.querySelector(`#card-${id} .play`).__end(), id); endsSeen[id].push(n.join(',')); const k = await stepsOf(id); await clickCells(id); await wait(400 * (k + 6) + 1500); }
  await stars(id, 3);
}
check('chess pieces land where expected', endsSeen.A29.join(' ') === '4,4 2,1 2,1' && endsSeen.A30.join(' ') === '2,2 4,2 4,2' && endsSeen.A31.join(' ') === '1,2 3,1 1,0', JSON.stringify(endsSeen));
check('turning robot, loops and blocks land where expected', endsSeen.B22.join(' ') === '3,2 2,2 3,2' && endsSeen.B23.join(' ') === '3,1 2,1 2,3' && endsSeen.B24.join(' ') === '5,2 3,0 3,1', JSON.stringify(endsSeen));
check('chess board is checkered', await p.evaluate(() => { location.hash = 'A29'; return true; }) && (await (async () => { await p.waitForSelector('#card-A29 .board.chk'); return p.locator('#card-A29 .cell.dk').count(); })()) === 12);
// Puzzle Path: real drag and drop
await open('A32');
const dragTo = async (id, label, target) => {
  const a = await p.locator(`${C(id)} .dpal .pz[aria-label="${label}"]`).boundingBox(), b = await p.locator(target).boundingBox();
  await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down();
  await p.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 - 10, { steps: 3 });
  await p.mouse.move(b.x + b.width - 8, b.y + b.height / 2, { steps: 8 }); await p.mouse.up();
};
for (const d of ['up', 'up', 'right', 'right', 'right']) await dragTo('A32', d, `${C('A32')} .dstrip`);
check('A32 drag adds pieces to the strip', await p.locator(`${C('A32')} .dstrip .pz`).count() === 5);
// drop an "up" between the 2nd and 3rd piece
{ const a = await p.locator(`${C('A32')} .dpal .pz[aria-label="up"]`).boundingBox(), t = await p.locator(`${C('A32')} .dstrip .pz >> nth=2`).boundingBox();
  await p.mouse.move(a.x + 20, a.y + 20); await p.mouse.down(); await p.mouse.move(a.x + 30, a.y + 10, { steps: 3 }); await p.mouse.move(t.x + 4, t.y + t.height / 2, { steps: 8 }); await p.mouse.up(); }
const order32 = await p.$$eval('#card-A32 .dstrip .pz', els => els.map(e => e.dataset.d).join(''));
check('A32 a piece can be dropped between two others', order32 === 'UUURRR', order32);
// drag the last piece out of the strip, then tap it back on
{ const t = await p.locator(`${C('A32')} .dstrip .pz >> nth=5`).boundingBox(); await p.mouse.move(t.x + 20, t.y + 20); await p.mouse.down(); await p.mouse.move(t.x + 30, t.y - 40, { steps: 3 }); await p.mouse.move(t.x, t.y - 260, { steps: 8 }); await p.mouse.up(); }
check('A32 dragging a piece out removes it', await p.locator(`${C('A32')} .dstrip .pz`).count() === 5);
await p.click(`${C('A32')} .dpal .pz[aria-label="right"]`);
await p.click(`${C('A32')} .go`); await wait(3600); await stars('A32', 3);
// Puzzle Path 2 by tapping pieces along the shortest route
await open('A33');
const route33 = await p.evaluate(() => CH.solvePath(window.CH_CATALOG.games.find(g => g.id === 'A33').cfg.board));
for (const d of route33) await p.click(`${C('A33')} .dpal .pz[data-d="${d}"]`);
await p.click(`${C('A33')} .go`); await wait(400 * route33.length + 1600); await stars('A33', 3);
// Rhyme Monster 2-3
for (const [id, counts] of [['A34', [2, 3, 2, 3]], ['A35', [2, 3, 3]]]) {
  await open(id);
  for (const n of counts) { for (let k = 0; k < n; k++) await p.click(`${C(id)} .ritem[data-r="1"]:not(.fed) >> nth=0`); await wait(2500); }
  await stars(id, 3);
}
// Mirror Words
await open('A36');
for (const same of [true, false, true, false, true, true]) { await p.click(`${C('A36')} .mflip`); await p.click(`${C('A36')} .mans [data-a="${same ? 'yes' : 'no'}"]`); await wait(1200); }
await stars('A36', 3);
// Buddy Pairs
await open('A37');
for (const n of [4, 5, 6, 7]) {
  while (await p.locator(`${C('A37')} .pitem`).count() >= 2) { await p.click(`${C('A37')} .pitem >> nth=0`); await p.click(`${C('A37')} .pitem >> nth=1`); }
  check(`A37 ${n} leaves ${n % 2} alone`, await p.locator(`${C('A37')} .pitem`).count() === n % 2);
  await p.click(`${C('A37')} .pans [data-a="${n % 2 ? 'odd' : 'even'}"]`); await wait(1200);
}
await stars('A37', 3);
// Make-a-Block 2 and 3
for (const [id, fn, main, ms] of [['B25', ['up', 'up', 'right', 'right', 'down', 'down'], ['right', 'my block', 'right', 'right', 'my block', 'right'], 7600], ['B26', ['right', 'right', 'up'], ['my block', 'up', 'my block', 'up', 'my block'], 5600]]) {
  await open(id); await p.click(`${C(id)} .fnbody`); for (const k of fn) await p.click(`${C(id)} [aria-label="Add ${k}"]`);
  await p.click(`${C(id)} .prog`); for (const k of main) await p.click(`${C(id)} [aria-label="Add ${k}"]`);
  await p.click(`${C(id)} .go`); await wait(ms); await stars(id, 3);
}
const noFn = await p.evaluate(() => ['B25', 'B26'].map(id => { const g = window.CH_CATALOG.games.find(x => x.id === id); return CH.solvePath(g.cfg.board).length > g.cfg.max; }));
check('Make-a-Block 2 and 3 cannot be solved without a star block', noFn.every(Boolean), JSON.stringify(noFn));
// Draw Bot 2
await open('B27');
await p.click(`${C('B27')} .loopbtn`); for (const k of ['forward', 'forward', 'turn right', 'forward', 'forward', 'forward', 'turn right']) await p.click(`${C('B27')} [aria-label="Add ${k}"]`);
await p.click(`${C('B27')} .go`); await wait(400 * 14 + 900); check('B27 rectangle', /Next shape/.test(await txt('B27')), await txt('B27')); await p.click(`${R('B27')} button`);
for (const k of ['forward', 'forward', 'forward', 'turn left', 'forward', 'forward']) await p.click(`${C('B27')} [aria-label="Add ${k}"]`);
await p.click(`${C('B27')} .go`); await wait(400 * 6 + 900); check('B27 L shape', /Next shape/.test(await txt('B27')), await txt('B27')); await p.click(`${R('B27')} button`);
for (const k of ['forward', 'turn left', 'forward', 'turn right', 'forward', 'turn left', 'forward', 'turn right', 'forward', 'turn left', 'forward']) await p.click(`${C('B27')} [aria-label="Add ${k}"]`);
await p.click(`${C('B27')} .go`); await wait(400 * 11 + 900); await stars('B27', 3);
// Talk to Draw (voice words go through the same parser as the microphone)
await open('B28');
await p.evaluate(() => document.querySelector('#card-B28 .play').__hear('forward write forward right forward turn right forward go'));
await wait(400 * 7 + 1100); check('B28 voice square', /Next shape/.test(await txt('B28')), await txt('B28')); await p.click(`${R('B28')} button`);
await p.evaluate(() => document.querySelector('#card-B28 .play').__hear('forward right forward lift forward right forward'));
await p.click(`${C('B28')} .sayword[data-cmd="GO"]`); await wait(400 * 7 + 1100); await stars('B28', 3);
// Sorting Machine 2 and 3 (wrong order first in 3: the IF is checked first)
await open('B29');
for (const c of ['yellow', 'a square', 'a circle']) { await p.click(`${C('B29')} .c0 .chip:has-text("${c}")`); await p.click(`${C('B29')} .go`); await wait(3200); if (c !== 'a circle') await p.click(`${R('B29')} button`); }
await stars('B29', 3);
await open('B30');
await p.click(`${C('B30')} .c0 .chip:has-text("red")`); await p.click(`${C('B30')} .c1 .chip:has-text("a star")`); await p.click(`${C('B30')} .go`); await wait(3600);
check('B30 wrong rule order is caught', /wrong basket/.test(await txt('B30')), await txt('B30')); await p.click(`${R('B30')} button`);
for (const [a, b] of [['a star', 'red'], ['blue', 'a circle'], ['a square', 'yellow']]) { await p.click(`${C('B30')} .c0 .chip:has-text("${a}")`); await p.click(`${C('B30')} .c1 .chip:has-text("${b}")`); await p.click(`${C('B30')} .go`); await wait(3600); if (a !== 'a square') await p.click(`${R('B30')} button`); }
await stars('B30', 2);
// Rule detective gates
for (const [id, rounds] of [['B31', [['even', 0], ['odd', 0], ['ends', 5]]], ['B32', [['gt', 0], ['lt', 0], ['gt', 9]]], ['B33', [['mult', 2], ['mult', 1], ['mult', 3]]]]) {
  await open(id);
  for (let i = 0; i < rounds.length; i++) {
    const [t, plus] = rounds[i]; await p.click(`${C(id)} .rtpl [data-t="${t}"]`); await clickN(`${C(id)} .rparam .plus`, plus); await p.click(`${C(id)} .go`); await wait(2200);
    if (i < rounds.length - 1) await p.click(`${R(id)} button`);
  }
  await stars(id, 3);
}
await open('B33'); await p.click(`${C('B33')} .rtpl [data-t="mult"]`); await p.click(`${C('B33')} .go`); await wait(2200);
check('B33 "multiple of 2" is rejected by the NO examples', /examples do not fit|wrong door/.test(await txt('B33')), await txt('B33'));
// Variable Boxes 1-2
for (const [id, answers] of [['B34', [[8, 2400], [16, 3000], [4, 3400]]], ['B35', [[10, 5400], [10, 7200], [3, 4800]]]]) {
  await open(id);
  for (let i = 0; i < answers.length; i++) { await p.click(`${C(id)} .vopts [data-n="${answers[i][0]}"]`); await wait(answers[i][1]); if (i < answers.length - 1) await p.click(`${R(id)} button`); }
  await stars(id, 3);
}
await open('B34'); check('B34 shows a box for every variable', await p.locator(`${C('B34')} .vbox`).count() === 2);
// B4 scale numbers sit on the grid lines
await open('B4');
const axis = await p.evaluate(() => { const t = document.querySelector('#card-B4 .towers').getBoundingClientRect(); const base = t.bottom - 3; return [...document.querySelectorAll('#card-B4 .axis span')].map(s => { const r = s.getBoundingClientRect(); return Math.abs((r.top + r.height / 2) - (base - (+s.textContent) * 16)); }); });
check('B4 scale numbers line up with the grid lines', axis.length === 9 && Math.max(...axis) <= 1.5, axis.map(v => v.toFixed(1)).join(','));

/* solution key on every card */
const ALL = await p.evaluate(() => window.CH_CATALOG.games.map(g => g.id));
const cat = await p.evaluate(() => window.CH_CATALOG.games.map(g => ({ id: g.id, goal: g.goal, steps: g.steps, how: g.how })));
check('every game has a goal and 2+ steps, no old paragraph text', cat.length === ALL.length && cat.every(g => g.goal && g.steps.length >= 2 && !g.how), `${cat.length} games`);
const noKey = [];
for (const id of ALL) {
  await open(id);
  check(`${id} hides the solution until 2 wrong tries`, await p.locator(`#card-${id} .stuck`).isHidden());
  await p.evaluate(id => { document.querySelector(`#card-${id} .stuck`).hidden = false; }, id);
  await p.click(`#card-${id} .stuck`);
  const k = (await p.locator(`#card-${id} .keybox`).innerText()).trim();
  if (k.length < 25) noKey.push(id + ': ' + k);
}
check(`solution key explains every one of ${ALL.length} cards`, noKey.length === 0, noKey.join(' | '));
// for cards where the key loads the answer, pressing Go must then succeed
for (const [id, ms, re] of [['A1', 3200, /With the solution key/], ['A9', 4200, /With the solution key/], ['A4', 4400, /With the solution key/], ['A5', 3800, /With the solution key/],
  ['B1', 4800, /With the solution key/], ['B12', 4400, /With the solution key/], ['B8', 6800, /With the solution key/], ['B2', 4000, /With the solution key/],
  ['B4', 3000, /Perfect skyline/], ['B10', 5200, /Next shape/], ['B3', 2800, /Sorted/], ['B5', 3400, /With the solution key/]]) {
  await open(id);
  await p.evaluate(id => { document.querySelector(`#card-${id} .stuck`).hidden = false; }, id);
  await p.click(`#card-${id} .stuck`); await p.click(`${C(id)} .go`); await wait(ms);
  const t = await txt(id);
  check(`${id} solution key works when run`, re.test(t) && (!/With the solution key/.test(t) || t.includes('⭐☆☆')), t);
}
await open('B11');
await p.evaluate(() => { document.querySelector('#card-B11 .stuck').hidden = false; });
await p.click('#card-B11 .stuck'); await p.click(`${C('B11')} .sayword[data-cmd="GO"]`); await wait(6000);
check('B11 solution key works when run', /With the solution key/.test(await txt('B11')), await txt('B11'));
// mirror round 1 key must update the game's own selection
await open('B7');
await p.evaluate(() => { document.querySelector('#card-B7 .stuck').hidden = false; });
await p.click('#card-B7 .stuck'); await p.click(`${C('B7')} .check`);
check('B7 solution key selection passes Check', /Found them all/.test(await txt('B7')), await txt('B7'));
// solution offered after 2 real mistakes
await open('A2');
await p.click(`${C('A2')} .choice:has-text("🟢")`); await p.click(`${C('A2')} .choice:has-text("🔴")`);
check('A2 offers the solution after 2 wrong tries', await p.locator('#card-A2 .stuck').isVisible());
/* visuals */
await p.setViewportSize({ width: 360, height: 780 });
await open('A2');
const tops = await p.evaluate(() => [...document.querySelectorAll('#card-A2 .train > *')].map(e => Math.round(e.getBoundingClientRect().bottom)));
check('A2 train stays on one row at 360px', new Set(tops).size === 1 && tops.length === 7, tops.join(','));
await open('B4');
check('B4 towers have grid lines and a 1–9 scale', /repeating-linear-gradient/.test(await p.evaluate(() => getComputedStyle(document.querySelector('#card-B4 .towers')).backgroundImage)) && await p.locator('#card-B4 .axis span').count() === 9);
await p.setViewportSize({ width: 390, height: 844 });

const who = await p.innerText('#whoBtn');
check('stars and XP saved to Pip', /Pip/.test(who) && +who.match(/⭐ (\d+)/)[1] > 300, who.replace(/\s+/g, ' '));
check('no script errors', errors.length === 0, errors.join(' | '));
const misses = await p.evaluate(() => [...CH.voiceMisses]);
check('every line the app tried to speak has a recording', misses.length === 0, misses.join(' | '));

/* 3. profiles: kids edit name + avatar */
await p.evaluate(() => { location.hash = 'home'; }); await wait(300);
await p.click('#players .ptile >> nth=0 >> .pedit');
await p.fill('#editName', 'Juno'); await p.click('#eSave');
check('duplicate name is refused', /already has that name/.test(await p.innerText('#editErr')));
await p.fill('#editName', 'Pippa'); await p.click('[data-av="🦄"]'); await p.click('#eSave');
check('kid renames self and changes avatar', /🦄\s*Pippa/.test(await p.innerText('#whoBtn')), (await p.innerText('#whoBtn')).replace(/\s+/g, ' '));

/* 4. per-kid timer + PIN */
const pin = async d => { for (const k of d) await p.click(`#sheet .keypad [data-k="${k}"]`); await wait(400); };
await p.click('#parentBtn');
check('first visit asks a grown-up to create a PIN', /Create a grown-up PIN/.test(await p.innerText('#sheet')));
await pin('2468'); await pin('2468');
check('settings list both kids', await p.locator('#kidRows .kidrow').count() === 2);
await p.fill('#newName', 'Kai'); await p.click('#addKid');
check('grown-up can add a player', await p.locator('#kidRows .kidrow').count() === 3);
await p.click('#kidRows .kidrow >> nth=2 >> .remove'); await p.click('#kidRows .kidrow >> nth=2 >> .remove');
check('grown-up can remove a player (two taps)', await p.locator('#kidRows .kidrow').count() === 2);
await p.click('#limOpts [data-m="demo"]'); await p.click('#sDone');
await open('A1');
await wait(31500);
check('Pippa: time up shows "Last game!" without locking mid-game', /Last game/.test(await p.innerText('#timer')) && await p.locator('#modal').isHidden());
for (const k of ['up', 'up', 'up', 'right', 'right', 'right']) await p.click(`${C('A1')} [aria-label="Add ${k}"]`);
await p.click(`${C('A1')} .go`); await wait(3400);
check('finishing the game offers only "Finish"', /last game for now/.test(await txt('A1')) && await p.locator(`${R('A1')} button`).count() === 1);
await p.click(`${R('A1')} button`); await wait(400);
check('Pippa locks after the last game', await p.locator('#modal').isVisible() && /Time for a break, Pippa/.test(await p.innerText('#sheet')));
await p.reload(); await wait(600);
check('lock survives a reload', await p.locator('#modal').isVisible());
await p.click('#mExtra'); await wait(200);
await p.click('#players .ptile >> nth=1 >> .pselect'); await wait(300);
check('Juno can still play with her own time', await p.locator('#modal').isHidden() && /0:(30|29|28)/.test(await p.innerText('#timer')) && await p.locator('#playBtn').isEnabled(), await p.innerText('#timer'));
await p.click('#players .ptile >> nth=0 >> .pselect'); await wait(300);
check('choosing locked Pippa asks for the PIN', /Time for a break, Pippa/.test(await p.innerText('#sheet')));
await pin('1111');
check('wrong PIN is refused', /not right/.test(await p.innerText('#sheet')));
await pin('2468');
check('right PIN unlocks Pippa with a fresh timer', await p.locator('#modal').isHidden() && /0:(30|29)/.test(await p.innerText('#timer')), await p.innerText('#timer'));


/* 5. progress survives updates: a save from the previous release, then a release with an extra game */
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const q = await ctx.newPage();
const qerr = []; q.on('pageerror', e => qerr.push(e.message));
await q.goto(PAGE);
await q.evaluate(() => localStorage.setItem('code-hoppers-v3', JSON.stringify({ current: 'Pippa', profiles: [
  { name: 'Pippa', avatar: '🦄', age: 'young', xp: 123, streak: 4, last: null, combo: 2, done: { A1: 3, A2: 2, ZZ9: 3 }, badges: ['future-field'], time: { left: 600, locked: false, overtime: false, graceEnd: null } },
  { name: 'Juno', avatar: '🦊', age: 'older', xp: 77, streak: 1, last: null, combo: 0, done: { B1: 3 } }], settings: { limitMin: 15, demo: false, pin: null, sfx: true } })));
await q.reload(); await q.waitForSelector('#hello');
const hdr = async pg => (await pg.innerText('#whoBtn')).replace(/\s+/g, ' ');
check('old save keeps name, avatar and points', /🦄 Pippa ⭐ 123/.test(await hdr(q)), await hdr(q));
check('old save keeps stars on finished games', /Bunny Hop\s*⭐⭐⭐/.test((await q.innerText('#path')).replace(/\n/g, ' ')) && /Pattern Train\s*⭐⭐/.test((await q.innerText('#path')).replace(/\n/g, ' ')));
const youngNew = await q.evaluate(() => window.__app.deckFor('young').filter(g => !['A1', 'A9', 'A6', 'A2', 'A3', 'A4', 'A5', 'A7', 'A8'].includes(g.id)).length);
check(`all ${youngNew} newer ages 4–6 games are marked NEW`, await q.locator('#path .newbadge').count() === youngNew && new RegExp(youngNew + ' new games').test(await q.innerText('#hello')), `${await q.locator('#path .newbadge').count()} badges`);
await q.click('#playBtn'); await q.waitForSelector('#card-A11');
check('Play goes straight to a new game', await q.evaluate(() => location.hash) === '#A11');
await q.evaluate(() => { location.hash = 'home'; }); await q.waitForSelector('#home:not([hidden])');
check('a game stops being NEW once opened', await q.locator('#path .newbadge').count() === youngNew - 1);
check('points are unchanged by browsing', /⭐ 123/.test(await hdr(q)));
// next release adds a game to the catalog
const q2 = await ctx.newPage();
const q2err = []; q2.on('pageerror', e => q2err.push(e.message));
await q2.addInitScript(() => {
  Object.defineProperty(window, 'CH_CATALOG', { configurable: true, get() { return undefined; }, set(v) {
    v.games.push({ ...v.games[0], id: 'Z1', title: 'Bunny Hop 3', unit: 0 });
    Object.defineProperty(window, 'CH_CATALOG', { value: v, writable: true, configurable: true });
  } });
});
await q2.goto(PAGE); await q2.waitForSelector('#hello');
check('after an update the points are still there', /🦄 Pippa ⭐ 123/.test(await hdr(q2)), await hdr(q2));
check('after an update the new game appears marked NEW', /Bunny Hop 3/.test(await q2.innerText('#path')) && await q2.locator('#path .newbadge').count() === youngNew);
check('after an update the finished games keep their stars', /Bunny Hop\s*⭐⭐⭐/.test((await q2.innerText('#path')).replace(/\n/g, ' ')));
check('the deck grew by one card', await q2.evaluate(() => window.__app.deckFor('young').length) === await q.evaluate(() => window.__app.deckFor('young').length) + 1);
const saved = await q2.evaluate(() => JSON.parse(localStorage.getItem('code-hoppers-v3')));
check('the save keeps unknown fields and finished games that are no longer in the catalog', saved.profiles[0].badges?.[0] === 'future-field' && saved.profiles[0].done.ZZ9 === 3 && saved.known.includes('Z1') && saved.v === 4, JSON.stringify(saved.profiles[0].done));
await q2.close();
// the main copy gets damaged: the backup copy is used
await q.evaluate(() => localStorage.setItem('code-hoppers-v3', '{oops, not json'));
await q.reload(); await q.waitForSelector('#hello');
check('a damaged save falls back to the backup copy', /🦄 Pippa ⭐ 123/.test(await hdr(q)), await hdr(q));
// grown-up backup and restore
const qpin = async d => { for (const k of d) await q.click(`#sheet .keypad [data-k="${k}"]`); await q.waitForTimeout(400); };
await q.click('#parentBtn'); await qpin('2468'); await qpin('2468');
await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
await q.click('#bkCopy'); await q.waitForTimeout(300);
const copied = await q.innerText('#bkCopy'); const shown = await q.inputValue('#bkText').catch(() => '');
check('Copy backup works (or shows the text to copy)', /Copied/.test(copied) || /"profiles"/.test(shown), copied);
const backupText = await q.evaluate(() => { const j = JSON.parse(localStorage.getItem('code-hoppers-v3')); j.profiles[0].xp = 999; j.settings.pin = null; return JSON.stringify(j); });
await q.click('#bkShow'); await q.fill('#bkText', 'garbage'); await q.click('#bkGo');
check('restore refuses text that is not a backup', /does not look like a backup/.test(await q.innerText('#bkErr')));
await q.fill('#bkText', backupText); await q.click('#bkGo');
check('restore asks for a second tap', /Tap again to confirm/.test(await q.innerText('#bkErr')));
await q.click('#bkGo'); await q.waitForTimeout(300);
check('restore brings the saved points back', /⭐ 999/.test(await hdr(q)), await hdr(q));
check('restore keeps this phone\'s grown-up PIN', await q.evaluate(() => !!JSON.parse(localStorage.getItem('code-hoppers-v3')).settings.pin));
check('no script errors in the update tests', qerr.length === 0 && q2err.length === 0, qerr.concat(q2err).join(' | '));
await ctx.close();

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
