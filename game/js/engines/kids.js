/* Engines for ages 4–6, batch 4: pixel code, guess-by-questions, swap sorting, event buttons,
   for-each loops and reading a recipe. Each engine: (root, cfg, g) => { solve(), unmount?() }. */
(function (CH) {
  const { $, $$, sleep, shake, pop, h, LINES } = CH;

  /* Read colour code row by row and paint the picture (Dino Pixels) */
  const PX = { W: ['#FFFFFF', 'white'], G: ['#2BAE66', 'green'], R: ['#FF5A4A', 'red'], B: ['#3D8BFF', 'blue'], Y: ['#FFC23C', 'yellow'], K: ['#36405E', 'black'], O: ['#FF9330', 'orange'], P: ['#9B6BFF', 'purple'] };
  const runs = row => { const out = []; for (const c of row) { const l = out[out.length - 1]; if (l && l[0] === c) l[1]++; else out.push([c, 1]); } return out; };
  CH.engine('pixelPaint', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><div class="pxcode" aria-label="Colour code"></div><div class="pxgrid"></div><div class="pxpal" aria-label="Paint colours"></div>
      <div class="actions"><button type="button" class="btn ghost clear">Clear</button><button type="button" class="btn go">✔ Check</button></div>`;
    const code = $('.pxcode', root), grid = $('.pxgrid', root), pal = $('.pxpal', root);
    let r = 0, paint = [], sel = null, busy = false;
    const R = () => cfg.rounds[r];
    const sw = c => `<i class="pxsw${c === 'W' ? ' white' : ''}" style="--c:${PX[c][0]}"></i>`;
    function setup() {
      const rows = R().rows, w = rows[0].length; busy = false;
      CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      paint = rows.map(row => Array(row.length).fill('W'));
      code.innerHTML = rows.map((row, y) => `<div class="pxline" data-y="${y}"><b class="pxn">${y + 1}</b>${runs(row).map(([c, n]) => `<span class="pxrun" aria-label="${n} ${PX[c][1]}">${sw(c)}<b>×${n}</b></span>`).join('')}</div>`).join('');
      grid.style.setProperty('--w', w);
      grid.innerHTML = rows.map((row, y) => `<b class="pxn">${y + 1}</b>` + [...row].map((_, x) => `<button type="button" class="pxc" data-x="${x}" data-y="${y}" aria-label="Row ${y + 1}, square ${x + 1}"></button>`).join('')).join('');
      $$('.pxc', grid).forEach(b => b.onclick = () => tap(+b.dataset.x, +b.dataset.y, b));
      const used = [...new Set(rows.join(''))].filter(c => c !== 'W');
      pal.innerHTML = '';
      [...used, 'W'].forEach(c => {
        const b = h(`<button type="button" class="pxpick" data-c="${c}" aria-label="${c === 'W' ? 'Rubber' : PX[c][1]}">${c === 'W' ? '🧽' : sw(c)}</button>`);
        b.onclick = () => { sel = c; g.hide(); drawPal(); }; pal.appendChild(b);
      });
      sel = used[0]; drawPal(); draw();
    }
    const drawPal = () => $$('.pxpick', pal).forEach(b => b.setAttribute('aria-pressed', b.dataset.c === sel));
    function draw(bad = []) {
      $$('.pxc', grid).forEach(b => { const c = paint[+b.dataset.y][+b.dataset.x]; b.style.background = PX[c][0]; b.classList.toggle('wrong', bad.includes(b)); });
    }
    function tap(x, y, b) {
      if (busy) return; g.hide();
      paint[y][x] = paint[y][x] === sel ? 'W' : sel; CH.sfx.pop(1.1, .6); pop(b);
      $$('.pxline', code).forEach(l => l.classList.toggle('now', +l.dataset.y === y));
      draw();
    }
    $('.clear', root).onclick = () => { if (busy) return; paint = paint.map(row => row.map(() => 'W')); g.hide(); draw(); };
    $('.go', root).onclick = async () => {
      if (busy) return;
      const rows = R().rows, bad = $$('.pxc', grid).filter(b => paint[+b.dataset.y][+b.dataset.x] !== rows[+b.dataset.y][+b.dataset.x]);
      if (bad.length) {
        draw(bad); g.mistake(); bad.forEach(shake);
        return g.feedback({ ok: false, title: `${bad.length === 1 ? 'One square is' : bad.length + ' squares are'} not right`, msg: 'Look at the red squares. Read that row of code again.', btn: 'Try again' });
      }
      busy = true; grid.classList.add('done'); CH.sfx.win(); await sleep(900); grid.classList.remove('done'); r++;
      if (r < cfg.rounds.length) return g.feedback({ ok: true, title: `You made ${cfg.rounds[r - 1].name}!`, msg: 'Next picture.', btn: 'Next', onBtn: setup });
      CH.dotsBar($('.dots', root), cfg.rounds.length, r); g.finish({ title: cfg.winTitle || 'Pixel artist!' });
    };
    setup();
    root.__answer = () => R().rows;   // test hook
    return { solve() { if (busy) return ''; paint = R().rows.map(row => [...row]); draw();
      return `Each row of code says which colours to paint, left to right. The picture is painted in for you: press <b>Check</b>.`; } };
  });

  /* Ask yes / no questions to cross animals out, then tap the secret one (Guess My Animal) */
  CH.engine('guessWho', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><p class="gwho">🙈 I'm thinking of one animal. Ask me!</p><div class="gqs"></div><div class="glog" aria-live="polite"></div><div class="gcards"></div>`;
    const A = Object.fromEntries(cfg.animals.map(a => [a.e, a]));
    let r = 0, busy = false;
    const R = () => cfg.rounds[r];
    function setup() {
      busy = false; CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      $('.glog', root).innerHTML = '';
      $('.gqs', root).innerHTML = ''; cfg.questions.forEach(q => { const b = h(`<button type="button" class="choice wide gq" data-k="${q.k}">${q.q}</button>`); b.onclick = () => ask(q, b); $('.gqs', root).appendChild(b); });
      $('.gcards', root).innerHTML = ''; R().pool.forEach(e => { const b = h(`<button type="button" class="choice gcard" data-e="${e}" aria-label="${A[e].name}">${e}</button>`); b.onclick = () => guess(e, b); $('.gcards', root).appendChild(b); });
    }
    function ask(q, b) {
      if (busy || b.disabled) return; g.hide();
      const yes = !!A[R().secret].f[q.k]; b.disabled = true;
      g.say(q.say); setTimeout(() => g.say(yes ? LINES.yes : LINES.no), 1300);
      $('.glog', root).appendChild(h(`<span class="gans ${yes ? 'y' : 'n'}">${q.q} <b>${yes ? 'Yes' : 'No'}</b></span>`));
      $$('.gcard', root).forEach(c => { if (!!A[c.dataset.e].f[q.k] !== yes && !c.classList.contains('out')) { c.classList.add('out'); c.setAttribute('aria-label', A[c.dataset.e].name + ', crossed out'); } });
    }
    async function guess(e, b) {
      if (busy) return;
      if (b.classList.contains('out')) { shake(b); g.say(LINES.crossedOut); return; }
      if (e !== R().secret) { g.mistake(); shake(b); b.classList.add('out'); g.say(LINES.tryAgain); return; }
      busy = true; b.classList.add('right'); pop(b); g.say(LINES.yes); await sleep(900); r++;
      if (r < cfg.rounds.length) return g.feedback({ ok: true, title: `Yes, the ${A[e].name}!`, msg: 'I am thinking of a new one.', btn: 'Next', onBtn: setup });
      CH.dotsBar($('.dots', root), cfg.rounds.length, r); g.finish({ title: 'Super detective!' });
    }
    setup();
    root.__secret = () => R().secret;   // test hook
    return { solve() {
      const s = A[R().secret]; $$('.gcard', root).forEach(c => c.classList.toggle('hint', c.dataset.e === s.e));
      return `It is the <b>${s.name}</b> ${s.e}. A good question splits the animals into two groups, so ask, then tap the one that is left.`; } };
  });

  /* Swap two neighbours that are in the wrong order until they go small to big (Dino Line-up) */
  CH.engine('swapSort', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><p class="fine sline">Small ➜ big</p><div class="srow"></div><p class="fine scount"></p>`;
    const row = $('.srow', root);
    let r = 0, a = [], sel = -1, swaps = 0, busy = false;
    function setup() { a = [...cfg.rounds[r]]; sel = -1; swaps = 0; busy = false; CH.dotsBar($('.dots', root), cfg.rounds.length, r); draw(); }
    function draw() {
      row.innerHTML = '';
      a.forEach((v, i) => {
        const b = h(`<button type="button" class="sitem${i === sel ? ' sel' : ''}" style="--s:${v}" aria-label="${cfg.name} size ${v}"><span>${cfg.e}</span></button>`);
        b.onclick = () => tap(i); row.appendChild(b);
      });
      $('.scount', root).textContent = `Swaps: ${swaps}`;
    }
    async function tap(i) {
      if (busy) return; g.hide();
      if (sel < 0 || sel === i) { sel = sel === i ? -1 : i; draw(); return; }
      if (Math.abs(sel - i) !== 1) { sel = i; draw(); return; }
      const [l, rr] = [Math.min(sel, i), Math.max(sel, i)];
      if (a[l] < a[rr]) { g.mistake(); sel = -1; draw(); shake(row.children[l]); shake(row.children[rr]); g.say(LINES.alreadyOrder); return; }
      [a[l], a[rr]] = [a[rr], a[l]]; swaps++; sel = -1; CH.sfx.pop(1.2); draw(); pop(row.children[l]); pop(row.children[rr]);
      if (a.every((v, k) => k === 0 || a[k - 1] < v)) {
        busy = true; g.say(LINES.yes); await sleep(900); r++;
        if (r < cfg.rounds.length) return g.feedback({ ok: true, title: `Lined up in ${swaps} swap${swaps === 1 ? '' : 's'}!`, msg: 'Here come more.', btn: 'Next', onBtn: setup });
        CH.dotsBar($('.dots', root), cfg.rounds.length, r); g.finish({ title: cfg.winTitle || 'All lined up!' });
      }
    }
    setup();
    root.__row = () => [...a];   // test hook
    return { solve() {
      const k = a.findIndex((v, i) => i < a.length - 1 && v > a[i + 1]); if (k < 0) return '';
      [k, k + 1].forEach(i => row.children[i].classList.add('hint'));
      return `Find two neighbours where the <b>big one is first</b>. Tap both glowing ones to swap them. Keep going until they go small to big.`; } };
  });

  /* Wire each button to an action, then press the buttons when asked (Car Buttons) */
  CH.engine('eventButtons', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><div class="evwire"></div><div class="choices evacts"></div>
      <div class="actions evgo"><button type="button" class="btn go">▶ Start</button></div>
      <div class="evplay" hidden><div class="stage evstage"><span class="evhero">${cfg.hero}</span><span class="evfx"></span></div><p class="evask"></p><div class="evbtns"></div></div>`;
    const ACT = Object.fromEntries(cfg.actions.map(a => [a.id, a]));
    const COL = { red: '#FF5A4A', green: '#2BAE66', blue: '#3D8BFF', yellow: '#FFC23C' };
    let r = 0, wire = {}, sel = null, step = 0, busy = false, playing = false;
    const R = () => cfg.rounds[r];
    function setup() {
      wire = {}; step = 0; busy = false; playing = false; sel = R().buttons[0];
      CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      $('.evplay', root).hidden = true; $('.evwire', root).hidden = false; $('.evacts', root).hidden = false; $('.evgo', root).hidden = false;
      $('.evacts', root).innerHTML = '';
      R().actions.forEach(id => { const b = h(`<button type="button" class="choice" aria-label="${ACT[id].name}">${ACT[id].e}</button>`); b.onclick = () => put(id); $('.evacts', root).appendChild(b); });
      drawWire();
    }
    function drawWire(bad) {
      const el = $('.evwire', root); el.innerHTML = '';
      R().buttons.forEach(k => {
        const row = h(`<div class="rrow"><span class="kw">WHEN I TAP</span><span class="evb" style="--c:${COL[k]}" aria-label="${k} button"></span><span class="kw">→</span>
          <button type="button" class="rslot${sel === k ? ' sel' : ''}${bad === k ? ' wrong' : ''}" aria-label="What this button does">${wire[k] ? ACT[wire[k]].e : ''}</button></div>`);
        $('.rslot', row).onclick = () => { if (playing) return; sel = k; g.hide(); drawWire(); };
        el.appendChild(row);
      });
    }
    function put(id) {
      if (playing) return; g.hide();
      Object.keys(wire).forEach(k => { if (wire[k] === id) delete wire[k]; });   // one action per button
      wire[sel] = id; CH.sfx.pop(1.2);
      const next = R().buttons.find(k => !wire[k]); if (next) sel = next; drawWire();
    }
    $('.go', root).onclick = () => {
      if (playing) return;
      if (R().buttons.some(k => !wire[k])) { g.say(LINES.fillFirst); shake($('.evwire', root)); return; }
      playing = true; step = 0; g.hide();
      $('.evwire', root).hidden = true; $('.evacts', root).hidden = true; $('.evgo', root).hidden = true; $('.evplay', root).hidden = false;
      const bt = $('.evbtns', root); bt.innerHTML = '';
      R().buttons.forEach(k => { const b = h(`<button type="button" class="evbig" style="--c:${COL[k]}" data-k="${k}" aria-label="${k} button"><small>${ACT[wire[k]].e}</small></button>`); b.onclick = () => press(k, b); bt.appendChild(b); });
      askNext();
    };
    function askNext() { const a = ACT[R().asks[step]]; $('.evask', root).textContent = a.say; g.say(a.say); }
    async function press(k, b) {
      if (busy) return; busy = true;
      const id = wire[k], want = R().asks[step], fx = $('.evfx', root);
      fx.textContent = ACT[id].e; pop(fx); pop(b); if (id === 'honk') CH.sfx.honk(); else if (id === 'music') [523.25, 659.25, 783.99].forEach((f, i) => setTimeout(() => CH.sfx.note(f, .4), i * 140)); else CH.sfx.pop(1.3);
      await sleep(700); busy = false;
      if (id !== want) { g.mistake(); shake(b); g.say(LINES.tryAgain); return; }
      step++;
      if (step < R().asks.length) return askNext();
      busy = true; g.say(LINES.yes); await sleep(800); r++;
      if (r < cfg.rounds.length) return g.feedback({ ok: true, title: 'Every button worked!', msg: 'Now a car with more buttons.', btn: 'Next', onBtn: setup });
      CH.dotsBar($('.dots', root), cfg.rounds.length, r); g.finish({ title: 'Beep beep! Great driving!' });
    }
    setup();
    return { solve() {
      if (!playing) { R().buttons.forEach((k, i) => { wire[k] = R().actions[i]; }); drawWire();
        return `Any wiring works, as long as every button does something different. The buttons are wired for you: press <b>Start</b>, then tap the button that does what the car is asked.`; }
      const k = R().buttons.find(k => wire[k] === R().asks[step]); $$('.evbig', root).forEach(b => b.classList.toggle('hint', b.dataset.k === k));
      return `Your wiring says this button does ${ACT[R().asks[step]].e}. Tap the <b>glowing button</b>.`; } };
  });

  /* One loop runs once for every fish (Feed Every Fish) */
  CH.engine('forEach', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><div class="fishrow"></div>
      <div class="loopmaker febox"><span>🔁 For each ${cfg.e}:</span><span>give</span><span class="stepper"><button type="button" class="minus" aria-label="Less food">−</button><b class="fen">1</b><button type="button" class="plus" aria-label="More food">+</button></span><span>${cfg.food}</span>
        <div class="feif" hidden><span class="kw">IF</span> 💤 <span class="kw">THEN</span><button type="button" class="chip" data-r="feed" aria-pressed="true">feed it</button><button type="button" class="chip" data-r="skip" aria-pressed="false">skip it</button></div></div>
      <p class="fine fenote"></p><div class="actions"><button type="button" class="btn go">▶ Go</button></div>`;
    let r = 0, n = 1, rule = 'feed', busy = false;
    const R = () => cfg.rounds[r];
    function setup() {
      n = 1; rule = 'feed'; busy = false; CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      $('.feif', root).hidden = !R().ifs; drawRule();
      $('.fishrow', root).innerHTML = R().fish.map((z, i) => `<div class="fish${z ? ' zz' : ''}" data-i="${i}"><span class="fwant">${z ? '💤' : cfg.food.repeat(R().want)}</span><span class="fe">${cfg.e}</span><span class="fplate"></span></div>`).join('');
      $('.fenote', root).textContent = `${R().fish.length} ${cfg.many}, so the loop runs ${R().fish.length} times.`;
    }
    function drawRule() { $('.fen', root).textContent = n; $$('.feif .chip', root).forEach(c => c.setAttribute('aria-pressed', c.dataset.r === rule)); }
    $('.minus', root).onclick = () => { if (busy) return; n = Math.max(1, n - 1); g.hide(); drawRule(); };
    $('.plus', root).onclick = () => { if (busy) return; n = Math.min(4, n + 1); g.hide(); drawRule(); };
    $$('.feif .chip', root).forEach(c => c.onclick = () => { if (busy) return; rule = c.dataset.r; g.hide(); drawRule(); });
    $('.go', root).onclick = async () => {
      if (busy) return; busy = true; g.hide(); CH.sfx.rise();
      const fish = $$('.fish', root), box = $('.febox', root); let bad = null;
      fish.forEach(f => { $('.fplate', f).textContent = ''; f.classList.remove('now', 'wrong'); });
      for (let i = 0; i < fish.length; i++) {
        fish.forEach((f, j) => f.classList.toggle('now', i === j)); pop(box);
        const zz = R().fish[i], give = zz && rule === 'skip' ? 0 : n;
        for (let k = 0; k < give; k++) { $('.fplate', fish[i]).textContent += cfg.food; CH.sfx.pop(1 + k * .15, .6); await sleep(260); }
        if (!give) { $('.fplate', fish[i]).textContent = '⏭️'; await sleep(260); }
        const want = zz ? 0 : R().want;
        if (give !== want && !bad) { bad = { i, zz, give, want }; fish[i].classList.add('wrong'); }
        await sleep(300);
      }
      fish.forEach(f => f.classList.remove('now')); busy = false;
      if (!bad) {
        g.say(LINES.yes); await sleep(600); r++;
        if (r < cfg.rounds.length) return g.feedback({ ok: true, title: `Every ${cfg.one} is happy!`, msg: 'More hungry friends.', btn: 'Next', onBtn: setup });
        CH.dotsBar($('.dots', root), cfg.rounds.length, r); return g.finish({ title: 'Feeding time done!' });
      }
      g.mistake();
      g.feedback({ ok: false, title: bad.zz ? `Shh! You woke a sleepy ${cfg.one}` : bad.give > bad.want ? 'Too much food!' : 'Still hungry!',
        msg: bad.zz ? 'Sleepy ones should be skipped. Change the IF.' : `Each ${cfg.one} wants ${bad.want}. Change the number in the loop.`, btn: 'Try again' });
    };
    setup();
    return { solve() { if (busy) return ''; n = R().want; rule = 'skip'; drawRule();
      return `Give <b>${R().want}</b> to each one${R().ifs ? ', and <b>skip</b> the sleepy ones' : ''}. The loop is set for you: press <b>Go</b>.`; } };
  });

  /* Read the recipe code, pick the snack it makes (Robot Chef) */
  CH.engine('recipe', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><div class="codepanel rcode"></div><p class="fine">The first step goes at the bottom. Which one will the robot make?</p><div class="ropts"></div>`;
    let r = 0, busy = false;
    const flat = code => code.flatMap(x => typeof x === 'string' ? [x] : Array.from({ length: x.loop }, () => x.body).flat());
    const stack = items => `<div class="rstack">${[...items].reverse().map(e => `<span>${e}</span>`).join('')}</div>`;
    function setup() {
      const R = cfg.rounds[r]; busy = false; CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      let k = 0;
      $('.rcode', root).innerHTML = R.code.map(x => typeof x === 'string' ? `<div><b class="pxn">${++k}</b> ${cfg.verb} ${x}</div>`
        : `<div><b class="pxn">${++k}</b> 🔁 repeat ${x.loop} times:</div>` + x.body.map(b => `<div class="in1">${cfg.verb} ${b}</div>`).join('')).join('');
      const o = $('.ropts', root); o.innerHTML = '';
      R.opts.forEach((items, i) => { const b = h(`<button type="button" class="ropt" aria-label="Snack ${i + 1}">${stack(items)}</button>`); b.onclick = () => pick(items, b); o.appendChild(b); });
    }
    async function pick(items, b) {
      if (busy) return;
      const want = flat(cfg.rounds[r].code);
      if (items.join() !== want.join()) { g.mistake(); shake(b); g.say(LINES.tryAgain); return; }
      busy = true; b.classList.add('right'); pop(b); g.say(LINES.yes); await sleep(900); r++;
      if (r < cfg.rounds.length) return g.feedback({ ok: true, title: 'Yum! You read the code!', msg: 'Next recipe.', btn: 'Next', onBtn: setup });
      CH.dotsBar($('.dots', root), cfg.rounds.length, r); g.finish({ title: 'Top chef!' });
    }
    setup();
    return { solve() { const want = flat(cfg.rounds[r].code).join();
      $$('.ropt', root).forEach((b, i) => b.classList.toggle('hint', cfg.rounds[r].opts[i].join() === want));
      return `Bottom to top the robot adds <span class="kbig">${flat(cfg.rounds[r].code).join(' ')}</span>. Tap the glowing snack.`; } };
  });
})(window.CH);
