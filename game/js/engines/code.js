/* Coding engines for ages 7–9: grid programs (loops, functions), debugging, counting loops, turtle drawing. */
(function (CH) {
  const { $, $$, sleep, shake, h, DIRS, DNAME, ORDER } = CH;
  // render a program spec as glyphs for the solution key
  const specHTML = (spec, glyph) => {
    const one = x => x === '*' ? '<b class="kg call">⭐</b>' : typeof x === 'string' ? `<b class="kg">${glyph(x)}</b>` : `<span class="kloop">🔁 ${x.loop}× ${x.body.map(one).join(' ')}</span>`;
    return (spec.fn ? `⭐ My block = ${spec.fn.map(one).join(' ')}<br>` : '') + 'Main: ' + spec.main.map(one).join(' ');
  };

  /* Program a grid walker with blocks; optional Repeat and ⭐ My block (Loop Maze, Make-a-Block) */
  CH.engine('codeGrid', (root, cfg, g) => {
    root.innerHTML = `<div class="boardHost"></div><div class="counter"></div>
      ${cfg.func ? '<div class="fnbox"><div class="loophead">⭐ My block is:</div><div class="tray fnbody" data-empty="Tap here, then add arrows"></div></div>' : ''}
      <div class="tray prog" data-empty="Main program"></div><div class="palette"></div>
      <div class="actions"><button type="button" class="btn ghost clear">Clear</button><button type="button" class="btn go">▶ Run</button></div>`;
    const board = CH.makeBoard($('.boardHost', root), cfg.board);
    const ed = CH.makeEditor(root, { ops: CH.ARROW_OPS, loop: cfg.loop, func: cfg.func, max: cfg.max });
    CH.wireEditor(root, g, ed, { run: board.run, reset: board.reset, winTitle: 'Made it!', bumpTitle: 'Bumped into something', missTitle: 'Not there yet' });
    return { solve() { if (ed.busy) return ''; const spec = cfg.solution || { main: CH.solvePath(cfg.board) }; ed.load(spec); board.reset();
      return `${specHTML(spec, d => DIRS[d][2])}<br>It is loaded: press <b>Run</b>.`; } };
  });

  /* Fix one wrong block (Bug Hunt) */
  CH.engine('debug', (root, cfg, g) => {
    root.innerHTML = `<div class="boardHost"></div><div class="tray prog"></div><div class="actions"><button type="button" class="btn go">▶ Run</button></div>`;
    const board = CH.makeBoard($('.boardHost', root), cfg.board), tray = $('.prog', root);
    const prog = [...cfg.buggy];
    let busy = false, edits = 0;
    function draw() {
      tray.innerHTML = '';
      prog.forEach((d, i) => {
        const b = h(`<button type="button" class="blk" aria-label="Block ${i + 1}, ${DNAME[d]}, tap to turn">${DIRS[d][2]}</button>`);
        b.onclick = () => { if (busy) return; prog[i] = ORDER[(ORDER.indexOf(d) + 1) % 4]; edits++; g.hide(); board.reset(); draw(); };
        tray.appendChild(b);
      });
    }
    $('.go', root).onclick = async () => {
      if (busy) return; busy = true; g.hide();
      const els = $$('.blk', tray);
      const r = await board.run(prog.map(op => ({ op })), i => els.forEach((e, j) => e.classList.toggle('now', j === i)));
      busy = false;
      if (r.ok) return g.finish({ title: 'Bug squashed!' });
      if (r.step != null) els[r.step]?.classList.add('bad');
      if (edits === 0) return g.feedback({ ok: false, title: 'There it is', msg: 'The red block is where the robot crashed. The bug is at or before it.', btn: 'Find the bug', onBtn: () => { board.reset(); draw(); } });
      g.mistake();
      g.feedback({ ok: false, title: 'Still buggy', msg: 'Look at the red block and try again.', btn: 'Try again', onBtn: () => { board.reset(); draw(); } });
    };
    draw();
    return { solve() {
      if (busy) return '';
      const fix = CH.solvePath(cfg.board), i = fix.findIndex((d, k) => d !== prog[k]);
      fix.forEach((d, k) => { prog[k] = d; }); draw(); board.reset();
      return i < 0 ? 'The program is already right: press <b>Run</b>.' : `Block ${i + 1} should be <b class="kg">${DIRS[fix[i]][2]}</b>. Fixed: press <b>Run</b>.`;
    } };
  });

  /* Start / stop / jump counter builds towers (Tower Counter) */
  CH.engine('counter', (root, cfg, g) => {
    const stepper = (k, label) => `<span class="stepper" data-k="${k}"><button type="button" class="minus" aria-label="Lower ${label}">−</button><b></b><button type="button" class="plus" aria-label="Raise ${label}">+</button></span>`;
    const U = 16;   // px per block
    root.innerHTML = `<div class="dots"></div><div class="towerwrap"><div class="axis" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<span>${9 - i}</span>`).join('')}</div><div class="towers"></div></div><div class="countbox">count = <b>–</b></div>
      <div class="rule"><div><span class="kw">START</span> at ${stepper('start', 'start')}</div><div><span class="kw">STOP</span> at ${stepper('stop', 'stop')}</div>
      <div><span class="kw">JUMP</span> by</div><div class="chips jumps"></div><div><span class="kw">EACH TIME</span> build a tower as tall as the count</div></div>
      <div class="actions"><button type="button" class="btn go">▶ Count</button></div>`;
    const towers = $('.towers', root), countEl = $('.countbox b', root), jumpsEl = $('.jumps', root);
    const ctl = { ...cfg.start };
    let L = 0, busy = false;
    $$('.stepper', root).forEach(sp => {
      const k = sp.dataset.k;
      $('.minus', sp).onclick = () => { if (busy) return; ctl[k] = Math.max(1, ctl[k] - 1); drawCtl(); };
      $('.plus', sp).onclick = () => { if (busy) return; ctl[k] = Math.min(9, ctl[k] + 1); drawCtl(); };
    });
    cfg.jumps.forEach(j => { const b = h(`<button type="button" class="chip" data-j="${j}">${(j > 0 ? '+' : '−') + Math.abs(j)}</button>`); b.onclick = () => { if (busy) return; ctl.jump = j; drawCtl(); }; jumpsEl.appendChild(b); });
    function drawCtl() { $$('.stepper', root).forEach(sp => $('b', sp).textContent = ctl[sp.dataset.k]); $$('.chip', jumpsEl).forEach(b => b.setAttribute('aria-pressed', +b.dataset.j === ctl.jump)); g.hide(); }
    function drawTowers(n) { const T = cfg.levels[L]; n = Math.max(n, T.length); towers.innerHTML = Array.from({ length: n }, (_, i) => `<div class="tw">${T[i] ? `<div class="ghost" style="height:${T[i] * U}px"></div>` : ''}<div class="solid"></div></div>`).join(''); }
    function setup() { CH.dotsBar($('.dots', root), cfg.levels.length, L); drawTowers(0); countEl.textContent = '–'; drawCtl(); }
    $('.go', root).onclick = async () => {
      if (busy) return; busy = true; g.hide();
      const seq = [];
      for (let c = ctl.start; ctl.jump > 0 ? c <= ctl.stop : c >= ctl.stop; c += ctl.jump) { seq.push(c); if (seq.length >= 10) break; }
      const T = cfg.levels[L];
      drawTowers(seq.length);
      const solids = $$('.solid', towers);
      for (let i = 0; i < seq.length; i++) { countEl.textContent = seq[i]; solids[i].style.height = seq[i] * U + 'px'; CH.sfx.pop(.7 + seq[i] * .08, .7); if (seq[i] !== T[i]) solids[i].classList.add('bad'); await sleep(500); }
      busy = false;
      if (seq.length === T.length && seq.every((v, i) => v === T[i])) {
        if (L < cfg.levels.length - 1) return g.feedback({ ok: true, title: 'Perfect skyline!', msg: 'The next skyline is different. Look closely.', btn: 'Next skyline', onBtn: () => { L++; setup(); } });
        return g.finish({ title: 'Counting champion!' });
      }
      g.mistake();
      g.feedback({ ok: false, title: seq.length ? 'Not the same skyline' : 'Nothing was built', msg: seq.length ? 'Compare your towers with the outlines. Check start, stop and jump.' : 'The machine never reached the stop number. Which way should it jump?', btn: 'Try again' });
    };
    setup();
    return { solve() {
      if (busy) return '';
      const T = cfg.levels[L]; ctl.start = T[0]; ctl.stop = T[T.length - 1]; ctl.jump = T[1] - T[0]; drawCtl();
      return `START at <b>${ctl.start}</b>, STOP at <b>${ctl.stop}</b>, JUMP by <b>${ctl.jump > 0 ? '+' : '−'}${Math.abs(ctl.jump)}</b>. Set for you: press <b>Count</b>.`;
    } };
  });

  /* Turtle drawing with relative turns (Draw Bot) */
  CH.engine('turtle', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><div class="paper"></div><div class="counter"></div><div class="tray prog" data-empty="Main program"></div><div class="palette"></div>
      <div class="actions"><button type="button" class="btn ghost clear">Clear</button><button type="button" class="btn go">▶ Draw</button></div>`;
    const N = cfg.n, G = 40, PAD = 20, VEC = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    let si = 0, T, pos, dir, deg;
    const px = v => PAD + v * G;
    const key = (a, b) => [a, b].map(p => p.join(',')).sort().join('|');
    const trace = (sol, start, d0) => { const segs = new Set(); let p = [...start], d = d0; for (const op of sol) { if (op === 'F') { const n = [p[0] + VEC[d][0], p[1] + VEC[d][1]]; segs.add(key(p, n)); p = n; } else d = (d + (op === 'R' ? 1 : 3)) % 4; } return segs; };
    const host = $('.paper', root), size = 2 * PAD + (N - 1) * G;
    host.innerHTML = `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Drawing paper"><g class="dotg"></g><g class="tgt"></g><g class="ink"></g><g class="turtle"><polygon points="0,-13 10,10 0,5 -10,10"/></g></svg>`;
    const svg = $('svg', host), tgt = $('.tgt', svg), ink = $('.ink', svg), tur = $('.turtle', svg);
    let dots = ''; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) dots += `<circle cx="${px(x)}" cy="${px(y)}" r="4"/>`;
    $('.dotg', svg).innerHTML = dots;
    const line = (a, b) => `<line x1="${px(a[0])}" y1="${px(a[1])}" x2="${px(b[0])}" y2="${px(b[1])}"/>`;
    const placeT = () => { tur.style.transform = `translate(${px(pos[0])}px,${px(pos[1])}px) rotate(${deg}deg)`; };
    const reset = () => { pos = [...T.start]; dir = T.dir; deg = dir * 90; ink.innerHTML = ''; placeT(); };
    function setup() {
      T = cfg.shapes[si]; T.segs = trace(T.sol, T.start, T.dir);
      tgt.innerHTML = [...T.segs].map(k => { const [a, b] = k.split('|').map(s => s.split(',').map(Number)); return line(a, b); }).join('');
      CH.dotsBar($('.dots', root), cfg.shapes.length, si); reset();
    }
    async function run(steps, onStep) {
      reset(); await sleep(200);
      const drawn = new Set();
      for (let i = 0; i < steps.length; i++) {
        onStep(i); const op = steps[i].op;
        if (op === 'F') {
          const n = [pos[0] + VEC[dir][0], pos[1] + VEC[dir][1]];
          if (n[0] < 0 || n[1] < 0 || n[0] >= N || n[1] >= N) { await sleep(300); return { ok: false, step: i }; }
          ink.insertAdjacentHTML('beforeend', line(pos, n)); drawn.add(key(pos, n)); pos = n; CH.sfx.step(i);
        } else { const t = op === 'R' ? 1 : -1; dir = (dir + t + 4) % 4; deg += t * 90; }
        placeT(); await sleep(CH.STEP);
      }
      onStep(-1);
      return drawn.size === T.segs.size && [...drawn].every(k => T.segs.has(k)) ? { ok: true } : { ok: false, step: null };
    }
    setup();
    const ed = CH.makeEditor(root, { ops: [{ id: 'F', glyph: '⬆', label: 'forward' }, { id: 'R', glyph: '↻', label: 'turn right' }, { id: 'L', glyph: '↺', label: 'turn left' }], loop: true, max: 16 });
    CH.wireEditor(root, g, ed, { run, reset, winTitle: 'Masterpiece!', bumpTitle: 'Off the paper!', missTitle: 'Not the same shape',
      levels: { hasNext: () => si < cfg.shapes.length - 1, next: () => { si++; setup(); } } });
    return { solve() {
      if (ed.busy) return '';
      const sol = T.sol; let unit = sol;
      for (let len = 1; len <= sol.length; len++) if (sol.length % len === 0 && sol.slice(0, len).repeat(sol.length / len) === sol) { unit = sol.slice(0, len); break; }
      const k = sol.length / unit.length, spec = { main: k > 1 ? [{ loop: k, body: [...unit] }] : [...unit] };
      ed.load(spec); reset();
      return `${specHTML(spec, o => ({ F: '⬆', R: '↻', L: '↺' })[o])}<br>It is loaded: press <b>Draw</b>.`;
    } };
  });
})(window.CH);
