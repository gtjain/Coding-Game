/* Shared kit: helpers, voice playback, grid board, block editor. Engines build on this. */
window.CH = window.CH || {};
(function (CH) {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shake = el => { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };
  const pop = el => { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  Object.assign(CH, { $, $$, sleep, esc, shake, pop, pick, h });

  CH.LINES = window.CH_CATALOG.lines;
  CH.engines = {};
  CH.engine = (name, mount) => { CH.engines[name] = mount; };

  /* ---- voice: pre-recorded clips from audio/voices.js; never the robotic browser voice ---- */
  let clip = null;
  CH.voiceMisses = new Set();
  CH.say = text => {
    if (!text) return;
    CH.stopVoice();
    const file = (window.CH_VOICE || {})[text];
    if (!file) { CH.voiceMisses.add(text); return; }
    clip = new Audio(file.startsWith('data:') ? file : 'audio/' + file);
    clip.play().catch(() => {});
  };
  CH.stopVoice = () => { try { clip && clip.pause(); } catch (e) {} };

  /* ---- sound effects: synthesised with Web Audio, so no files to load ---- */
  CH.sfx = (() => {
    let ctx = null;
    const st = { on: true };
    const ac = (force) => {
      if (!st.on && !force) return null;
      if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; try { ctx = new C(); } catch (e) { return null; } }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    };
    // one soft voice: oscillator through a gentle envelope
    function tone(c, { f0, f1 = f0, t = 0, dur = .14, vol = .3, type = 'sine', lp = 2400 }) {
      const s0 = c.currentTime + t, o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
      o.type = type; o.frequency.setValueAtTime(f0, s0); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, s0 + dur * .7);
      fl.type = 'lowpass'; fl.frequency.value = lp;
      g.gain.setValueAtTime(0.0001, s0); g.gain.exponentialRampToValueAtTime(vol, s0 + .012); g.gain.exponentialRampToValueAtTime(0.0001, s0 + dur);
      o.connect(fl).connect(g).connect(c.destination); o.start(s0); o.stop(s0 + dur + .02);
    }
    const jitter = () => 1 + (Math.random() - .5) * .08;
    return {
      // squishy pop: a falling sine "bloop" plus a tiny bubble on top
      pop(pitch = 1, vol = 1) { const c = ac(); if (!c) return; const p = pitch * jitter();
        tone(c, { f0: 560 * p, f1: 190 * p, dur: .13, vol: .32 * vol });
        tone(c, { f0: 1050 * p, f1: 520 * p, t: .018, dur: .07, vol: .07 * vol, type: 'triangle' }); },
      step(i = 0) { this.pop(.75 + (i % 5) * .04, .55); },
      // ascending, gently swelling run on the pentatonic scale when a program starts
      rise() { const c = ac(); if (!c) return;
        [523.25, 587.33, 659.25, 783.99, 880, 1046.5].forEach((f, i) => {
          tone(c, { f0: f, t: i * .085, dur: .32, vol: .05 + i * .028, type: 'triangle', lp: 3200 });
          tone(c, { f0: f / 2, t: i * .085, dur: .3, vol: .03 + i * .012 });
        }); },
      win() { const c = ac(); if (!c) return;
        [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => tone(c, { f0: f, t: i * .1, dur: .5, vol: .16, type: 'triangle', lp: 4000 })); },
      bonk() { const c = ac(); if (!c) return; tone(c, { f0: 260, f1: 120, dur: .22, vol: .25 }); },
      // a soft piano-like note; plays even when sound effects are off, because the music is the game
      note(f, dur = .9) { const c = ac(true); if (!c) return;
        tone(c, { f0: f, dur, vol: .3, type: 'triangle', lp: 2600 });
        tone(c, { f0: f * 2, dur: dur * .5, vol: .06, lp: 3600 }); },
      honk() { const c = ac(); if (!c) return; [0, .22].forEach(t => { tone(c, { f0: 392, t, dur: .18, vol: .2, type: 'square', lp: 1200 }); tone(c, { f0: 494, t, dur: .18, vol: .14, type: 'square', lp: 1200 }); }); },
      get enabled() { return st.on; }, set enabled(v) { st.on = !!v; }
    };
  })();

  /* ---- directions ---- */
  CH.DIRS = { U: [0, -1, '↑'], R: [1, 0, '→'], D: [0, 1, '↓'], L: [-1, 0, '←'] };
  // diagonal steps (bishop) and knight jumps: 2 squares one way, then 1 square the other
  Object.assign(CH.DIRS, { UR: [1, -1, '↗'], UL: [-1, -1, '↖'], DR: [1, 1, '↘'], DL: [-1, 1, '↙'],
    NUR: [1, -2, '2↑1→'], NUL: [-1, -2, '2↑1←'], NDR: [1, 2, '2↓1→'], NDL: [-1, 2, '2↓1←'],
    NRU: [2, -1, '2→1↑'], NRD: [2, 1, '2→1↓'], NLU: [-2, -1, '2←1↑'], NLD: [-2, 1, '2←1↓'] });
  CH.ORDER = ['U', 'R', 'D', 'L'];
  CH.DNAME = { U: 'up', R: 'right', D: 'down', L: 'left' };
  CH.ARROW_OPS = CH.ORDER.map(d => ({ id: d, glyph: CH.DIRS[d][2], label: CH.DNAME[d] }));
  const STEP = 380;
  CH.STEP = STEP;

  CH.dotsBar = (el, n, done) => { el.innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join(''); };

  /* ---- grid board: rows and columns forced equal, so one move = exactly one square ---- */
  window.__boards = [];
  CH.makeBoard = (host, cfg) => {
    const { w, h: H, hero, prize = '', wallIcon = '🌳', bw } = cfg;
    const start = { x: cfg.start[0], y: cfg.start[1] };
    const goal = cfg.goal ? { x: cfg.goal[0], y: cfg.goal[1] } : null;
    let walls = cfg.walls || [];
    if (cfg.path) { const ps = new Set(cfg.path.map(p => p + '')); walls = []; for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) if (!ps.has(x + ',' + y)) walls.push([x, y]); }
    const wallMap = new Map(walls.map(([x, y, ic]) => [x + ',' + y, ic || wallIcon]));
    // items: things to collect on the way ([x, y, icon]); gates: closed squares that open once every item is collected
    const items = (cfg.items || []).map(([x, y, ic]) => ({ x, y, ic })), gates = (cfg.gates || []).map(([x, y, ic]) => ({ x, y, ic: ic || '🚧' }));
    const gateMap = new Map(gates.map(gt => [gt.x + ',' + gt.y, gt]));
    let got = new Set(), open = false;
    const b = document.createElement('div'); b.className = 'board' + (cfg.checker ? ' chk' : '');
    b.style.setProperty('--w', w); b.style.setProperty('--h', H); if (bw) b.style.setProperty('--bw', bw + 'px');
    const cells = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) {
      const c = document.createElement('div'); const k = x + ',' + y; c.className = 'cell' + (cfg.checker && (x + y) % 2 ? ' dk' : '');
      if (wallMap.has(k)) { c.classList.add('wall'); c.textContent = wallMap.get(k); }
      if (goal && x === goal.x && y === goal.y) c.textContent = prize;
      cells.push(c); b.appendChild(c);
    }
    const cellAt = (x, y) => cells[y * w + x];
    function drawExtras() {
      items.forEach((it, i) => { const c = cellAt(it.x, it.y); c.textContent = got.has(i) ? '' : it.ic; c.classList.toggle('item', !got.has(i)); });
      gates.forEach(gt => { const c = cellAt(gt.x, gt.y); c.textContent = open ? '' : gt.ic; c.classList.toggle('wall', !open); c.classList.toggle('gate', !open); });
    }
    const s = document.createElement('div'); s.className = 'sprite';
    s.innerHTML = `<span>${hero}</span>` + (cfg.heading != null ? '<i class="hdring" aria-hidden="true"></i>' : '');
    b.appendChild(s);
    const ring = $('.hdring', s);
    host.innerHTML = ''; host.appendChild(b);
    let pos, head, deg;
    const place = (x, y) => { s.style.left = (x * 100 / w) + '%'; s.style.top = (y * 100 / H) + '%'; };
    const turnTo = () => { if (ring) ring.style.transform = `rotate(${deg}deg)`; };
    const reset = () => { s.classList.remove('bump', 'win'); pos = { ...start }; head = cfg.heading || 0; deg = head * 90; place(pos.x, pos.y); turnTo(); got = new Set(); open = !items.length; drawExtras(); };
    const blocked = (x, y) => x < 0 || y < 0 || x >= w || y >= H || wallMap.has(x + ',' + y) || (!open && gateMap.has(x + ',' + y));
    const left = () => items.length - got.size;
    reset();
    // one command; resolves 'ok' | 'bump' | 'goal'
    async function act(op) {
      if (op === 'RT' || op === 'LT') { const t = op === 'RT' ? 1 : -1; head = (head + t + 4) % 4; deg += t * 90; turnTo(); await sleep(STEP); return 'ok'; }
      const d = op === 'F' ? CH.ORDER[head] : op;
      const [dx, dy] = CH.DIRS[d], nx = pos.x + dx, ny = pos.y + dy;
      if (blocked(nx, ny)) {
        s.classList.remove('bump'); place(pos.x + dx * .3, pos.y + dy * .3); await sleep(160); place(pos.x, pos.y);
        void s.offsetWidth; s.classList.add('bump'); CH.sfx.bonk(); await sleep(450); return 'bump';
      }
      pos = { x: nx, y: ny }; place(nx, ny); CH.sfx.step(nx + ny); await sleep(STEP);
      const it = items.findIndex((t, i) => !got.has(i) && t.x === nx && t.y === ny);
      if (it >= 0) {
        got.add(it); CH.sfx.pop(1.6); if (!left()) open = true; drawExtras();
        const c = cellAt(nx, ny); c.classList.remove('gotit'); void c.offsetWidth; c.classList.add('gotit');
      }
      if (goal && nx === goal.x && ny === goal.y && !left()) { s.classList.add('win'); return 'goal'; }
      return 'ok';
    }
    async function run(steps, onStep = () => {}) {
      reset(); await sleep(200);
      for (let i = 0; i < steps.length; i++) {
        onStep(i);
        const r = await act(steps[i].op);
        if (r === 'bump') return { ok: false, step: i };
        if (r === 'goal') { onStep(-1); return { ok: true }; }
      }
      onStep(-1); return { ok: !goal, step: null, left: left() };
    }
    const api = { run, act, reset, cells, el: b, w, h: H, place, sprite: s, blocked, left, items };
    window.__boards.push(api);
    return api;
  };

  // Shortest route as arrow letters. With items, every item must be picked up first (and gates open after that).
  CH.solvePath = cfg => {
    const { w, h: H } = cfg, key = (x, y) => x + ',' + y;
    let walls = new Set((cfg.walls || []).map(([x, y]) => key(x, y)));
    if (cfg.path) { const ps = new Set(cfg.path.map(p => p + '')); walls = new Set(); for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) if (!ps.has(key(x, y))) walls.add(key(x, y)); }
    const items = (cfg.items || []).map(([x, y]) => key(x, y)), full = (1 << items.length) - 1;
    const gates = new Set((cfg.gates || []).map(([x, y]) => key(x, y)));
    const [sx, sy] = cfg.start, [gx, gy] = cfg.goal, sk = key(sx, sy) + ',0', prev = new Map([[sk, null]]), q = [[sx, sy, 0]];
    let endKey = null;
    while (q.length) {
      const [x, y, m] = q.shift(); if (x === gx && y === gy && m === full) { endKey = key(x, y) + ',' + m; break; }
      for (const d of CH.ORDER) { const nx = x + CH.DIRS[d][0], ny = y + CH.DIRS[d][1], ck = key(nx, ny);
        if (nx < 0 || ny < 0 || nx >= w || ny >= H || walls.has(ck) || (gates.has(ck) && m !== full)) continue;
        const bit = items.indexOf(ck), nm = bit >= 0 ? m | (1 << bit) : m, k = ck + ',' + nm;
        if (prev.has(k)) continue; prev.set(k, [key(x, y) + ',' + m, d]); q.push([nx, ny, nm]); }
    }
    const out = []; let k = endKey;
    while (k && prev.get(k)) { const [pk, d] = prev.get(k); out.unshift(d); k = pk; }
    return out;
  };
  CH.toTurns = (dirs, heading = 0) => {
    const out = []; let hd = heading;
    for (const d of dirs) { const want = CH.ORDER.indexOf(d), diff = (want - hd + 4) % 4;
      if (diff === 1) out.push('RT'); else if (diff === 3) out.push('LT'); else if (diff === 2) out.push('RT', 'RT');
      hd = want; out.push('F'); }
    return out;
  };

  CH.arrowPalette = (host, onPick, big) => {
    CH.ORDER.forEach(d => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'blk' + (big ? ' big' : '');
      b.textContent = CH.DIRS[d][2]; b.setAttribute('aria-label', 'Add ' + CH.DNAME[d]); b.onclick = () => onPick(d); host.appendChild(b);
    });
  };

  /* ---- block editor: main program, Repeat blocks, one custom block ---- */
  CH.makeEditor = (root, { ops, loop = false, func = false, max = 14, words = false, palette = true }) => {
    const tray = $('.prog', root), pal = palette ? $('.palette', root) : null, fnTray = func ? $('.fnbody', root) : null, counter = $('.counter', root);
    const main = [], fn = [];
    let target = main, busy = false, onChange = () => {};
    const op = id => ops.find(o => o.id === id);
    const count = () => main.reduce((n, b) => n + (b.t === 'loop' ? 1 + b.body.length : 1), 0) + fn.length;
    function blk(item, list, i) {
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'blk' + (item.t === 'call' ? ' call' : '');
      b.textContent = item.t === 'call' ? '⭐' : op(item.op).glyph;
      b.setAttribute('aria-label', 'Remove this block');
      b.onclick = e => { e.stopPropagation(); if (busy) return; list.splice(i, 1); changed(); };
      item.el = b; return b;
    }
    function draw() {
      tray.innerHTML = ''; tray.classList.toggle('active', target === main && (loop || func));
      main.forEach((it, i) => {
        if (it.t !== 'loop') { tray.appendChild(blk(it, main, i)); return; }
        const L = document.createElement('div'); L.className = 'loop'; it.el = L;
        L.innerHTML = `<div class="loophead">🔁 Repeat <button type="button" class="minus" aria-label="Fewer times">−</button><span class="n">${it.n}</span><button type="button" class="plus" aria-label="More times">+</button> times<button type="button" class="x" aria-label="Remove repeat">✕</button></div>`;
        const inner = document.createElement('div'); inner.className = 'tray' + (target === it ? ' active' : ''); inner.dataset.empty = 'Tap here, then add blocks';
        it.body.forEach((m, j) => inner.appendChild(blk(m, it.body, j)));
        L.onclick = e => { e.stopPropagation(); if (busy) return; target = it; draw(); };
        $('.minus', L).onclick = e => { e.stopPropagation(); if (busy) return; it.n = Math.max(2, it.n - 1); changed(); };
        $('.plus', L).onclick = e => { e.stopPropagation(); if (busy) return; it.n = Math.min(9, it.n + 1); changed(); };
        $('.x', L).onclick = e => { e.stopPropagation(); if (busy) return; main.splice(i, 1); if (target === it) target = main; changed(); };
        L.appendChild(inner); tray.appendChild(L);
      });
      if (fnTray) { fnTray.innerHTML = ''; fnTray.classList.toggle('active', target === fn); fn.forEach((it, i) => fnTray.appendChild(blk(it, fn, i))); }
      if (counter) counter.textContent = `Blocks: ${count()} of ${max}`;
    }
    function changed() { draw(); onChange(); }
    tray.onclick = () => { if (busy) return; target = main; draw(); };
    if (fnTray) fnTray.onclick = () => { if (busy) return; target = fn; draw(); };
    function add(item) {
      if (busy) return false;
      if (count() >= max) { shake(counter || tray); return false; }
      if (item.t === 'loop' && target !== main) target = main;
      if (item.t === 'call' && target === fn) target = main;   // a block can't call itself, so ⭐ goes to the main program
      const list = target === main ? main : target === fn ? fn : target.body;
      list.push(item); if (item.t === 'loop') target = item;
      changed(); return true;
    }
    if (pal) {
      ops.forEach(o => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'blk' + (words ? ' wide' : '');
        b.textContent = words ? `${o.glyph} ${o.label}` : o.glyph; b.setAttribute('aria-label', 'Add ' + o.label); b.onclick = () => add({ t: 'op', op: o.id }); pal.appendChild(b);
      });
      if (loop) { const b = document.createElement('button'); b.type = 'button'; b.className = 'blk wide loopbtn'; b.textContent = '🔁 Repeat'; b.onclick = () => add({ t: 'loop', n: 2, body: [] }); pal.appendChild(b); }
      if (func) { const b = document.createElement('button'); b.type = 'button'; b.className = 'blk wide callbtn'; b.textContent = '⭐ My block'; b.setAttribute('aria-label', 'Add my block'); b.onclick = () => add({ t: 'call' }); pal.appendChild(b); }
    }
    function flatten() {
      const out = [];
      const push = (it, extra) => {
        if (it.t === 'op') out.push({ op: it.op, els: [it.el, ...extra] });
        else if (it.t === 'call') fn.forEach(f => out.push({ op: f.op, els: [f.el, it.el, ...extra] }));
      };
      main.forEach(it => { if (it.t === 'loop') { for (let k = 0; k < it.n; k++) it.body.forEach(b => push(b, [it.el])); } else push(it, []); });
      return out;
    }
    function highlight(steps, i) { $$('.now', root).forEach(e => e.classList.remove('now')); if (i >= 0) steps[i].els.forEach(e => e && e.classList.add('now')); }
    draw();
    return {
      flatten, count, highlight, redraw: draw, add,
      undo() { if (busy) return; const list = target === main ? main : target === fn ? fn : target.body; if (list.length) { list.pop(); changed(); } else if (target !== main) { target = main; draw(); } },
      clear() { main.length = 0; fn.length = 0; target = main; changed(); },
      // spec: { main: ['R', {loop: 5, body: ['R','U']}, '*'], fn: ['U','R'] }   ('*' = ⭐ My block)
      load(spec) {
        const item = x => x === '*' ? { t: 'call' } : typeof x === 'string' ? { t: 'op', op: x } : { t: 'loop', n: x.loop, body: x.body.map(item) };
        main.length = 0; fn.length = 0; target = main;
        (spec.main || []).forEach(x => main.push(item(x))); (spec.fn || []).forEach(x => fn.push(item(x)));
        changed();
      },
      onChange(f) { onChange = f; },
      get busy() { return busy; }, set busy(v) { busy = v; }
    };
  };

  // Run/Clear wiring shared by block-editor games. Returns go() so voice can trigger a run.
  CH.wireEditor = (root, g, ed, { run, reset, winTitle, bumpTitle, missTitle, levels }) => {
    ed.onChange(() => g.hide());
    const clearBtn = $('.clear', root);
    if (clearBtn) clearBtn.onclick = () => { if (ed.busy) return; ed.clear(); reset(); };
    async function go() {
      if (ed.busy) return;
      const steps = ed.flatten(); if (!steps.length) { shake($('.prog', root)); return; }
      ed.busy = true; g.hide();
      const r = await run(steps, i => ed.highlight(steps, i));
      ed.busy = false;
      if (r.ok) {
        if (levels && levels.hasNext()) g.feedback({ ok: true, title: winTitle, msg: 'Ready for the next one?', btn: 'Next shape', onBtn: () => { levels.next(); ed.clear(); reset(); } });
        else g.finish({ title: winTitle });
      } else {
        g.mistake();
        if (r.step != null) steps[r.step].els[0]?.classList.add('bad');
        g.feedback({ ok: false, title: r.step != null ? bumpTitle : missTitle, msg: 'Fix the program and run again.', btn: 'Try again', onBtn: () => { reset(); ed.redraw(); } });
      }
    }
    const goBtn = $('.go', root); if (goBtn) goBtn.onclick = go;
    return go;
  };
})(window.CH);
