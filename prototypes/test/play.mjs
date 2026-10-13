// End-to-end checks for prototypes/index.html.
// Run: PW=/path/to/playwright/index.mjs node prototypes/test/play.mjs
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const { chromium } = await import(process.env.PW || 'playwright');

const PAGE = 'file://' + path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../index.html');
let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

const browser = await chromium.launch();

/* 1. Sprite lands exactly on each square, every board, three widths */
for (const [W, H] of [[360, 780], [768, 1000], [1280, 900]]) {
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  await p.goto(PAGE);
  await p.addStyleTag({ content: '.sprite{transition:none!important}' });
  for (const tab of ['young', 'older']) {
    await p.click(`.tabs [data-tab="${tab}"]`);
    const res = await p.evaluate(() => window.__boards.filter(b => b.el.isConnected && b.el.offsetParent).map(b => {
      let worst = 0;
      const hs = b.cells.map(c => c.getBoundingClientRect().height);
      const rowSpread = Math.max(...hs) - Math.min(...hs);
      for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
        if (b.blocked(x, y)) continue;
        b.place(x, y);
        const s = b.sprite.getBoundingClientRect(), c = b.cells[y * b.w + x].getBoundingClientRect();
        worst = Math.max(worst, Math.abs(s.left - c.left), Math.abs(s.top - c.top), Math.abs(s.width - c.width), Math.abs(s.height - c.height));
      }
      const br = b.el.getBoundingClientRect(), last = b.cells[b.cells.length - 1].getBoundingClientRect();
      const overflow = Math.max(0, last.bottom - (br.bottom - 3));
      b.reset();
      return { id: b.el.closest('.game').id, worst: +worst.toFixed(2), rowSpread: +rowSpread.toFixed(2), overflow: +overflow.toFixed(2), cell: +b.cells[0].getBoundingClientRect().width.toFixed(1) };
    }));
    check(`boards visible on ${tab} tab @${W}px`, res.length >= 3, `${res.length} boards`);
    for (const r of res) check(`align ${r.id} @${W}px`, r.cell >= 28 && r.worst <= 1 && r.rowSpread <= 1 && r.overflow <= 1, `square ${r.cell}px, offset ${r.worst}px, row spread ${r.rowSpread}px, overflow ${r.overflow}px`);
  }
  const hscroll = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check(`no sideways scroll @${W}px`, !hscroll);
  await p.close();
}

/* 2. Play every game to a win (phone width) */
const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
p.on('pageerror', e => errors.push(e.message));
p.on('console', m => m.type() === 'error' && errors.push(m.text()));
await p.goto(PAGE);
const tab = t => p.click(`.tabs [data-tab="${t}"]`);
const res = id => p.locator(`#${id} .result`);
const resText = async id => (await res(id).isVisible()) ? (await res(id).innerText()).replace(/\s+/g, ' ') : '(no result)';
const win = async (id, re) => { const t = await resText(id); check(`play ${id}`, re.test(t), t); };
const clickN = async (sel, n) => { for (let i = 0; i < n; i++) await p.click(sel); };
const wait = ms => p.waitForTimeout(ms);

await tab('young');
// A1: also checks the real animated hop ends exactly on the carrot
for (const k of ['up', 'up', 'up', 'right', 'right', 'right']) await p.click(`#A1 .palette [aria-label="Add ${k}"]`);
await p.click('#A1 .go'); await wait(4500);   // let the win hop animation finish
const land = await p.evaluate(() => { const b = window.__boards.find(b => b.el.closest('#A1')); const s = b.sprite.getBoundingClientRect(), c = b.cells[3].getBoundingClientRect(); return Math.max(Math.abs(s.left - c.left), Math.abs(s.top - c.top)); });
check('A1 animated hop lands on the carrot square', land <= 1, `${land.toFixed(2)}px`);
await win('A1', /You did it/);

await p.click('#A6 .watch'); await wait(3500);
for (const m of ['clap', 'wave', 'clap']) await p.click(`#A6 .moves [aria-label="${m}"]`);
await wait(1000);
await p.click('#A6 .watch'); await wait(4500);
for (const m of ['stomp', 'spin', 'wave', 'stomp']) await p.click(`#A6 .moves [aria-label="${m}"]`);
await wait(1000); await win('A6', /dancer/);

for (const a of ['🔵', '🐱', '🍇']) { await p.click(`#A2 .choice:has-text("${a}")`); await wait(1000); }
await win('A2', /All aboard/);

