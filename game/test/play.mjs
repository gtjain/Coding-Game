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
const open = id => p.evaluate(id => { location.hash = id; }, id).then(() => p.waitForSelector(`#card-${id}`));
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
check('progress bar has one segment per card', await p.locator('#progress .seg').count() === 9);
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

/* solution key on every card */
const ALL = ['A1', 'A9', 'A6', 'A2', 'A3', 'A4', 'A5', 'A7', 'A8', 'B1', 'B12', 'B2', 'B4', 'B8', 'B10', 'B3', 'B5', 'B9', 'B6', 'B7', 'B11'];
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

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
