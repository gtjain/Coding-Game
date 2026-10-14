/* More engines for ages 4–6: first loops, mirror words (palindromes), buddy pairs (odd / even),
   and drag-and-drop puzzle pieces. Each engine: (root, cfg, g) => { solve(), unmount?() }. */
(function (CH) {
  const { $, $$, sleep, shake, pop, h, DIRS, DNAME, LINES } = CH;

  /* Build a repeat block that makes the same moves as the target row (Repeat Drum) */
  CH.engine('loopIntro', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><p class="prompt">Make the robot do this:</p><div class="lrow target"></div>
      <div class="loopmaker"><span class="lm-head">🔁 Repeat</span><span class="stepper"><button type="button" class="minus" aria-label="Fewer times">−</button><b class="ln">1</b><button type="button" class="plus" aria-label="More times">+</button></span><span class="lm-head">times:</span><span class="lslots"></span></div>
      <div class="choices licons"></div><div class="actions"><button type="button" class="btn ghost clear">Clear</button><button type="button" class="btn go">▶ Go</button></div>
      <div class="lrow perform" aria-live="polite"></div>`;
    const slotsEl = $('.lslots', root), target = $('.target', root), perform = $('.perform', root);
    let r = 0, n = 1, body = [], busy = false;
    const seqOf = (b, k) => Array.from({ length: k }, () => b).flat();
    function draw() {
      const R = cfg.rounds[r];
      $('.ln', root).textContent = n;
      slotsEl.innerHTML = '';
      R.body.forEach((_, i) => { const b = h(`<button type="button" class="lslot${body[i] ? ' full' : ''}" aria-label="Loop slot ${i + 1}">${body[i] || '?'}</button>`); b.onclick = () => { if (busy) return; body[i] = null; g.hide(); draw(); }; slotsEl.appendChild(b); });
    }
    function setup() {
      const R = cfg.rounds[r]; n = 1; body = Array(R.body.length).fill(null); busy = false;
      CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      target.innerHTML = seqOf(R.body, R.n).map(e => `<span class="li">${e}</span>`).join('');
      perform.innerHTML = '';
      const ic = $('.licons', root); ic.innerHTML = '';
      cfg.icons.forEach(e => { const b = h(`<button type="button" class="choice" data-e="${e}">${e}</button>`); b.onclick = () => { if (busy) return; const k = body.indexOf(null); if (k < 0) { shake(slotsEl); return; } body[k] = e; g.hide(); draw(); }; ic.appendChild(b); });
      draw(); g.say(R.say);
    }
    $('.minus', root).onclick = () => { if (busy) return; n = Math.max(1, n - 1); g.hide(); draw(); };
    $('.plus', root).onclick = () => { if (busy) return; n = Math.min(cfg.max || 6, n + 1); g.hide(); draw(); };
    $('.clear', root).onclick = () => { if (busy) return; n = 1; body = body.map(() => null); perform.innerHTML = ''; g.hide(); draw(); };
    $('.go', root).onclick = async () => {
      if (busy) return;
      if (body.includes(null)) { shake(slotsEl); g.say(LINES.fillFirst); return; }
      busy = true; g.hide(); perform.innerHTML = '';
      const R = cfg.rounds[r], want = seqOf(R.body, R.n), got = seqOf(body, n), tg = $$('.li', target);
      for (let i = 0; i < got.length && i < 12; i++) {
        const s = h(`<span class="li">${got[i]}</span>`); perform.appendChild(s); pop(s); CH.sfx.pop(.9 + (i % 4) * .1, .7);
        tg.forEach((t, k) => t.classList.toggle('now', k === i)); await sleep(380);
      }
      tg.forEach(t => t.classList.remove('now')); busy = false;
      if (got.length === want.length && got.every((e, i) => e === want[i])) {
        g.say(LINES.yes); r++;
        if (r < cfg.rounds.length) { await sleep(700); return setup(); }
        CH.dotsBar($('.dots', root), cfg.rounds.length, r); return g.finish({ title: 'Loop star!' });
      }
      g.mistake();
      g.feedback({ ok: false, title: got.length !== want.length ? `That made ${got.length}, not ${want.length}` : 'Not the same moves', msg: 'Count the pictures in the top row. Check the pictures inside the loop.', btn: 'Try again' });
    };
    setup();
    return { solve() { if (busy) return ''; const R = cfg.rounds[r]; body = [...R.body]; n = R.n; draw();
      return `Repeat <b>${R.n}</b> times: <span class="kbig">${R.body.join(' ')}</span>. It is set for you: press <b>Go</b>.`; } };
  });

  /* Is the word the same backwards? (Mirror Words) */
  CH.engine('mirrorWord', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><div class="mwrow fwd"></div><div class="actions"><button type="button" class="btn alt mflip">🪞 Flip it</button></div>
      <div class="mwrow back" hidden></div><p class="prompt mq" hidden>Is it the same both ways?</p>
      <div class="choices mans" hidden><button type="button" class="choice wide" data-a="yes">✅ Same</button><button type="button" class="choice wide" data-a="no">❌ Different</button></div>`;
    const COLS = ['#FF6150', '#2BAE66', '#3D8BFF', '#FFC23C', '#7559FF', '#FF8FB1', '#2BB3C0'];
    const col = ch => COLS[ch.charCodeAt(0) % COLS.length];
    const tiles = w => [...w].map(ch => `<span class="mwt" style="--c:${col(ch)}">${ch}</span>`).join('');
    let r = 0, busy = false;
    const same = w => w === [...w].reverse().join('');
    function setup() {
      const R = cfg.rounds[r]; busy = false;
      CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      $('.fwd', root).innerHTML = tiles(R.w); $('.back', root).hidden = true; $('.mq', root).hidden = true; $('.mans', root).hidden = true; $('.mflip', root).hidden = false;
      g.say(R.say);
    }
    $('.mflip', root).onclick = async () => {
      if (busy) return; const R = cfg.rounds[r];
      const back = $('.back', root); back.innerHTML = tiles([...R.w].reverse().join('')); back.hidden = false; pop(back); CH.sfx.pop(1.2);
      $('.mflip', root).hidden = true; $('.mq', root).hidden = false; $('.mans', root).hidden = false; g.say(LINES.mirrorAsk);
    };
    $$('.mans button', root).forEach(b => b.onclick = async () => {
      if (busy) return; const R = cfg.rounds[r], right = same(R.w) ? 'yes' : 'no';
      if (b.dataset.a !== right) { g.mistake(); shake(b); g.say(LINES.tryAgain); return; }
      busy = true; pop(b); g.say(LINES.yes); await sleep(1000); r++;
      if (r < cfg.rounds.length) setup(); else { CH.dotsBar($('.dots', root), cfg.rounds.length, r); g.finish({ title: 'Mirror magic!' }); }
    });
    setup();
    return { solve() { const R = cfg.rounds[r], s = same(R.w);
      if ($('.mans', root).hidden) $('.mflip', root).click();
      $$('.mans button', root).forEach(b => b.classList.toggle('hint', b.dataset.a === (s ? 'yes' : 'no')));
      return `<b>${R.w}</b> backwards is <b>${[...R.w].reverse().join('')}</b>. ${s ? 'They are the same, so it is a mirror word!' : 'They are different.'} Tap the glowing answer.`; } };
  });

  /* Pair things up: everyone has a buddy (even) or one is left alone (odd) (Buddy Pairs) */
  CH.engine('pairUp', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><p class="prompt pp"></p><div class="pfield"></div><div class="pairs-out"></div>
      <div class="choices pans" hidden><button type="button" class="choice wide" data-a="even">👯 Even: everyone has a buddy</button><button type="button" class="choice wide" data-a="odd">🙋 Odd: one is left alone</button></div>`;
    const field = $('.pfield', root), out = $('.pairs-out', root), ans = $('.pans', root);
    let r = 0, sel = null, left = 0, busy = false;
    function setup() {
      const R = cfg.rounds[r]; sel = null; left = R.n; busy = false;
      CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      $('.pp', root).textContent = 'Tap two to make a pair.';
      field.innerHTML = ''; out.innerHTML = ''; ans.hidden = true;
      for (let i = 0; i < R.n; i++) { const b = h(`<button type="button" class="pitem" aria-label="${R.name} ${i + 1}">${R.e}</button>`); b.onclick = () => tap(b); field.appendChild(b); }
      g.say(R.say);
    }
    function pairOff(a, b) {
      a.remove(); b.remove(); left -= 2;
      const box = h(`<span class="pbox">${cfg.rounds[r].e}${cfg.rounds[r].e}</span>`); out.appendChild(box); pop(box); CH.sfx.pop(1.1 + out.children.length * .06);
      if (left < 2) { $('.pp', root).textContent = left ? 'One is left alone!' : 'Everyone has a buddy!'; ans.hidden = false; g.say(LINES.pairAsk); }
    }
    function tap(b) {
      if (busy || !ans.hidden) return;
      if (!sel) { sel = b; b.classList.add('sel'); return; }
      if (sel === b) { sel.classList.remove('sel'); sel = null; return; }
      const a = sel; sel = null; pairOff(a, b);
    }
    $$('button', ans).forEach(b => b.onclick = async () => {
      if (busy) return; const R = cfg.rounds[r], right = R.n % 2 ? 'odd' : 'even';
      if (b.dataset.a !== right) { g.mistake(); shake(b); g.say(LINES.tryAgain); return; }
      busy = true; pop(b); g.say(LINES.yes); await sleep(1000); r++;
      if (r < cfg.rounds.length) setup(); else { CH.dotsBar($('.dots', root), cfg.rounds.length, r); g.finish({ title: 'Buddy expert!' }); }
    });
    setup();
    return { solve() {
      const R = cfg.rounds[r]; let items = $$('.pitem', field); if (sel) { sel.classList.remove('sel'); sel = null; }
      while (items.length >= 2) { pairOff(items[0], items[1]); items = $$('.pitem', field); }
      const right = R.n % 2 ? 'odd' : 'even'; $$('button', ans).forEach(b => b.classList.toggle('hint', b.dataset.a === right));
      return `${R.n} makes ${Math.floor(R.n / 2)} pairs${R.n % 2 ? ' and <b>one left over</b>, so it is <b>odd</b>' : ' with nobody left over, so it is <b>even</b>'}. Tap the glowing answer.`;
    } };
  });

  /* Drag puzzle pieces into a program strip, then Go (Puzzle Path) */
  CH.engine('dragCode', (root, cfg, g) => {
    root.innerHTML = `<div class="boardHost"></div><div class="dstrip" aria-label="Program"></div><p class="fine dhint">Drag a piece into the strip. Drag it out to take it away.</p>
      <div class="dpal"></div><div class="actions"><button type="button" class="btn ghost clear">Clear</button><button type="button" class="btn go">▶ Go</button></div>`;
    const board = CH.makeBoard($('.boardHost', root), cfg.board), strip = $('.dstrip', root), pal = $('.dpal', root);
    let prog = [], busy = false, drag = null;
    const piece = (d, cls = '') => `<span class="pz ${cls}" data-d="${d}" aria-label="${DNAME[d]}">${DIRS[d][2]}</span>`;
    function draw() { strip.innerHTML = prog.map((d, i) => piece(d, 'in')).join(''); $$('.pz', strip).forEach((p, i) => p.onpointerdown = e => start(e, prog[i], i)); strip.classList.toggle('empty', !prog.length); }
    CH.ORDER.forEach(d => { const p = h(piece(d)); p.onpointerdown = e => start(e, d, -1); pal.appendChild(p); });
    function start(e, d, from) {
      if (busy) return; e.preventDefault(); g.hide();
      drag = { d, from, x0: e.clientX, y0: e.clientY, moved: false, ghost: null };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', end, { once: true });
    }
    function move(e) {
      if (!drag) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 6) {
        drag.moved = true; drag.ghost = h(piece(drag.d, 'ghost')); document.body.appendChild(drag.ghost);
        if (drag.from >= 0) { prog.splice(drag.from, 1); draw(); }
      }
      if (drag.ghost) { drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px'; strip.classList.toggle('over', over(e)); }
    }
    const over = e => { const r = strip.getBoundingClientRect(); return e.clientX >= r.left - 10 && e.clientX <= r.right + 10 && e.clientY >= r.top - 20 && e.clientY <= r.bottom + 20; };
    function insertAt(e) {
      const ps = $$('.pz', strip);
      return ps.filter(p => { const r = p.getBoundingClientRect(), cy = r.top + r.height / 2; return e.clientY > r.bottom || (Math.abs(e.clientY - cy) <= r.height / 2 + 4 && e.clientX > r.left + r.width / 2); }).length;
    }
    function end(e) {
      window.removeEventListener('pointermove', move);
      if (!drag) return; const D = drag; drag = null; strip.classList.remove('over');
      if (D.ghost) D.ghost.remove();
      if (!D.moved) {   // a tap: palette piece goes to the end, strip piece comes out
        if (D.from < 0) { if (prog.length < cfg.max) prog.push(D.d); else shake(strip); } else prog.splice(D.from, 1);
        draw(); return;
      }
      if (over(e)) { if (prog.length < cfg.max) { prog.splice(insertAt(e), 0, D.d); CH.sfx.pop(1.2); } else shake(strip); }
      draw();
    }
    $('.clear', root).onclick = () => { if (busy) return; prog = []; draw(); board.reset(); g.hide(); };
    $('.go', root).onclick = async () => {
      if (busy || !prog.length) { shake(strip); return; } busy = true; g.hide();
      const els = $$('.pz', strip);
      const r = await board.run(prog.map(op => ({ op })), i => els.forEach((e, j) => e.classList.toggle('now', j === i)));
      busy = false;
      if (r.ok) return g.finish({ title: cfg.winTitle || 'Puzzle solved!' });
      g.mistake(); if (r.step != null) els[r.step]?.classList.add('bad');
      g.feedback({ ok: false, title: r.step != null ? 'Bump! Something is in the way' : 'Not there yet', msg: 'Move the pieces around and try again.', btn: 'Try again', onBtn: () => { board.reset(); draw(); } });
    };
    draw();
    return { unmount() { window.removeEventListener('pointermove', move); }, solve() { if (busy) return ''; prog = CH.solvePath(cfg.board); draw(); board.reset();
      return `The pieces are <b>${prog.map(d => DIRS[d][2]).join(' ')}</b>. They are in the strip now: press <b>Go</b>.`; } };
  });
})(window.CH);