for (const a of ['dig a hole', 'plant the seed', 'water it', 'flower grows']) await p.click(`#A3 .pcard[aria-label="${a}"]`);
await win('A3', /flower grew/);

await p.click('#A4 .palette [aria-label="Add right"]'); await clickN('#A4 .hslot >> nth=0 >> .plus', 2);
await p.click('#A4 .palette [aria-label="Add up"]'); await clickN('#A4 .hslot >> nth=1 >> .plus', 3);
await p.click('#A4 .palette [aria-label="Add right"]');
await p.click('#A4 .go'); await wait(4200); await win('A4', /hooray/);

for (const it of ['sunglasses', 'umbrella', 'scarf']) await p.click(`#A5 .items [aria-label="${it}"]`);
await p.click('#A5 .go'); await wait(3700); await win('A5', /Snug bear/);

const a7cell = i => p.click(`#A7 .cell >> nth=${i}`);
await a7cell(0); await wait(1600);
check('A7 wrong guess is caught', /green square/.test(await resText('A7')));
await p.click('#A7 .result button');
await a7cell(10); await wait(2400); await a7cell(6); await wait(3600); await a7cell(7); await wait(3200);
await win('A7', /read code/);

await tab('older');
await p.click('#B1 .loopbtn'); await p.click('#B1 .palette [aria-label="Add right"]'); await p.click('#B1 .palette [aria-label="Add up"]');
await clickN('#B1 .loop .plus', 3);
await p.click('#B1 .go'); await wait(4800); await win('B1', /Made it.*3 blocks/);

await p.click('#B2 .go'); await wait(2800);
check('B2 first run shows the crash', /There it is/.test(await resText('B2')));
await p.click('#B2 .result button');
await clickN('#B2 .prog .blk >> nth=4', 3);
await p.click('#B2 .go'); await wait(4000); await win('B2', /squashed/);

await clickN('#B4 [data-k="stop"] .plus', 2);
await p.click('#B4 .go'); await wait(3000);
check('B4 skyline 1', /Perfect/.test(await resText('B4')), await resText('B4')); await p.click('#B4 .result button');
await p.click('#B4 [data-k="start"] .plus'); await clickN('#B4 [data-k="stop"] .plus', 3); await p.click('#B4 .chip[data-j="2"]');
await p.click('#B4 .go'); await wait(2500);
check('B4 skyline 2 (count by 2)', /Perfect/.test(await resText('B4')), await resText('B4')); await p.click('#B4 .result button');
await clickN('#B4 [data-k="start"] .plus', 3); await clickN('#B4 [data-k="stop"] .minus', 7); await p.click('#B4 .chip[data-j="-1"]');
await p.click('#B4 .go'); await wait(3000); await win('B4', /champion/);

await p.click('#B8 .fnbody');
for (const k of ['up', 'right', 'right', 'down']) await p.click(`#B8 .palette [aria-label="Add ${k}"]`);
await p.click('#B8 .prog');
for (const k of ['my block', 'right', 'my block', 'right', 'my block']) await p.click(`#B8 .palette [aria-label="Add ${k}"]`);
await p.click('#B8 .go'); await wait(6800); await win('B8', /Finish line.*9 blocks/);

await p.click('#B10 .loopbtn');
for (const k of ['forward', 'forward', 'turn right']) await p.click(`#B10 .palette [aria-label="Add ${k}"]`);
await clickN('#B10 .loop .plus', 2);
await p.click('#B10 .go'); await wait(5200);
check('B10 square', /Masterpiece.*4 blocks/.test(await resText('B10')), await resText('B10'));
await p.click('#B10 .result button');
await p.click('#B10 .loopbtn');
for (const k of ['forward', 'turn right', 'forward', 'turn left']) await p.click(`#B10 .palette [aria-label="Add ${k}"]`);
await p.click('#B10 .loop .plus');
await p.click('#B10 .go'); await wait(5200); await win('B10', /Masterpiece.*5 blocks/);

await p.click('#B3 .chip:has-text("red")'); await p.click('#B3 .go'); await wait(2800);
check('B3 wrong rule is caught', /wrong basket/.test(await resText('B3')));
await p.click('#B3 .result button'); await p.click('#B3 .chip:has-text("a star")'); await p.click('#B3 .go'); await wait(2800);
await p.click('#B3 .result button'); await p.click('#B3 .chip:has-text("blue")'); await p.click('#B3 .go'); await wait(2800);
await win('B3', /Machine master/);

