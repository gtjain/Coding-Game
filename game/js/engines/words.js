/* Engines for ages 4–6: bugs, letters, gluing words, sums, memory, rhymes.
   Each engine: (root, cfg, g) => { solve(), unmount?() }. See young.js for the g API. */
(function (CH) {
  const { $, $$, sleep, shake, pop, h, LINES } = CH;
  CH.shuffle = CH.shuffle || (a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; });

  /* Find the step that does not belong, then pick the fix (Squish the Bug) */
  CH.engine('bugSteps', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><p class="rtitle"></p><div class="stepsrow"></div><p class="prompt"></p><div class="choices fixes" hidden></div>`;
    const row = $('.stepsrow', root), prompt = $('.prompt', root), fixes = $('.fixes', root), cards = [];
    let r = 0, phase = 'find', busy = false;
    function setup() {
      const R = cfg.rounds[r]; phase = 'find'; busy = false; cards.length = 0;
      CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      $('.rtitle', root).textContent = '🤖 ' + R.title;
      row.innerHTML = '';
      R.steps.forEach((e, i) => {
        const c = h(`<button type="button" class="scard" aria-label="Step ${i + 1}"><b>${i + 1}</b><span>${e}</span></button>`);
        c.onclick = () => tapStep(i, c); cards.push(c); row.appendChild(c);
        if (i < R.steps.length - 1) row.appendChild(h('<span class="sarrow" aria-hidden="true">→</span>'));
      });
      fixes.hidden = true; fixes.innerHTML = '';
      prompt.textContent = 'Tap the step that does not belong. That is the bug!';
      g.say(R.say);
    }
    function tapStep(i, c) {
      const R = cfg.rounds[r];
      if (phase !== 'find' || busy) return;
      if (i !== R.bug) { g.mistake(); shake(c); g.say(LINES.tryAgain); return; }
      phase = 'fix'; CH.sfx.pop(1.5);
      $('span', c).textContent = '🐛'; c.classList.add('bug');
      prompt.textContent = 'Squish! You found the bug. Which picture fixes it?';
      g.say(LINES.bugFound);
      fixes.hidden = false; fixes.innerHTML = '';
      R.opts.forEach(o => { const b = h(`<button type="button" class="choice" data-e="${o}">${o}</button>`); b.onclick = () => tapFix(o, b); fixes.appendChild(b); });
    }
    async function tapFix(o, b) {
      const R = cfg.rounds[r];
      if (phase !== 'fix' || busy) return;
      if (o !== R.fix) { g.mistake(); shake(b); g.say(LINES.tryAgain); return; }
      busy = true;
      const c = cards[R.bug]; $('span', c).textContent = o; c.classList.remove('bug'); c.classList.add('fixed'); pop(c);
      g.say(LINES.yes); await sleep(900); busy = false; r++;
      if (r < cfg.rounds.length) setup(); else { CH.dotsBar($('.dots', root), cfg.rounds.length, r); g.finish({ title: 'Bug squished!' }); }
    }
    setup();
    return { solve() {
      const R = cfg.rounds[r];
      if (phase === 'find') { cards[R.bug].classList.add('hint'); return `The bug is step <b>${R.bug + 1}</b>: <span class="kbig">${R.steps[R.bug]}</span> It does not belong. Tap the glowing card.`; }
      $$('.choice', fixes).forEach(b => b.classList.toggle('hint', b.dataset.e === R.fix));
      return `Tap the glowing picture <span class="kbig">${R.fix}</span> to fix the bug.`;
    } };
  });

  /* Tap every copy of a letter in a word (Letter Spotter) */
  CH.engine('letterTap', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><div class="lgoal"><span class="lbig"></span><span class="ltext">Tap every one in the word!</span></div><div class="wordtiles"></div><div class="lfound" aria-live="polite"></div>`;
    const tiles = $('.wordtiles', root), foundEl = $('.lfound', root);
    let r = 0, found = 0, total = 0, busy = false;
    function setup() {
      const R = cfg.rounds[r]; busy = false; found = 0;
      total = [...R.word].filter(c => c === R.letter).length;
      CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      $('.lbig', root).textContent = R.letter.toUpperCase() + ' ' + R.letter;
      tiles.innerHTML = '';
      [...R.word].forEach((c, i) => {
        const b = h(`<button type="button" class="ltile" data-c="${c}" aria-label="Letter ${c.toUpperCase()}">${c}</button>`);
        b.onclick = () => tap(c, b); tiles.appendChild(b);
      });
      foundEl.textContent = 'Found: 0';
      g.say(R.say);
    }
    async function tap(c, b) {
      const R = cfg.rounds[r];
      if (busy || b.classList.contains('hit')) return;
      if (c !== R.letter) { g.mistake(); shake(b); g.say(LINES.tryAgain); return; }
      found++; b.classList.add('hit'); b.innerHTML = `${c}<i>${found}</i>`; pop(b); CH.sfx.pop(.9 + found * .12);
      foundEl.textContent = `Found: ${found}`;
      if (found === total) {
        busy = true; foundEl.innerHTML = `<b>${total}</b> ${R.letter.toUpperCase()}${total > 1 ? "'s" : ''} in ${R.word}!`;
        g.say(LINES.yes); await sleep(1500); busy = false; r++;
        if (r < cfg.rounds.length) setup(); else { CH.dotsBar($('.dots', root), cfg.rounds.length, r); g.finish({ title: 'Super speller!' }); }
      }
    }
    setup();
    return { solve() { const R = cfg.rounds[r]; $$('.ltile', tiles).forEach(b => { if (b.dataset.c === R.letter && !b.classList.contains('hit')) b.classList.add('hint'); });
      return `There are <b>${total}</b> ${R.letter.toUpperCase()}'s in <b>${R.word}</b>. Tap the glowing letters.`; } };
  });

  /* Tap word pieces in order to glue them (Word Glue) */
  CH.engine('glue', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><div class="gluepic"></div><div class="glueslots"></div><div class="choices gluetiles"></div><p class="prompt">Tap the words in order to glue them together.</p>`;
    const slotsEl = $('.glueslots', root), tilesEl = $('.gluetiles', root);
    let r = 0, filled = 0, busy = false;
    function setup() {
      const R = cfg.rounds[r]; filled = 0; busy = false;
      CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      $('.gluepic', root).innerHTML = `<span class="gp">${R.pic}</span><span class="gw">${R.word}</span>`;
      slotsEl.className = 'glueslots';
      slotsEl.innerHTML = R.parts.map((_, i) => `<span class="gslot" data-i="${i}">?</span>`).join('<span class="gplus">+</span>');
      tilesEl.innerHTML = '';
      R.tiles.forEach(w => { const b = h(`<button type="button" class="choice gtile" data-w="${w}">${w}</button>`); b.onclick = () => tap(w, b); tilesEl.appendChild(b); });
      g.say(R.say);
    }
    async function tap(w, b) {
      const R = cfg.rounds[r];
      if (busy || b.disabled) return;
      g.say(w);
      if (w !== R.parts[filled]) { g.mistake(); shake(b); return; }
      const slot = $$('.gslot', slotsEl)[filled]; slot.textContent = w; slot.classList.add('full'); pop(slot);
      b.disabled = true; filled++;
      if (filled === R.parts.length) {
        busy = true; await sleep(500);
        slotsEl.className = 'glueslots glued'; slotsEl.innerHTML = `<span class="gslot done">${R.word}</span>`; pop(slotsEl); CH.sfx.win();
        g.say(R.word); await sleep(1600); busy = false; r++;
        if (r < cfg.rounds.length) setup(); else { CH.dotsBar($('.dots', root), cfg.rounds.length, r); g.finish({ title: 'Great gluing!' }); }
      }
    }
    setup();
    return { solve() { const R = cfg.rounds[r], w = R.parts[filled];
      $$('.gtile', tilesEl).forEach(b => b.classList.toggle('hint', b.dataset.w === w));
      return `${R.parts.join(' + ')} makes <b>${R.word}</b>. Next, tap <b>${w}</b>.`; } };
  });

  /* Add or take away objects, then pick the number (Apple Basket, Monkey Snack) */
  CH.engine('sums', (root, cfg, g) => {
    const add = cfg.op === '+';
    root.innerHTML = `<div class="dots"></div><div class="sumline"></div><div class="sumstage"></div>
      <div class="actions"><button type="button" class="btn alt sumact"></button></div><div class="choices nums sumopts" hidden></div>`;
    const stage = $('.sumstage', root), opts = $('.sumopts', root), act = $('.sumact', root);
    let r = 0, acted = false, busy = false;
    const items = (n, cls = '') => Array.from({ length: n }, () => `<i class="it ${cls}">${cfg.e}</i>`).join('');
    const ansOf = R => add ? R.a + R.b : R.a - R.b;
    function setup() {
      const R = cfg.rounds[r]; acted = false; busy = false;
      CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      $('.sumline', root).innerHTML = `<b>${R.a}</b><span>${add ? '+' : '−'}</span><b>${R.b}</b><span>=</span><b class="q">?</b>`;
      stage.innerHTML = add ? `<div class="grp">${items(R.a)}</div><span class="gplus">+</span><div class="grp">${items(R.b)}</div>`
        : `<div class="grp">${items(R.a)}</div><span class="eater" aria-hidden="true">${cfg.eater}</span>`;
      act.textContent = add ? '🧺 Put them together' : `${cfg.eater} Eat!`; act.disabled = false;
      opts.hidden = true; opts.innerHTML = '';
      g.say(R.say);
    }
    function showChoices() {
      const R = cfg.rounds[r], a = ansOf(R);
      const set = new Set([a]); [a - 1, a + 1, a + 2, a - 2].forEach(n => { if (n >= 0 && set.size < 3) set.add(n); });
      opts.innerHTML = ''; [...set].sort((x, y) => x - y).forEach(n => {
        const b = h(`<button type="button" class="choice numc" data-n="${n}">${n}</button>`); b.onclick = () => pick(n, b); opts.appendChild(b);
      });
      opts.hidden = false;
    }
    act.onclick = async () => {
      if (busy || acted) return; busy = true; act.disabled = true;
      const R = cfg.rounds[r];
      if (add) {
        stage.innerHTML = `<div class="grp basket">${items(R.a + R.b, 'pre')}</div>`;
        const its = $$('.it', stage);
        for (let i = 0; i < its.length; i++) { its[i].classList.remove('pre'); pop(its[i]); CH.sfx.pop(.8 + i * .07, .7); await sleep(260); }
      } else {
        const its = $$('.it', stage);
        for (let i = 0; i < R.b; i++) { const it = its[its.length - 1 - i]; it.classList.add('gone'); CH.sfx.pop(1.2 - i * .1, .7); await sleep(420); }
      }
      acted = true; busy = false; showChoices();
    };
    async function pick(n, b) {
      const R = cfg.rounds[r];
      if (busy) return;
      if (n !== ansOf(R)) { g.mistake(); shake(b); g.say(LINES.tryAgain); return; }
      busy = true; $('.q', root).textContent = n; pop($('.q', root)); g.say(LINES.yes); await sleep(1100); busy = false; r++;
      if (r < cfg.rounds.length) setup(); else { CH.dotsBar($('.dots', root), cfg.rounds.length, r); g.finish({ title: add ? 'Great adding!' : 'Great counting!' }); }
    }
    setup();
    return { solve() {
      const R = cfg.rounds[r], a = ansOf(R);
      if (opts.hidden) showChoices();
      $$('.choice', opts).forEach(b => b.classList.toggle('hint', +b.dataset.n === a));
      return `<span class="kbig">${R.a} ${add ? '+' : '−'} ${R.b} = ${a}</span> Tap the glowing number.`;
    } };
  });

  /* Flip cards and remember where pairs hide (Memory Match) */
  CH.engine('matchPairs', (root, cfg, g) => {
    root.innerHTML = `<div class="mstat"><span class="mfound"></span><span class="mtries"></span></div><div class="mgrid"></div>`;
    const grid = $('.mgrid', root); grid.style.setProperty('--cols', cfg.cols);
    let cards = [], first = null, lock = false, found = 0, tries = 0, misses = 0, alive = true, peeking = false;
    function stat() { $('.mfound', root).textContent = `Pairs found: ${found} of ${cfg.pairs.length}`; $('.mtries', root).textContent = `Tries: ${tries}`; }
    function setup() {
      cards = CH.shuffle([...cfg.pairs, ...cfg.pairs]).map((e, i) => ({ e, i, up: false, done: false }));
      grid.innerHTML = '';
      cards.forEach(c => {
        c.el = h(`<button type="button" class="mcard" data-e="${c.e}" aria-label="Card ${c.i + 1}"><span class="back">❓</span><span class="face">${c.e}</span></button>`);
        c.el.onclick = () => flip(c); grid.appendChild(c.el);
      });
      first = null; lock = false; found = 0; tries = 0; misses = 0; stat();
      g.say(LINES.flipTwo);
    }
    const show = (c, on) => { c.up = on; c.el.classList.toggle('up', on); };
    async function flip(c) {
      if (lock || peeking || c.up || c.done) return;
      show(c, true); pop(c.el);
      if (!first) { first = c; return; }
      tries++; const a = first; first = null;
      if (a.e === c.e) {
        a.done = c.done = true; a.el.classList.add('ok'); c.el.classList.add('ok'); found++; CH.sfx.pop(1.5); stat();
        if (found === cfg.pairs.length) {
          const st = misses <= cfg.stars[0] ? 3 : misses <= cfg.stars[1] ? 2 : 1;
          g.finish({ title: 'You remembered them all!', stars: st, note: `${tries} tries, ${misses} wrong` });
        }
      } else {
        lock = true; stat(); await sleep(850);
        if (!alive) return;
        show(a, false); show(c, false); lock = false; misses++;
        if (misses > cfg.helpAfter) g.mistake();
      }
    }
    setup();
    return {
      unmount() { alive = false; },
      solve() {
        if (peeking) return '';
        peeking = true; const hidden = cards.filter(c => !c.up && !c.done); hidden.forEach(c => show(c, true));
        setTimeout(() => { hidden.forEach(c => { if (!c.done && c !== first) show(c, false); }); peeking = false; }, 2800);
        return 'Look closely! Every card is face up for a moment. Remember where each picture is.';
      } };
  });

  /* Feed a monster the words that rhyme (Rhyme Monster) */
  CH.engine('rhyme', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><div class="rmon"><span class="monster">👾</span><div class="rsay"></div></div><div class="ritems"></div>`;
    const mon = $('.monster', root), items = $('.ritems', root);
    let r = 0, fed = 0, need = 0, busy = false;
    function setup() {
      const R = cfg.rounds[r]; fed = 0; busy = false; need = R.items.filter(i => i.r).length;
      CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      $('.rsay', root).innerHTML = `Feed me words that rhyme with <b>${R.target.w}</b> ${R.target.e}`;
      mon.textContent = '👾'; items.innerHTML = '';
      R.items.forEach(it => {
        const b = h(`<button type="button" class="ritem" data-w="${it.w}" data-r="${it.r ? 1 : 0}"><span>${it.e}</span><small>${it.w}</small></button>`);
        b.onclick = () => tap(it, b); items.appendChild(b);
      });
      g.say(R.say);
    }
    async function tap(it, b) {
      if (busy || b.classList.contains('fed')) return;
      g.say(it.w);
      if (!it.r) { g.mistake(); shake(b); mon.textContent = '🤢'; await sleep(700); mon.textContent = '👾'; return; }
      b.classList.add('fed'); fed++; mon.textContent = '😋'; pop(mon); CH.sfx.pop(1.4);
      if (fed === need) {
        busy = true; await sleep(1000); mon.textContent = '🥳'; g.say(LINES.yes); await sleep(1100); busy = false; r++;
        if (r < cfg.rounds.length) setup(); else { CH.dotsBar($('.dots', root), cfg.rounds.length, r); g.finish({ title: 'Rhyme time champion!' }); }
      } else { await sleep(500); if (!busy) mon.textContent = '👾'; }
    }
    setup();
    return { solve() { const R = cfg.rounds[r]; $$('.ritem', items).forEach(b => { if (b.dataset.r === '1' && !b.classList.contains('fed')) b.classList.add('hint'); });
      return `The rhymes are <b>${R.items.filter(i => i.r).map(i => i.w).join(', ')}</b>. They sound like ${R.target.w}. Tap the glowing pictures.`; } };
  });
})(window.CH);
