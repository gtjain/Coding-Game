/* Engines for ages 4–6. Each engine: (root, cfg, g) => { solve(), unmount? }.
   g: say(text), mistake(), feedback({ok,title,msg,btn,onBtn}), finish({title}), hide().
   solve() fills in or highlights the answer and returns a short HTML explanation for the solution key. */
(function (CH) {
  const { $, $$, sleep, shake, pop, h, DIRS, DNAME, LINES } = CH;
  const glyphs = ds => ds.map(d => `<b class="kg">${DIRS[d][2]}</b>`).join(' ');

  /* Plan a path with arrows, then Go (Bunny Hop) */
  CH.engine('arrowPath', (root, cfg, g) => {
    // went: the trip that was already driven (Scooter Home), shown so the kid can plan the way back
    const went = cfg.went ? `<p class="fine wentlbl">${cfg.wentLabel || 'The way there:'}</p><div class="tray readonly went">${cfg.went.map(d => `<span class="blk">${DIRS[d][2]}</span>`).join('')}</div>` : '';
    root.innerHTML = `${went}<div class="boardHost"></div><div class="tray prog" data-empty="Your plan goes here"></div><div class="palette"></div>
      <div class="actions"><button type="button" class="btn ghost clear">Clear</button><button type="button" class="btn go">▶ Go</button></div>`;
    const board = CH.makeBoard($('.boardHost', root), cfg.board), tray = $('.prog', root);
    const missed = n => ({ title: `You missed ${n === 1 ? 'one' : n} ${cfg.board.items[0][2]}`, msg: `Pick up every ${cfg.board.items[0][2]} on the way. Then go to the ${cfg.board.prize}.` });
    let prog = [], busy = false;
    const draw = () => { tray.innerHTML = ''; prog.forEach((d, i) => { const b = h(`<button type="button" class="blk big" aria-label="Remove ${DNAME[d]}">${DIRS[d][2]}</button>`); b.onclick = () => { if (busy) return; prog.splice(i, 1); draw(); }; tray.appendChild(b); }); };
    CH.arrowPalette($('.palette', root), d => { if (busy) return; if (prog.length >= cfg.max) { shake(tray); return; } prog.push(d); draw(); g.hide(); }, true);
    $('.clear', root).onclick = () => { if (busy) return; prog = []; draw(); board.reset(); g.hide(); };
    $('.go', root).onclick = async () => {
      if (busy || !prog.length) return; busy = true; g.hide();
      const els = $$('.blk', tray);
      const r = await board.run(prog.map(op => ({ op })), i => els.forEach((e, j) => e.classList.toggle('now', j === i)));
      busy = false;
      if (r.ok) return g.finish({ title: cfg.winTitle || 'Yummy! You did it!' });
      g.mistake(); if (r.step != null) els[r.step]?.classList.add('bad');
      const m = r.step == null && r.left ? missed(r.left) : { title: r.step != null ? (cfg.bumpTitle || 'Bonk! A rock!') : 'Almost! Keep going', msg: 'Change your plan and try again.' };
      g.feedback({ ok: false, ...m, btn: 'Try again', onBtn: () => { board.reset(); draw(); } });
    };
    return { solve() { if (busy) return ''; prog = CH.solvePath(cfg.board); draw(); board.reset(); return `The path is ${glyphs(prog)}. It is in your plan now: press <b>Go</b>.`; } };
  });

  /* Three cards, each repeated 1–4 times (Hop Hop Hop) */
  CH.engine('hopCards', (root, cfg, g) => {
    root.innerHTML = `<div class="boardHost"></div><div class="hop3"></div><div class="palette"></div>
      <div class="actions"><button type="button" class="btn ghost clear">Clear</button><button type="button" class="btn go">▶ Go</button></div>`;
    const board = CH.makeBoard($('.boardHost', root), cfg.board), slots = $('.hop3', root);
    slots.style.setProperty('--slots', cfg.slots); slots.classList.toggle('s4', cfg.slots > 3);
    let plan = [], busy = false;
    function draw() {
      slots.innerHTML = '';
      for (let i = 0; i < cfg.slots; i++) {
        const p = plan[i], d = h(`<div class="hslot${p ? ' full' : ''}"></div>`);
        if (p) {
          d.innerHTML = `<button type="button" class="blk big" aria-label="Remove ${DNAME[p.d]}">${DIRS[p.d][2]}</button>
            <div class="cnt"><button type="button" class="minus" aria-label="Fewer hops">−</button><b aria-label="${p.n} hops">${'●'.repeat(p.n)}</b><button type="button" class="plus" aria-label="More hops">+</button></div>`;
          $('.blk', d).onclick = () => { if (busy) return; plan.splice(i, 1); g.hide(); draw(); };
          $('.minus', d).onclick = () => { if (busy) return; p.n = Math.max(1, p.n - 1); g.hide(); draw(); };
          $('.plus', d).onclick = () => { if (busy) return; p.n = Math.min(cfg.maxCount, p.n + 1); g.hide(); draw(); };
        }
        slots.appendChild(d);
      }
    }
    CH.arrowPalette($('.palette', root), d => { if (busy) return; if (plan.length >= cfg.slots) { shake(slots); return; } plan.push({ d, n: 1 }); g.hide(); draw(); }, true);
    $('.clear', root).onclick = () => { if (busy) return; plan = []; draw(); board.reset(); g.hide(); };
    $('.go', root).onclick = async () => {
      if (busy || !plan.length) return; busy = true; g.hide();
      const steps = []; plan.forEach((p, i) => { for (let k = 0; k < p.n; k++) steps.push({ op: p.d, slot: i }); });
      const els = $$('.hslot', slots);
      const r = await board.run(steps, i => els.forEach((e, j) => e.classList.toggle('now', i >= 0 && steps[i].slot === j)));
      busy = false;
      if (r.ok) return g.finish({ title: cfg.winTitle || 'Hop hop hooray!' });
      g.mistake();
      g.feedback({ ok: false, title: r.step != null ? 'Oops, flowers!' : 'Not far enough', msg: 'Change the arrows or the dots and try again.', btn: 'Try again', onBtn: () => { board.reset(); draw(); } });
    };
    draw();
    return { solve() {
      if (busy) return '';
      plan = []; for (const d of CH.solvePath(cfg.board)) { const last = plan[plan.length - 1]; if (last && last.d === d && last.n < cfg.maxCount) last.n++; else plan.push({ d, n: 1 }); }
      draw(); board.reset();
      return `${plan.map(p => `<b class="kg">${DIRS[p.d][2]}</b> ×${p.n}`).join(', ')}. The cards are ready: press <b>Go</b>.`;
    } };
  });

  /* Watch then repeat a sequence (Copy the Dance) */
  CH.engine('dance', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><div class="stage"><span>🤖</span><span class="move">❔</span></div>
      <div class="seqrow" aria-label="Your moves"></div><div class="choices moves"></div>
      <div class="actions"><button type="button" class="btn alt watch">👀 Watch</button></div>`;
    const mv = $('.move', root), row = $('.seqrow', root), ch = $('.choices', root), dots = $('.dots', root);
    const M = Object.fromEntries(cfg.moves.map(m => [m.id, m]));
    let r = 0, got = [], watched = false, busy = false, alive = true;
    cfg.moves.forEach(m => { const b = h(`<button type="button" class="choice" aria-label="${m.id}">${m.e}</button>`); b.onclick = () => tap(m.id, b); ch.appendChild(b); });
    function setup() { got = []; watched = false; row.innerHTML = ''; mv.textContent = '❔'; CH.dotsBar(dots, cfg.rounds.length, r); $$('.choice', ch).forEach(b => b.disabled = true); }
    $('.watch', root).onclick = async () => {
      if (busy) return; busy = true; g.hide(); got = []; row.innerHTML = '';
      for (const id of cfg.rounds[r]) { if (!alive) return; mv.textContent = M[id].e; pop(mv); g.say(M[id].say); await sleep(1100); }
      mv.textContent = '❔'; busy = false; watched = true; $$('.choice', ch).forEach(b => b.disabled = false); g.say(LINES.yourTurn);
    };
    async function tap(id, b) {
      if (busy || !watched) return;
      if (id !== cfg.rounds[r][got.length]) { g.mistake(); shake(b); g.say(LINES.watchAgain); got = []; row.innerHTML = ''; return; }
      got.push(id); row.appendChild(h(`<span class="pop">${M[id].e}</span>`));
      if (got.length === cfg.rounds[r].length) {
        busy = true; g.say(LINES.yes); await sleep(800); busy = false; r++;
        if (r < cfg.rounds.length) setup(); else { CH.dotsBar(dots, cfg.rounds.length, r); g.finish({ title: 'What a dancer!' }); }
      }
    }
    setup();
    return {
      unmount() { alive = false; },
      solve() { watched = true; $$('.choice', ch).forEach(b => b.disabled = false); return `This dance is <span class="kbig">${cfg.rounds[r].map(id => M[id].e).join(' ')}</span>. Tap them in that order.`; }
    };
  });

  /* What comes next (Pattern Train) */
  CH.engine('pattern', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><div class="trainwrap"><div class="train"></div><div class="rails" aria-hidden="true"></div></div><div class="choices"></div>`;
    const COLORS = ['sea', 'grass', 'grape', 'sun'];
    const loco = `<div class="loco" aria-hidden="true"><svg viewBox="0 0 64 56"><circle class="puff" cx="17" cy="4" r="4"/><rect class="dk" x="12" y="8" width="9" height="12" rx="2"/>
      <rect class="body" x="6" y="18" width="34" height="20" rx="7"/><rect class="cab" x="36" y="8" width="24" height="30" rx="4"/><rect class="roof" x="33" y="4" width="30" height="6" rx="3"/>
      <rect class="win" x="42" y="14" width="12" height="10" rx="2"/><polygon class="dk" points="7,30 0,44 10,44"/><rect class="dk" x="4" y="36" width="58" height="5" rx="2"/>
      <circle class="dk" cx="17" cy="45" r="8"/><circle class="hub" cx="17" cy="45" r="3"/><circle class="dk" cx="47" cy="45" r="8"/><circle class="hub" cx="47" cy="45" r="3"/></svg></div>`;
    const wagon = (x, i, q) => `<div class="wagon ${q ? 'q' : COLORS[i % 4]}"><div class="wbody"><span class="cargo">${q ? '?' : x}</span></div><i class="wheel l"></i><i class="wheel r"></i></div>`;
    let r = 0, busy = false;
    function draw() {
      const R = cfg.rounds[r]; CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      const train = $('.train', root);
      const gap = R.q != null;   // q = position of the missing car; default is the end
      train.style.setProperty('--n', R.seq.length + (gap ? 0 : 1));
      train.innerHTML = loco + R.seq.map((x, i) => gap && i === R.q ? wagon('', i, true) : wagon(x, i)).join('') + (gap ? '' : wagon('', R.seq.length, true));
      const ch = $('.choices', root); ch.innerHTML = '';
      R.opts.forEach(o => {
        const b = h(`<button type="button" class="choice">${o}</button>`);
        b.onclick = async () => {
          if (busy) return;
          if (o !== R.ans) { g.mistake(); shake(b); g.say(LINES.tryAgain); return; }
          busy = true;
          const q = $('.wagon.q', root); q.className = 'wagon ' + COLORS[(R.q != null ? R.q : R.seq.length) % 4]; $('.cargo', q).textContent = o; pop(q);
          g.say(LINES.yes); await sleep(800); busy = false; r++;
          if (r < cfg.rounds.length) draw(); else { CH.dotsBar($('.dots', root), cfg.rounds.length, r); train.classList.add('go'); g.finish({ title: 'All aboard!' }); }
        };
        ch.appendChild(b);
      });
    }
    draw();
    return { solve() { const ans = cfg.rounds[r].ans; $$('.choice', root).forEach(b => b.classList.toggle('hint', b.textContent === ans)); return `The missing car is <span class="kbig">${ans}</span>. Look for the glowing button.`; } };
  });

  /* Put picture steps in order (Seed Steps) */
  CH.engine('order', (root, cfg, g) => {
    root.innerHTML = `<div class="slots"></div><div class="cards"></div>`;
    const n = cfg.steps.length;
    root.style.setProperty('--n', n);
    let placed = Array(n).fill(null);
    function draw() {
      const sl = $('.slots', root); sl.innerHTML = '';
      placed.forEach((p, i) => {
        const b = h(`<button type="button" class="slot${p != null ? ' full' : ''}" aria-label="Box ${i + 1}"><b>${i + 1}</b>${p != null ? cfg.steps[p].e : ''}</button>`);
        b.onclick = () => { if (p == null) return; placed[i] = null; g.hide(); draw(); }; sl.appendChild(b);
      });
      const cs = $('.cards', root); cs.innerHTML = '';
      cfg.shuffle.forEach(k => {
        const b = h(`<button type="button" class="pcard" aria-label="${cfg.steps[k].say}">${cfg.steps[k].e}</button>`); b.disabled = placed.includes(k);
        b.onclick = () => { const i = placed.indexOf(null); if (i < 0) return; placed[i] = k; g.say(cfg.steps[k].say); draw(); if (!placed.includes(null)) check(); };
        cs.appendChild(b);
      });
    }
    function check() {
      const wrong = placed.map((p, i) => p !== i);
      if (!wrong.some(Boolean)) return g.finish({ title: 'Your flower grew!' });
      g.mistake();
      $$('.slot', root).forEach((s, i) => { if (wrong[i]) { s.classList.add('wrong'); shake(s); } });
      g.feedback({ ok: false, title: 'Hmm, not quite', msg: 'Tap the red boxes to take those cards back.', btn: 'OK' });
    }
    draw();
    return { solve() { const order = cfg.steps.map(s => s.e).join(' → '); placed = Array(n).fill(null); draw(); return `The order is <span class="kbig">${order}</span>. Tap the cards in that order.`; } };
  });

  /* Write if-then rules, then watch them run (Weather Bear) */
  CH.engine('rules', (root, cfg, g) => {
    root.innerHTML = `<div class="rules"></div><div class="choices items"></div>
      <div class="stage"><span class="sky">🌤️</span><span>${cfg.hero}</span><span class="wear"></span></div>
      <div class="actions"><button type="button" class="btn go">▶ Go</button></div>`;
    const rulesEl = $('.rules', root), sky = $('.sky', root), wear = $('.wear', root);
    const rules = {}; let sel = cfg.conditions[0].e, busy = false;
    function draw(bad = []) {
      rulesEl.innerHTML = '';
      cfg.conditions.forEach(c => {
        const row = h(`<div class="rrow"><span aria-label="${c.name}">${c.e}</span><span class="kw">→</span><span>${cfg.hero}</span>
          <button type="button" class="rslot${sel === c.e ? ' sel' : ''}${bad.includes(c.e) ? ' wrong' : ''}" aria-label="What to wear when ${c.name}">${rules[c.e] || ''}</button></div>`);
        $('.rslot', row).onclick = () => { if (busy) return; sel = c.e; g.hide(); draw(); };
        rulesEl.appendChild(row);
      });
    }
    cfg.items.forEach(it => {
      const b = h(`<button type="button" class="choice" aria-label="${it.say}">${it.e}</button>`);
      b.onclick = () => { if (busy) return; rules[sel] = it.e; g.say(it.say); g.hide(); const next = cfg.conditions.find(c => !rules[c.e]); if (next) sel = next.e; draw(); };
      $('.items', root).appendChild(b);
    });
    $('.go', root).onclick = async () => {
      if (busy) return;
      if (cfg.conditions.some(c => !rules[c.e])) { g.say(LINES.fillFirst); shake(rulesEl); return; }
      busy = true; g.hide();
      const ans = Object.fromEntries(cfg.conditions.map(c => [c.e, c.answer])), bad = [];
      for (const w of cfg.playOrder) { sky.textContent = w; wear.textContent = rules[w]; pop(wear); CH.sfx.step(); if (rules[w] !== ans[w]) bad.push(w); await sleep(1100); }
      busy = false; draw(bad);
      if (!bad.length) return g.finish({ title: 'Snug bear!' });
      g.mistake();
      g.feedback({ ok: false, title: 'Silly bear!', msg: 'Change the red box and try again.', btn: 'Try again', onBtn: () => { sel = bad[0]; draw(); } });
    };
    draw();
    return { solve() { if (busy) return ''; cfg.conditions.forEach(c => { rules[c.e] = c.answer; }); draw();
      return `<span class="kbig">${cfg.conditions.map(c => `${c.e}→${c.answer}`).join('  ')}</span> The rules are filled in: press <b>Go</b>.`; } };
  });

  /* Predict where a program ends (Where Will It Land? and chess / loop / block versions)
     Tokens: U R D L, diagonals UR UL DR DL, knight jumps NUR NRU ..., F LT RT (forward and turns),
     each with an optional count: 'R3' = three steps right. Rounds give p: [tokens] or prog: {main, fn}
     where main items are tokens, '*' (the ⭐ block) or {loop: n, body: [...]}. */
  CH.engine('predict', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><div class="fnshow"></div><div class="tray prog readonly"></div><div class="boardHost"></div>`;
    const tray = $('.prog', root), fnBox = $('.fnshow', root), W = cfg.board.w;
    const TURN = { F: '⬆', LT: '↺', RT: '↻' };
    const parse = t => { const m = /^(N[UDLR]{2}|UR|UL|DR|DL|LT|RT|U|R|D|L|F)(\d*)$/.exec(t); return { base: m[1], n: m[2] ? +m[2] : 1 }; };
    const glyph = b => TURN[b] || (b[0] === 'N' && b.length === 3 ? '♞' + DIRS[b][2] : DIRS[b][2]);
    let r = 0, busy = false, board, steps = [], end = null;
    function chip(t) { const { base, n } = parse(t); const el = h(`<span class="blk${n > 1 || glyph(base).length > 1 ? ' wide' : ''}">${glyph(base)}${n > 1 ? '×' + n : ''}</span>`); return { el, ops: Array(n).fill(base) }; }
    function build(R) {
      tray.innerHTML = ''; fnBox.innerHTML = ''; steps = [];
      let fnChips = [];
      if (R.prog && R.prog.fn) {
        const row = h('<div class="kfn"><b class="kg call">⭐</b><span>=</span></div>');
        fnChips = R.prog.fn.map(t => { const c = chip(t); row.appendChild(c.el); return c; }); fnBox.appendChild(row);
      }
      const emit = (it, box, extra) => {
        if (it === '*') { const el = h('<span class="blk call">⭐</span>'); box.appendChild(el); fnChips.forEach(c => c.ops.forEach(op => steps.push({ op, els: [c.el, el, ...extra] }))); return; }
        if (typeof it === 'string') { const c = chip(it); box.appendChild(c.el); c.ops.forEach(op => steps.push({ op, els: [c.el, ...extra] })); return; }
        const L = h(`<span class="kloop pl">🔁 ${it.loop}×</span>`); box.appendChild(L);
        const start = steps.length; it.body.forEach(b => emit(b, L, [L, ...extra])); const once = steps.slice(start);
        for (let k = 1; k < it.loop; k++) once.forEach(s => steps.push(s));
      };
      (R.p || R.prog.main).forEach(it => emit(it, tray, []));
      // where does it really end? (simulated without walls)
      let x = cfg.board.start[0], y = cfg.board.start[1], hd = cfg.board.heading || 0;
      steps.forEach(({ op }) => {
        if (op === 'LT') hd = (hd + 3) % 4; else if (op === 'RT') hd = (hd + 1) % 4;
        else { const v = DIRS[op === 'F' ? CH.ORDER[hd] : op]; x += v[0]; y += v[1]; }
      });
      end = [x, y];
    }
    function setup() {
      CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      build(cfg.rounds[r]);
      board = CH.makeBoard($('.boardHost', root), cfg.board); board.el.classList.add('pick');
      board.cells.forEach((c, i) => {
        const x = i % W, y = Math.floor(i / W);
        c.setAttribute('role', 'button'); c.tabIndex = 0; c.setAttribute('aria-label', `Square ${x + 1} across, ${y + 1} down`);
        c.onclick = () => choose(x, y, c); c.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(x, y, c); } };
      });
    }
    const light = i => { $$('.now', root).forEach(e => e.classList.remove('now')); if (i >= 0) steps[i].els.forEach(e => e.classList.add('now')); };
    async function choose(x, y, c) {
      if (busy) return; busy = true; g.hide();
      board.cells.forEach(e => e.classList.remove('picked', 'right', 'hint')); c.classList.add('picked');
      await board.run(steps, light); light(-1);
      board.cells[end[1] * W + end[0]].classList.add('right');
      if (x === end[0] && y === end[1]) {
        g.say(LINES.yes); await sleep(900); busy = false; r++;
        if (r < cfg.rounds.length) setup(); else { CH.dotsBar($('.dots', root), cfg.rounds.length, r); g.finish({ title: cfg.winTitle || 'You can read code!' }); }
      } else {
        busy = false; g.mistake();
        g.feedback({ ok: false, title: 'It stopped on the green square', msg: 'Follow the blocks one at a time with your finger.', btn: 'Try again', onBtn: () => { board.reset(); board.cells.forEach(e => e.classList.remove('picked', 'right')); } });
      }
    }
    root.__end = () => end; root.__steps = () => steps.length;   // test hooks
    setup();
    return { solve() { board.cells[end[1] * W + end[0]].classList.add('hint'); return `It stops on the <b>glowing square</b>. Follow the blocks one at a time to see why, then tap it.`; } };
  });
})(window.CH);