for (const d of [0, 2, 4, 6]) await p.click(`#B5 .digits .chip >> nth=${d}`);
await p.click('#B5 .go'); await wait(3400);
check('B5 missing digit 8 is caught', /wrong door/.test(await resText('B5')), await resText('B5'));
await p.click('#B5 .result button'); await p.click('#B5 .digits .chip >> nth=8');
await p.click('#B5 .go'); await wait(3400); await win('B5', /Gate works/);

for (const [ans, ms] of [[7, 2600], [13, 3900], [14, 2600]]) {
  await p.click(`#B9 .choice:has-text("${ans}")`); await wait(ms);
  if (ans !== 14) { check(`B9 predicts ${ans}`, /Yes/.test(await resText('B9')), await resText('B9')); await p.click('#B9 .result button'); }
}
await win('B9', /Jar genius/);

const act = a => p.click(`#B6 [data-act="${a}"]`);
await act('ones'); await act('tens'); await act('read'); await p.click('#B6 .choice:has-text("68")');
await p.click('#B6 .result button');
await act('ones'); await act('tens'); await act('read');
check('B6 blocks reading 12 ones', /at most 9/.test(await resText('B6')), await resText('B6'));
await p.click('#B6 .result button');
await act('trade'); await act('read'); await p.click('#B6 .choice:text-is("62")');
await p.click('#B6 .result button');
await act('ones'); await act('trade'); await act('tens'); await act('read'); await p.click('#B6 .choice:text-is("84")');
await win('B6', /Adding machine/);

for (const n of [121, 44, 1221, 7, 3443]) await p.click(`#B7 .tiles .num:text-is("${n}")`);
await p.click('#B7 .mstage .go'); await p.click('#B7 .result button');
await p.click('#B7 .flipb'); await p.click('#B7 .flipb');
check('B7 57 → 363', (await p.innerText('#B7 .bignum')) === '363');
await p.click('#B7 .stopb'); await p.click('#B7 .result button');
await clickN('#B7 .flipb', 3);
check('B7 68 → 1111', (await p.innerText('#B7 .bignum')) === '1111');
await p.click('#B7 .stopb'); await win('B7', /Mirror master/);

const xp = await p.innerText('#whoBtn');
check('XP saved to the selected player', /Pip/.test(xp) && /⭐ (\d+)/.test(xp) && +xp.match(/⭐ (\d+)/)[1] > 20, xp.replace(/\s+/g, ' '));
check('no script errors', errors.length === 0, errors.join(' | '));

/* 3. Time limit, finish-the-game grace, PIN lock */
const pin = async d => { for (const k of d) await p.click(`#sheet .keypad [data-k="${k}"]`); await wait(400); };
await p.click('#parentBtn');
check('first visit asks a grown-up to create a PIN', /Create a grown-up PIN/.test(await p.innerText('#sheet')));
await pin('2468'); await pin('2468');
check('settings open after PIN is created', /Grown-up settings/.test(await p.innerText('#sheet')));
await p.click('#limOpts [data-m="demo"]'); await p.click('#sDone');
check('timer shows 30 s demo limit', /0:(30|29|28)/.test(await p.innerText('#timer')), await p.innerText('#timer'));
await tab('young');
await p.click('#A1 .result button');   // start a fresh A1 round
await wait(31500);
check('time up: "Last game!" shown, not locked yet', /Last game/.test(await p.innerText('#timer')) && await p.locator('#modal').isHidden());
for (const k of ['up', 'up', 'up', 'right', 'right', 'right']) await p.click(`#A1 .palette [aria-label="Add ${k}"]`);
await p.click('#A1 .go'); await wait(3200);
check('finishing the game offers "Finish"', /Finish/.test(await resText('A1')), await resText('A1'));
await p.click('#A1 .result button'); await wait(300);
check('app locks after the last game', await p.locator('#modal').isVisible() && /Time for a break/.test(await p.innerText('#sheet')));
await p.reload(); await wait(500);
check('lock survives a page reload', await p.locator('#modal').isVisible());
await pin('1111');
check('wrong PIN is refused', /not right/.test(await p.innerText('#sheet')) && await p.locator('#modal').isVisible());
await pin('2468');
check('right PIN unlocks with a fresh timer', await p.locator('#modal').isHidden() && /0:(30|29)/.test(await p.innerText('#timer')), await p.innerText('#timer'));

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
