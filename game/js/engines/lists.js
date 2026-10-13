/* Engines for ages 7–8: guessing, random numbers, memory, bug hunting in code, letter loops,
   joining strings, searching, arrays and transposing. Each returns { solve(), unmount?() }. */
(function (CH) {
  const { $, $$, sleep, shake, pop, h } = CH;
  const stepper = (k, label) => `<span class="stepper" data-k="${k}"><button type="button" class="minus" aria-label="Lower ${label}">−</button><b></b><button type="button" class="plus" aria-label="Raise ${label}">+</button></span>`;

  /* Guess the lucky number: higher or lower (Lucky Number) */
  CH.engine('guess', (root, cfg, g) => {
    root.innerHTML = `<div class="luckybox" aria-hidden="true"><span>🍀</span><b>?</b></div>
      <div class="rangewrap"><div class="rangebar"><i class="rfill"></i></div><div class="rangelbl"></div></div>
      <div class="gpick"><button type="button" class="minus" data-d="-5">−5</button><button type="button" class="minus" data-d="-1">−1</button><b class="gv">10</b><button type="button" class="plus" data-d="1">+1</button><button type="button" class="plus" data-d="5">+5</button></div>
      <div class="actions"><button type="button" class="btn guessgo">🍀 Guess</button></div><div class="glog" aria-live="polite"></div>`;
    const N = cfg.max - cfg.min + 1, rnd = () => cfg.min + Math.floor(Math.random() * N);
    let secret, lo, hi, v, tries, busy = false;
    const gv = $('.gv', root), log = $('.glog', root);
    function fresh() { secret = rnd(); lo = cfg.min; hi = cfg.max; tries = 0; v = Math.round((lo + hi) / 2); log.innerHTML = ''; draw(); }
    function draw() {
      gv.textContent = v;
      const f = $('.rfill', root); f.style.left = ((lo - cfg.min) / N * 100) + '%'; f.style.width = ((hi - lo + 1) / N * 100) + '%';
      $('.rangelbl', root).innerHTML = `The lucky number is between <b>${lo}</b> and <b>${hi}</b>.`;
    }
    $$('[data-d]', root).forEach(b => b.onclick = () => { if (busy) return; v = Math.min(cfg.max, Math.max(cfg.min, v + +b.dataset.d)); draw(); });
    $('.guessgo', root).onclick = () => {
      if (busy) return;
      tries++;
      if (v === secret) {
        $('.luckybox b', root).textContent = secret; pop($('.luckybox', root));
        const st = tries <= 4 ? 3 : tries === 5 ? 2 : 1;
        return g.finish({ title: 'You found it! 🍀', stars: st, note: `${tries} guess${tries > 1 ? 'es' : ''}` });
      }
      g.mistake();
      const up = v < secret;
      if (up) lo = Math.max(lo, v + 1); else hi = Math.min(hi, v - 1);
      log.insertAdjacentHTML('beforeend', `<span class="gchip ${up ? 'up' : 'dn'}">${v} ${up ? '⬆ higher' : '⬇ lower'}</span>`);
      v = Math.min(hi, Math.max(lo, v)); draw();
      if (tries >= cfg.maxTries) g.feedback({ ok: false, title: 'Out of guesses!', msg: `The lucky number was ${secret}. Try a new one. Tip: guess the middle of the green bar.`, btn: 'New number', onBtn: fresh });
    };
    root.__secret = () => secret;   // test hook
    fresh();
    return { solve() { v = secret; draw(); return `The lucky number is <b>${secret}</b>. It is set for you: press <b>Guess</b>. Next time, guess the middle of the green bar each time!`; } };
  });

  /* Set the range of a random number machine (Random Machine) */
  CH.engine('rng', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><p class="rgoal"></p><div class="reelbox" aria-live="polite"><span class="reel">🎲</span></div>
      <div class="rngctl"><div>Lowest ${stepper('min', 'lowest number')}</div><div>Highest ${stepper('max', 'highest number')}</div></div>
      <div class="rollrow"></div><p class="fine rinfo"></p>
      <div class="actions"><button type="button" class="btn alt roll">🎲 Roll</button><button type="button" class="btn rcheck" disabled>✔ Check</button></div>`;
    const reel = $('.reel', root), chips = $('.rollrow', root), check = $('.rcheck', root);
    const ctl = { min: 1, max: 3 };
    let r = 0, rolls = 0, busy = false;
    function info() { $('.rinfo', root).textContent = rolls >= cfg.rolls ? `Tested with ${rolls} rolls. Press Check!` : `Roll ${cfg.rolls} times to test your machine (${rolls} so far).`; check.disabled = rolls < cfg.rolls; }
    function drawCtl() { $$('.stepper', root).forEach(sp => $('b', sp).textContent = ctl[sp.dataset.k]); }
    function reset() { rolls = 0; chips.innerHTML = ''; reel.textContent = '🎲'; info(); g.hide(); }
    $$('.stepper', root).forEach(sp => {
      const k = sp.dataset.k;
      $('.minus', sp).onclick = () => { if (busy) return; ctl[k] = Math.max(0, ctl[k] - 1); if (ctl.min > ctl.max) { if (k === 'min') ctl.min = ctl.max; else ctl.max = ctl.min; } drawCtl(); reset(); };
      $('.plus', sp).onclick = () => { if (busy) return; ctl[k] = Math.min(30, ctl[k] + 1); if (ctl.min > ctl.max) { if (k === 'min') ctl.max = ctl.min; else ctl.min = ctl.max; } drawCtl(); reset(); };
    });
    const rand = () => ctl.min + Math.floor(Math.random() * (ctl.max - ctl.min + 1));
    $('.roll', root).onclick = async () => {
      if (busy) return; busy = true; g.hide();
      for (let k = 0; k < 6; k++) { reel.textContent = rand(); CH.sfx.step(k); await sleep(70); }
      const v = rand(); reel.textContent = v; pop(reel); rolls++; chips.insertAdjacentHTML('beforeend', `<span class="gchip">${v}</span>`);
      busy = false; info();
    };
    check.onclick = () => {
      const R = cfg.rounds[r];
      if (ctl.min === R.min && ctl.max === R.max) {
        r++;
        if (r < cfg.rounds.length) return g.feedback({ ok: true, title: 'Machine works!', msg: 'Next job.', btn: 'Next', onBtn: setup });
        CH.dotsBar($('.dots', root), cfg.rounds.length, r); return g.finish({ title: 'Random master!' });
      }
      g.mistake();
      g.feedback({ ok: false, title: 'Not quite right', msg: `Your machine picks from ${ctl.min} to ${ctl.max}. ${R.hint}`, btn: 'Try again' });
    };
    function setup() { const R = cfg.rounds[r]; CH.dotsBar($('.dots', root), cfg.rounds.length, r); $('.rgoal', root).textContent = '🎯 ' + R.goal; [ctl.min, ctl.max] = R.start; drawCtl(); reset(); }
    setup();
    return { solve() { const R = cfg.rounds[r]; ctl.min = R.min; ctl.max = R.max; drawCtl(); reset(); return `Set the lowest number to <b>${R.min}</b> and the highest to <b>${R.max}</b>. It is set for you: roll ${cfg.rolls} times, then press <b>Check</b>.`; } };
  });

  /* Remember what was in each numbered locker (Memory Vault) */
  CH.engine('vault', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><p class="vmsg"></p><div class="vgrid"></div><div class="vbar"><i></i></div>
      <div class="actions"><button type="button" class="btn alt vready">👀 I'm ready. Show me!</button></div><div class="choices vopts" hidden></div>`;
    const grid = $('.vgrid', root), msg = $('.vmsg', root), opts = $('.vopts', root), bar = $('.vbar i', root), ready = $('.vready', root);
    let r = 0, qn = 0, items = [], order = [], phase = 'ready', alive = true;
    const lockers = () => grid.innerHTML = items.map((e, i) => `<div class="locker" data-i="${i}"><b>${i + 1}</b><span class="lk">🔒</span></div>`).join('');
    function setup() {
      const R = cfg.rounds[r]; items = CH.shuffle(cfg.pool).slice(0, R.n); qn = 0; phase = 'ready';
      CH.dotsBar($('.dots', root), cfg.rounds.length, r); grid.style.setProperty('--cols', R.n <= 4 ? 4 : 3); lockers();
      msg.textContent = 'Computer memory is a row of numbered boxes. Press the button, look, and remember!';
      opts.hidden = true; ready.hidden = false; bar.style.transition = 'none'; bar.style.width = '0%';
    }
    ready.onclick = async () => {
      if (phase !== 'ready') return; phase = 'show'; ready.hidden = true; const R = cfg.rounds[r];
      $$('.lk', grid).forEach((s, i) => { s.textContent = items[i]; s.parentNode.classList.add('open'); });
      msg.textContent = 'Remember the pictures!';
      bar.style.transition = 'none'; bar.style.width = '100%'; void bar.offsetWidth; bar.style.transition = `width ${R.show}ms linear`; bar.style.width = '0%';
      await sleep(R.show); if (!alive) return;
      $$('.lk', grid).forEach(s => { s.textContent = '🔒'; s.parentNode.classList.remove('open'); });
      order = CH.shuffle([...items.keys()]).slice(0, R.q); phase = 'ask'; ask();
    };
    function ask() {
      const i = order[qn]; msg.innerHTML = `What was in locker <b>${i + 1}</b>?`; opts.innerHTML = '';
      const others = CH.shuffle(items.filter(e => e !== items[i])).slice(0, 2);
      CH.shuffle([items[i], ...others]).forEach(e => { const b = h(`<button type="button" class="choice" data-e="${e}">${e}</button>`); b.onclick = () => answer(e, b); opts.appendChild(b); });
      opts.hidden = false;
    }
    async function answer(e, b) {
      if (phase !== 'ask') return; const i = order[qn];
      if (e !== items[i]) { g.mistake(); shake(b); b.disabled = true; return; }
      phase = 'wait'; $$('.locker', grid)[i].classList.add('open'); $$('.lk', grid)[i].textContent = e; pop($$('.locker', grid)[i]); await sleep(700); if (!alive) return;
      qn++;
      if (qn < order.length) { phase = 'ask'; return ask(); }
      r++;
      if (r < cfg.rounds.length) return g.feedback({ ok: true, title: 'Great memory!', msg: 'More lockers next.', btn: 'Next', onBtn: setup });
      CH.dotsBar($('.dots', root), cfg.rounds.length, r); g.finish({ title: 'Memory master!' });
    }
    root.__vault = () => ({ items, idx: order[qn], phase });   // test hook
    setup();
    return {
      unmount() { alive = false; },
      solve() {
        if (phase === 'ask') { const i = order[qn]; $$('.choice', opts).forEach(b => b.classList.toggle('hint', b.dataset.e === items[i])); return `Locker <b>${i + 1}</b> had <span class="kbig">${items[i]}</span>. Tap the glowing one.`; }
        return `Here is what is in the lockers: ${items.map((e, i) => `<b>${i + 1}</b> ${e}`).join(' · ')}. Press the button when you are ready, and remember them!`;
      } };
  });

  /* Find the buggy line in a tiny program, then fix it (Bug Detective) */
  CH.engine('bugCode', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><p class="rgoal"></p><div class="codepanel bugcode"></div>
      <div class="jar"><span aria-hidden="true">🫙</span><b>?</b></div><p class="vres" aria-live="polite"></p>
      <div class="fixopts" hidden></div><div class="actions"><button type="button" class="btn go">▶ Run</button></div>`;
    const panel = $('.bugcode', root), jar = $('.jar b', root), vres = $('.vres', root), fixopts = $('.fixopts', root);
    const text = l => l.k === 'set' ? `set jar to ${l.v}` : l.k === 'add' ? `change jar by +${l.v}` : l.k === 'double' ? 'double the jar' : `repeat ${l.n} times: change jar by +${l.v}`;
    const evalLine = (l, j) => l.k === 'set' ? l.v : l.k === 'add' ? j + l.v : l.k === 'double' ? j * 2 : j + l.n * l.v;
    const total = lines => lines.reduce((j, l) => evalLine(l, j), 0);
    let r = 0, lines = [], sel = null, edits = 0, busy = false;
    function setup() {
      const R = cfg.rounds[r]; lines = R.lines.map(l => ({ ...l })); sel = null; edits = 0; busy = false;
      CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      $('.rgoal', root).innerHTML = `🎯 Goal: the jar should end at <b>${R.goal}</b>`;
      jar.textContent = '?'; vres.textContent = ''; vres.className = 'vres'; draw();
    }
    function draw() {
      panel.innerHTML = '';
      lines.forEach((l, i) => {
        const b = h(`<button type="button" class="cline${sel === i ? ' sel' : ''}" data-i="${i}"><b>${i + 1}</b>${text(l)}</button>`);
        b.onclick = () => selectLine(i); panel.appendChild(b);
      });
      fixopts.hidden = sel === null;
      if (sel !== null) {
        const R = cfg.rounds[r];
        fixopts.innerHTML = `<span>Replace line ${sel + 1} with:</span>`;
        R.opts.forEach((o, k) => { const b = h(`<button type="button" class="chip fixopt" data-k="${k}">${text(o)}</button>`); b.onclick = () => pickFix(o); fixopts.appendChild(b); });
      }
    }
    function selectLine(i) {
      if (busy) return; const R = cfg.rounds[r];
      if (i !== R.bug) { g.mistake(); sel = null; draw(); shake($$('.cline', panel)[i]); vres.className = 'vres bad'; vres.textContent = 'That line is fine. Look for the line that makes the wrong number.'; return; }
      sel = i; vres.textContent = ''; draw();
    }
    function pickFix(o) { if (busy) return; lines[sel] = { ...o }; sel = null; edits++; vres.textContent = ''; draw(); }
    $('.go', root).onclick = async () => {
      if (busy) return; busy = true; const R = cfg.rounds[r]; vres.textContent = ''; vres.className = 'vres';
      let j = 0; const els = $$('.cline', panel);
      for (let i = 0; i < lines.length; i++) { els.forEach(e => e.classList.remove('now')); els[i].classList.add('now'); j = evalLine(lines[i], j); jar.textContent = j; pop(jar); CH.sfx.step(i); await sleep(650); }
      els.forEach(e => e.classList.remove('now')); busy = false;
      if (j === R.goal) {
        vres.className = 'vres ok'; vres.textContent = `Jar ended at ${j}. That is the goal! ✓`; r++;
        if (r < cfg.rounds.length) return g.feedback({ ok: true, title: 'Bug fixed!', msg: 'Next program.', btn: 'Next', onBtn: setup });
        CH.dotsBar($('.dots', root), cfg.rounds.length, r); return g.finish({ title: 'Bug detective!' });
      }
      vres.className = 'vres bad'; vres.textContent = `Jar ended at ${j}. The goal is ${R.goal}. ✗`;
      if (edits > 0) g.mistake();
    };
    setup();
    return { solve() {
      if (busy) return ''; const R = cfg.rounds[r]; sel = R.bug; draw();
      $$('.fixopt', fixopts).forEach((b, k) => b.classList.toggle('hint', k === R.fix));
      return `Line <b>${R.bug + 1}</b> is the bug. It should say: <b>${text(R.opts[R.fix])}</b>. Tap the glowing line, then press <b>Run</b>.`;
    } };
  });

  /* Count a letter with a loop and a counter (Letter Counter) */
  CH.engine('letterLoop', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><div class="codepanel lcode"></div><div class="wordtiles lt"></div>
      <div class="lcount">count = <b>0</b></div><p class="q">How many will the loop count?</p><div class="choices nums lopts"></div>`;
    const code = $('.lcode', root), tiles = $('.lt', root), cnt = $('.lcount b', root), opts = $('.lopts', root);
    let r = 0, busy = false, alive = true;
    const truth = R => [...R.word].filter(c => c === R.letter).length;
    function setup() {
      const R = cfg.rounds[r]; busy = false; CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      code.innerHTML = `<div data-l="0">count = 0</div><div data-l="1">for each letter in "${R.word}":</div><div class="in1" data-l="2">if letter is "${R.letter}":</div><div class="in2" data-l="3">count = count + 1</div>`;
      tiles.innerHTML = [...R.word].map(c => `<span class="ltile">${c}</span>`).join(''); cnt.textContent = 0;
      opts.innerHTML = ''; for (let n = 1; n <= 6; n++) { const b = h(`<button type="button" class="choice numc" data-n="${n}">${n}</button>`); b.onclick = () => guess(n, b); opts.appendChild(b); }
    }
    const lit = l => $$('[data-l]', code).forEach(e => e.classList.toggle('now', +e.dataset.l === l));
    async function guess(n, b) {
      if (busy) return; busy = true; $$('button', opts).forEach(x => x.disabled = true);
      const R = cfg.rounds[r], ts = $$('.ltile', tiles); let c = 0;
      lit(0); await sleep(450);
      for (let i = 0; i < ts.length; i++) {
        if (!alive) return;
        ts.forEach(t => t.classList.remove('cur')); ts[i].classList.add('cur'); lit(2); CH.sfx.step(i);
        if (R.word[i] === R.letter) { await sleep(220); lit(3); c++; cnt.textContent = c; ts[i].classList.add('hit'); pop(cnt); CH.sfx.pop(.9 + c * .1); }
        await sleep(300);
      }
      lit(-1); ts.forEach(t => t.classList.remove('cur')); busy = false;
      if (n === c) {
        r++; if (r < cfg.rounds.length) return g.feedback({ ok: true, title: `Yes, ${c}!`, msg: 'The loop agrees. Next word.', btn: 'Next', onBtn: setup });
        CH.dotsBar($('.dots', root), cfg.rounds.length, r); return g.finish({ title: 'Loop master!' });
      }
      g.mistake(); shake(b);
      g.feedback({ ok: false, title: `The loop counted ${c}`, msg: `You said ${n}. Watch the highlighted letters, then try again.`, btn: 'Try again', onBtn: setup });
    }
    setup();
    return { unmount() { alive = false; }, solve() { const R = cfg.rounds[r], n = truth(R); $$('.choice', opts).forEach(b => b.classList.toggle('hint', +b.dataset.n === n));
      return `Go letter by letter. "${R.letter}" appears <b>${n}</b> time${n > 1 ? 's' : ''} in <b>${R.word}</b>. Tap the glowing number.`; } };
  });

  /* Work out what string joining makes (Word Glue Code) */
  CH.engine('concatCode', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><div class="codepanel ccode"></div><p class="q">What does the last line make?</p><div class="choices copts"></div><div class="joined" aria-live="polite"></div>`;
    const code = $('.ccode', root), opts = $('.copts', root), joined = $('.joined', root);
    let r = 0, busy = false;
    function setup() {
      const R = cfg.rounds[r]; busy = false; CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      code.innerHTML = R.lines.map(l => `<div>${l}</div>`).join('') + `<div class="now">show ${R.expr}</div>`;
      joined.textContent = ''; opts.innerHTML = '';
      R.opts.forEach(o => { const b = h(`<button type="button" class="choice cch" data-v="${o}">"${o}"</button>`); b.onclick = () => pick(o, b); opts.appendChild(b); });
    }
    async function pick(o, b) {
      if (busy) return; const R = cfg.rounds[r];
      if (o !== R.ans) { g.mistake(); shake(b); g.feedback({ ok: false, title: 'Not that one', msg: 'The + sticks the words together in order. A space in quotes is a letter too.', btn: 'Try again' }); return; }
      busy = true; joined.innerHTML = `<span class="jp">"${R.ans}"</span>`; pop(joined); CH.sfx.win(); await sleep(1100); busy = false; r++;
      if (r < cfg.rounds.length) setup(); else { CH.dotsBar($('.dots', root), cfg.rounds.length, r); g.finish({ title: 'Word wizard!' }); }
    }
    setup();
    return { solve() { const R = cfg.rounds[r]; $$('.cch', opts).forEach(b => b.classList.toggle('hint', b.dataset.v === R.ans));
      return `<b>${R.expr}</b> makes <b>"${R.ans}"</b>. Join the pieces in order, and add a space only where the code has one.`; } };
  });

  /* Find a number by flipping cards (Number Hunt) */
  CH.engine('search', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><p class="hgoal"></p><div class="hflips"></div><div class="hgrid"></div><p class="hhint" aria-live="polite"></p>`;
    const grid = $('.hgrid', root), hint = $('.hhint', root);
    let r = 0, flips = 0, lo = 0, hi = 0, busy = false; const slips = [];
    function setup() {
      const R = cfg.rounds[r]; flips = 0; busy = false; lo = 0; hi = R.cards.length - 1;
      CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      $('.hgoal', root).innerHTML = `🔎 Find the number <b class="tnum">${R.target}</b>`;
      $('.hflips', root).textContent = 'Cards flipped: 0';
      hint.textContent = R.sorted ? 'The cards are in order, smallest to biggest. Use the clues to skip!' : 'The cards are mixed up. Flip them one at a time.';
      grid.innerHTML = '';
      R.cards.forEach((n, i) => { const b = h(`<button type="button" class="ncard" data-i="${i}" data-n="${n}" aria-label="Card ${i + 1}"><span class="nb">?</span></button>`); b.onclick = () => flip(i, b); grid.appendChild(b); });
    }
    function flip(i, b) {
      const R = cfg.rounds[r]; if (busy || b.classList.contains('up')) return;
      flips++; $('.hflips', root).textContent = `Cards flipped: ${flips}`;
      b.classList.add('up'); $('.nb', b).textContent = R.cards[i]; pop(b);
      if (R.cards[i] === R.target) { b.classList.add('found'); return done(R); }
      if (R.sorted) {
        const small = R.cards[i] < R.target;
        if (small) lo = Math.max(lo, i + 1); else hi = Math.min(hi, i - 1);
        hint.textContent = small ? `${R.cards[i]} is too small. Look to the right ▶` : `${R.cards[i]} is too big. Look to the left ◀`;
        $$('.ncard', grid).forEach((c, k) => c.classList.toggle('out', k < lo || k > hi));
      } else hint.textContent = `${R.cards[i]}. Not it. Keep flipping!`;
    }
    function done(R) {
      busy = true; const over = R.sorted && flips > R.budget; slips.push(over);
      const best = R.sorted ? Math.ceil(Math.log2(R.cards.length + 1)) : null;
      const note = R.sorted ? (over ? `That took ${flips} flips. Starting in the middle can do it in ${best} or fewer.` : `Only ${flips} flips. Clever skipping!`) : `You flipped ${flips} card${flips > 1 ? 's' : ''}.`;
      r++;
      if (r < cfg.rounds.length) return g.feedback({ ok: true, title: 'Found it!', msg: note, btn: 'Next', onBtn: setup });
      const n = slips.filter(Boolean).length;
      CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      g.finish({ title: 'Number hunter!', stars: n === 0 ? 3 : n === 1 ? 2 : 1, note: n === 0 ? 'Perfect searching' : `${n} slow round${n > 1 ? 's' : ''}` });
    }
    setup();
    return { solve() { const R = cfg.rounds[r], i = R.cards.indexOf(R.target); $$('.ncard', grid)[i].classList.add('hint');
      return R.sorted ? `Start in the <b>middle</b> card. If it is too small, jump right. If too big, jump left. ${R.target} is card <b>${i + 1}</b>.` : `${R.target} is card number <b>${i + 1}</b> from the left. Tap the glowing card.`; } };
  });

  /* Read, change, add to and count an array (Pet Shelf) */
  CH.engine('array', (root, cfg, g) => {
    root.innerHTML = `<div class="codepanel acode"></div><p class="ajob" aria-live="polite"></p><div class="shelf"></div><div class="choices apal"></div><div class="choices alen" hidden></div>`;
    const shelf = $('.shelf', root), job = $('.ajob', root), pal = $('.apal', root), lenEl = $('.alen', root), code = $('.acode', root);
    const arr = [...cfg.arr]; let ti = 0, holding = null;
    const T = () => cfg.tasks[ti];
    function draw() {
      code.innerHTML = `<div>${cfg.name} = [${arr.join(', ')}]</div>`;
      shelf.innerHTML = '';
      arr.forEach((e, i) => { const b = h(`<button type="button" class="abox" data-i="${i}" aria-label="${cfg.name} ${i}"><span>${e}</span><small>${cfg.name}[${i}]</small></button>`); b.onclick = () => box(i, b); shelf.appendChild(b); });
      if (T() && T().t === 'push') { const b = h(`<button type="button" class="abox ghost" data-i="${arr.length}" aria-label="End of the shelf"><span>＋</span><small>${cfg.name}[${arr.length}]</small></button>`); b.onclick = () => box(arr.length, b); shelf.appendChild(b); }
      pal.innerHTML = ''; lenEl.innerHTML = '';
      const t = T(); if (!t) return;
      pal.hidden = !(t.t === 'set' || t.t === 'push'); lenEl.hidden = t.t !== 'len';
      if (!pal.hidden) cfg.pool.forEach(e => { const b = h(`<button type="button" class="choice${holding === e ? ' sel' : ''}" data-e="${e}">${e}</button>`); b.onclick = () => { holding = e; draw(); }; pal.appendChild(b); });
      if (!lenEl.hidden) { [arr.length - 1, arr.length, arr.length + 1].forEach(n => { const b = h(`<button type="button" class="choice numc" data-n="${n}">${n}</button>`); b.onclick = () => lenPick(n, b); lenEl.appendChild(b); }); }
      job.innerHTML = t.t === 'get' ? `Job 1 of 4: <b>${cfg.name}[${t.i}]</b> is which pet? Tap its box.` :
        t.t === 'set' ? `Job 2 of 4: put ${t.e} into <b>${cfg.name}[${t.i}]</b>. Tap ${t.e}, then tap box ${t.i}.` :
        t.t === 'push' ? `Job 3 of 4: add ${t.e} to the end. Tap ${t.e}, then tap the new box at the end.` :
        `Job 4 of 4: how many pets are on the shelf now? (${cfg.name}.length)`;
    }
    async function next() { ti++; holding = null; if (ti < cfg.tasks.length) { draw(); return; } g.finish({ title: 'Array expert!' }); }
    async function box(i, b) {
      const t = T(); if (!t || t.t === 'len') return;
      if (t.t === 'get') { if (i !== t.i) { g.mistake(); shake(b); return; } b.classList.add('ok'); pop(b); await sleep(700); return next(); }
      if (!holding) { shake(pal); return; }
      if (holding !== t.e || (t.t === 'set' && i !== t.i) || (t.t === 'push' && i !== arr.length)) { g.mistake(); shake(b); return; }
      if (t.t === 'set') arr[i] = holding; else arr.push(holding);
      draw(); const nb = $$('.abox', shelf)[i]; if (nb) pop(nb); await sleep(700); return next();
    }
    async function lenPick(n, b) { if (n !== arr.length) { g.mistake(); shake(b); return; } b.classList.add('ok'); await sleep(600); next(); }
    draw();
    return { solve() {
      const t = T(); if (!t) return '';
      if (t.t === 'get') { $$('.abox', shelf)[t.i].classList.add('hint'); return `Boxes start at 0, so box <b>${t.i}</b> is the <b>${t.i + 1}${['st', 'nd', 'rd'][t.i] || 'th'}</b> pet. Tap the glowing box.`; }
      if (t.t === 'len') { $$('.choice', lenEl).forEach(b => b.classList.toggle('hint', +b.dataset.n === arr.length)); return `Count the pets on the shelf: <b>${arr.length}</b>. Tap the glowing number.`; }
      $$('.choice', pal).forEach(b => b.classList.toggle('hint', b.dataset.e === t.e)); const target = t.t === 'set' ? t.i : arr.length; const bx = $$('.abox', shelf)[target]; if (bx) bx.classList.add('hint');
      return `Tap <b>${t.e}</b>, then tap the glowing box <b>${cfg.name}[${target}]</b>.`;
    } };
  });

  /* Turn rows into columns (Flip the Grid) */
  CH.engine('transpose', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><div class="tpwrap"><div class="tpcol"><h5>Start</h5><div class="tpgrid src"></div></div><div class="tpcol"><h5>Flipped</h5><div class="tpgrid dst"></div></div></div><p class="prompt" aria-live="polite"></p>`;
    const srcEl = $('.src', root), dstEl = $('.dst', root), prompt = $('.prompt', root);
    let r = 0, sel = null, poured = new Set(), phase = 'pour', busy = false, dst = [];
    function setup() {
      const R = cfg.rounds[r], rows = R.grid.length, cols = R.grid[0].length;
      sel = null; poured = new Set(); phase = 'pour'; busy = false; dst = Array.from({ length: cols }, () => Array(rows).fill(''));
      CH.dotsBar($('.dots', root), cfg.rounds.length, r); draw();
    }
    function draw() {
      const R = cfg.rounds[r], rows = R.grid.length, cols = R.grid[0].length;
      srcEl.style.setProperty('--cols', cols + 1); srcEl.innerHTML = '';
      R.grid.forEach((row, ri) => {
        const lb = h(`<button type="button" class="tprow${sel === ri ? ' sel' : ''}${poured.has(ri) ? ' done' : ''}" data-r="${ri}" aria-label="Row ${ri + 1}">Row ${ri + 1} ▶</button>`); lb.onclick = () => pickRow(ri); srcEl.appendChild(lb);
        row.forEach((v, ci) => srcEl.appendChild(h(`<div class="tpcell s${poured.has(ri) ? ' dim' : ''}${phase === 'probe' && R.probe[0] === ri && R.probe[1] === ci ? ' probe' : ''}" data-r="${ri}" data-c="${ci}">${v}</div>`)));
      });
      dstEl.style.setProperty('--cols', rows); dstEl.innerHTML = '';
      for (let c = 0; c < rows; c++) { const hb = h(`<button type="button" class="tphead" data-c="${c}" aria-label="Column ${c + 1}">▼ Col ${c + 1}</button>`); hb.onclick = () => pickCol(c); dstEl.appendChild(hb); }
      dst.forEach((row, ri) => row.forEach((v, ci) => { const cell = h(`<div class="tpcell d${v === '' ? ' empty' : ''}" data-r="${ri}" data-c="${ci}">${v}</div>`); if (phase === 'probe') { cell.setAttribute('role', 'button'); cell.onclick = () => probe(ri, ci, cell); } dstEl.appendChild(cell); }));
      prompt.textContent = phase === 'pour' ? (sel === null ? 'Tap a row on the left.' : `Row ${sel + 1} is picked. Now tap the column it should go to.`) : 'Where did the glowing item go? Tap it in the Flipped grid.';
    }
    function pickRow(ri) { if (busy || phase !== 'pour' || poured.has(ri)) return; sel = ri; draw(); }
    async function pickCol(c) {
      if (busy || phase !== 'pour') return;
      if (sel === null) { shake(srcEl); prompt.textContent = 'Tap a row first.'; return; }
      if (c !== sel) { g.mistake(); const hb = $$('.tphead', dstEl)[c]; shake(hb); prompt.textContent = `Not that column. Row ${sel + 1} goes into column ${sel + 1}: row number = column number.`; return; }
      const R = cfg.rounds[r]; R.grid[sel].forEach((v, k) => { dst[k][c] = v; }); poured.add(sel); sel = null; CH.sfx.pop(1.3); draw();
      $$('.tpcell.d', dstEl).forEach(e => { if (+e.dataset.c === c) pop(e); });
      if (poured.size === R.grid.length) { phase = 'probe'; draw(); }
    }
    async function probe(ri, ci, cell) {
      if (busy || phase !== 'probe') return; const R = cfg.rounds[r];
      if (ri !== R.probe[1] || ci !== R.probe[0]) { g.mistake(); shake(cell); prompt.textContent = `The item was in row ${R.probe[0] + 1}, column ${R.probe[1] + 1}. Now they swap: look in row ${R.probe[1] + 1}, column ${R.probe[0] + 1}.`; return; }
      busy = true; cell.classList.add('probe'); pop(cell); CH.sfx.win(); await sleep(1100); busy = false; r++;
      if (r < cfg.rounds.length) setup(); else { CH.dotsBar($('.dots', root), cfg.rounds.length, r); g.finish({ title: 'Grid flipper!' }); }
    }
    setup();
    return { solve() {
      const R = cfg.rounds[r];
      if (phase === 'probe') { const cell = $$('.tpcell.d', dstEl).find(e => +e.dataset.r === R.probe[1] && +e.dataset.c === R.probe[0]); if (cell) cell.classList.add('hint'); return `The glowing item was in row ${R.probe[0] + 1}, column ${R.probe[1] + 1}. Rows and columns swap, so it is now in row <b>${R.probe[1] + 1}</b>, column <b>${R.probe[0] + 1}</b>.`; }
      const next = R.grid.findIndex((_, i) => !poured.has(i));
      $$('.tprow', srcEl)[next].classList.add('hint'); $$('.tphead', dstEl)[next].classList.add('hint');
      return `Row <b>${next + 1}</b> goes into column <b>${next + 1}</b>. Rows become columns. Tap the glowing row, then the glowing column.`;
    } };
  });
})(window.CH);
