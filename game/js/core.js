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

  /* ---- directions ---- */
  CH.DIRS = { U: [0, -1, '↑'], R: [1, 0, '→'], D: [0, 1, '↓'], L: [-1, 0, '←'] };
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
    const b = document.createElement('div'); b.className = 'board';
    b.style.setProperty('--w', w); b.style.setProperty('--h', H); if (bw) b.style.setProperty('--bw', bw + 'px');
    const cells = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) {
      const c = document.createElement('div'); const k = x + ',' + y; c.className = 'cell';
      if (wallMap.has(k)) { c.classList.add('wall'); c.textContent = wallMap.get(k); }
      if (goal && x === goal.x && y === goal.y) c.textContent = prize;
      cells.push(c); b.appendChild(c);
    }
    const s = document.createElement('div'); s.className = 'sprite';
    s.innerHTML = `<span>${hero}</span>` + (cfg.heading != null ? '<i class="hdring" aria-hidden="true"></i>' : '');
    b.appendChild(s);
    const ring = $('.hdring', s);
    host.innerHTML = ''; host.appendChild(b);
    let pos, head, deg;
    const place = (x, y) => { s.style.left = (x * 100 / w) + '%'; s.style.top = (y * 100 / H) + '%'; };
    const turnTo = () => { if (ring) ring.style.transform = `rotate(${deg}deg)`; };
    const reset = () => { s.classList.remove('bump', 'win'); pos = { ...start }; head = cfg.heading || 0; deg = head * 90; place(pos.x, pos.y); turnTo(); };
    const blocked = (x, y) => x < 0 || y < 0 || x >= w || y >= H || wallMap.has(x + ',' + y);
    reset();
    // one command; resolves 'ok' | 'bump' | 'goal'
    async function act(op) {
      if (op === 'RT' || op === 'LT') { const t = op === 'RT' ? 1 : -1; head = (head + t + 4) % 4; deg += t * 90; turnTo(); await sleep(STEP); return 'ok'; }
      const d = op === 'F' ? CH.ORDER[head] : op;
      const [dx, dy] = CH.DIRS[d], nx = pos.x + dx, ny = pos.y + dy;
      if (blocked(nx, ny)) {
        s.classList.remove('bump'); place(pos.x + dx * .3, pos.y + dy * .3); await sleep(160); place(pos.x, pos.y);
        void s.offsetWidth; s.classList.add('bump'); await sleep(450); return 'bump';
      }
      pos = { x: nx, y: ny }; place(nx, ny); await sleep(STEP);
      if (goal && nx === goal.x && ny === goal.y) { s.classList.add('win'); return 'goal'; }
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
      onStep(-1); return { ok: !goal, step: null };
    }
    const api = { run, act, reset, cells, el: b, w, h: H, place, sprite: s, blocked };
    window.__boards.push(api);
    return api;
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
      if (item.t === 'call' && target === fn) { shake(fnTray); return false; }   // a block can't call itself
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
