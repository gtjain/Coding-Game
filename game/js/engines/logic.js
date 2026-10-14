/* Logic and number engines for ages 7–9: if/else sorter, parity rule, variables, place value, palindromes. */
(function (CH) {
  const { $, $$, sleep, shake, pop, h } = CH;

  /* Pick one condition that sorts shapes into two baskets (Sorting Machine) */
  CH.engine('sorter', (root, cfg, g) => {
    const two = !!cfg.two;   // two rules: IF ... ELSE IF ... ELSE, three baskets
    root.innerHTML = `<div class="goal"></div><div class="belt"></div>
      <div class="rule"><div><span class="kw">IF</span>it is…</div><div class="chips c0"></div><div><span class="kw">THEN</span>⬅ left basket</div>
      ${two ? '<div><span class="kw">ELSE IF</span>it is…</div><div class="chips c1"></div><div><span class="kw">THEN</span>⬇ middle basket</div>' : ''}
      <div><span class="kw">ELSE</span>right basket ➡</div></div>
      <div class="baskets${two ? ' three' : ''}"><div class="basket"><h4>⬅ Left</h4><div class="in L"></div></div>${two ? '<div class="basket"><h4>⬇ Middle</h4><div class="in M"></div></div>' : ''}<div class="basket"><h4>Right ➡</h4><div class="in R"></div></div></div>
      <div class="actions"><button type="button" class="btn go">▶ Run machine</button></div>`;
    const COL = { red: '#FF6150', blue: '#3D8BFF', yellow: '#FFC23C' };
    const star = (() => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 7 : 17; p.push((20 + r * Math.cos(a)).toFixed(1) + ',' + (21 + r * Math.sin(a)).toFixed(1)); } return p.join(' '); })();
    const shape = (s, c) => `<svg viewBox="0 0 40 40" aria-hidden="true">${s === 'star' ? `<polygon points="${star}" fill="${c}"/>` : s === 'circle' ? `<circle cx="20" cy="20" r="15" fill="${c}"/>` : `<rect x="6" y="6" width="28" height="28" rx="5" fill="${c}"/>`}</svg>`;
    const conds = [['color', 'red', 'red'], ['color', 'blue', 'blue'], ['color', 'yellow', 'yellow'], ['shape', 'star', 'a star'], ['shape', 'circle', 'a circle'], ['shape', 'square', 'a square']];
    const is = ([s, c], k, v) => (k === 'color' ? c : s) === v;
    const where = (it, a, b) => is(it, a[0], a[1]) ? 'L' : two && b && is(it, b[0], b[1]) ? 'M' : 'R';
    let gi = 0, picks = [null, null], busy = false;
    const goalRule = G => two ? [[G.a.k, G.a.v], [G.b.k, G.b.v]] : [[G.k, G.v], null];
    function draw() {
      $('.goal', root).textContent = `Puzzle ${gi + 1} of ${cfg.goals.length}. ${cfg.goals[gi].text}`;
      $('.belt', root).innerHTML = cfg.items.map(([s, c]) => `<span class="item">${shape(s, COL[c])}</span>`).join('');
      $$('.in', root).forEach(e => { e.innerHTML = ''; });
      [0, 1].forEach(row => {
        const ch = $('.c' + row, root); if (!ch) return; ch.innerHTML = '';
        conds.forEach(c => {
          const b = h(`<button type="button" class="chip" aria-pressed="${picks[row] === c}">${c[0] === 'color' ? `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" fill="${COL[c[1]]}"/></svg>` : shape(c[1], '#55628A')}${c[2]}</button>`);
          b.onclick = () => { if (busy) return; picks[row] = c; g.hide(); draw(); }; ch.appendChild(b);
        });
      });
    }
    $('.go', root).onclick = async () => {
      if (busy) return;
      if (!picks[0] || (two && !picks[1])) return g.feedback({ ok: false, title: 'Pick the conditions', msg: two ? 'Choose a condition for IF and for ELSE IF.' : 'Choose what the machine should check.', btn: 'OK' });
      busy = true; g.hide(); draw();
      const [ga, gb] = goalRule(cfg.goals[gi]), belt = $$('.item', $('.belt', root)); let wrong = 0;
      for (let i = 0; i < cfg.items.length; i++) {
        const it = cfg.items[i], to = where(it, picks[0], picks[1]), want = where(it, ga, gb);
        $('.in.' + to, root).appendChild(belt[i]); CH.sfx.pop(to === 'L' ? 1.1 : to === 'M' ? 1 : .85, .6);
        if (to !== want) { belt[i].classList.add('wrong'); wrong++; }
        await sleep(350);
      }
      busy = false;
      if (!wrong) {
        if (gi < cfg.goals.length - 1) return g.feedback({ ok: true, title: 'Sorted!', msg: 'Ready for the next puzzle?', btn: 'Next puzzle', onBtn: () => { gi++; picks = [null, null]; draw(); } });
        return g.finish({ title: 'Machine master!' });
      }
      g.mistake();
      g.feedback({ ok: false, title: `${wrong} in the wrong basket`, msg: two ? 'The red-ringed shapes went the wrong way. The machine checks the IF first, then the ELSE IF.' : 'The red-ringed shapes went the wrong way. Try a different condition.', btn: 'Try again', onBtn: draw });
    };
    draw();
    return { solve() {
      if (busy) return ''; const [ga, gb] = goalRule(cfg.goals[gi]);
      picks = [conds.find(c => c[0] === ga[0] && c[1] === ga[1]), gb ? conds.find(c => c[0] === gb[0] && c[1] === gb[1]) : null]; draw();
      return `IF it is <b>${picks[0][2]}</b> THEN left${two ? `, ELSE IF it is <b>${picks[1][2]}</b> THEN middle` : ''}. Picked for you: press <b>Run machine</b>.`;
    } };
  });

  /* Choose last digits that mean "even" (Odd or Even Gate) */
  CH.engine('parity', (root, cfg, g) => {
    root.innerHTML = `<div class="belt nums"></div>
      <div class="rule"><div><span class="kw">IF</span>the last digit is one of:</div><div class="chips digits"></div><div class="pairs"></div>
      <div><span class="kw">THEN</span>EVEN door</div><div><span class="kw">ELSE</span>ODD door</div></div>
      <div class="baskets"><div class="basket"><h4>Even door</h4><div class="in L"></div></div><div class="basket"><h4>Odd door</h4><div class="in R"></div></div></div>
      <div class="actions"><button type="button" class="btn go">▶ Run gate</button></div>`;
    const chosen = new Set(), pairs = $('.pairs', root);
    let busy = false;
    for (let d = 0; d < 10; d++) {
      const b = h(`<button type="button" class="chip" aria-pressed="false">${d}</button>`);
      b.onclick = () => { if (busy) return; chosen.has(d) ? chosen.delete(d) : chosen.add(d); b.setAttribute('aria-pressed', chosen.has(d)); showPairs(d); g.hide(); draw(); };
      $('.digits', root).appendChild(b);
    }
    function showPairs(d) {
      if (d === 0) { pairs.textContent = '0 = no dots at all, so nothing is left over.'; return; }
      pairs.innerHTML = `${d} = <i>${'●● '.repeat(Math.floor(d / 2))}</i>${d % 2 ? '<i class="left">●</i> → one left over' : '→ none left over'}`;
    }
    function draw() { $('.belt', root).innerHTML = cfg.nums.map(n => `<span class="num">${n}</span>`).join(''); $('.in.L', root).innerHTML = ''; $('.in.R', root).innerHTML = ''; }
    $('.go', root).onclick = async () => {
      if (busy) return; busy = true; g.hide(); draw();
      const els = $$('.num', $('.belt', root)); let wrong = 0;
      for (let i = 0; i < cfg.nums.length; i++) {
        const n = cfg.nums[i], left = chosen.has(n % 10);
        $(left ? '.in.L' : '.in.R', root).appendChild(els[i]); CH.sfx.pop(left ? 1.1 : .85, .6);
        if (left !== (n % 2 === 0)) { els[i].classList.add('wrong'); wrong++; }
        await sleep(300);
      }
      busy = false;
      if (!wrong) return g.finish({ title: 'Gate works!' });
      g.mistake();
      g.feedback({ ok: false, title: `${wrong} went through the wrong door`, msg: 'Look at the last digit of each red-ringed number. Tap digits to check for pairs.', btn: 'Try again', onBtn: draw });
    };
    draw();
    return { solve() {
      if (busy) return ''; chosen.clear(); [0, 2, 4, 6, 8].forEach(d => chosen.add(d));
      $$('.digits .chip', root).forEach((b, d) => b.setAttribute('aria-pressed', chosen.has(d)));
      return 'Even numbers end in <b>0, 2, 4, 6 or 8</b>. Picked for you: press <b>Run gate</b>.';
    } };
  });

  /* Predict a variable's final value (Magic Jar) */
  CH.engine('jar', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><div class="codepanel"></div><div class="jar"><span aria-hidden="true">🫙</span><b>?</b></div>
      <p class="q">What is in the jar at the end?</p><div class="choices nums"></div>`;
    const panel = $('.codepanel', root), jarV = $('.jar b', root), ch = $('.choices', root);
    const text = l => l[0] === 'set' ? `set jar to ${l[1]}` : l[0] === 'add' ? `change jar by ${l[1] < 0 ? '−' + -l[1] : '+' + l[1]}` : l[0] === 'double' ? 'double the jar' : `repeat ${l[1]} times:`;
    let r = 0, busy = false;
    function trace(lines, els) {
      const out = []; let j = 0, k = 0;
      const ex = L => L.forEach(l => {
        const el = els.get(l);
        if (l[0] === 'repeat') { out.push({ el, j }); for (let n = 0; n < l[1]; n++) ex(l[2]); }
        else { j = l[0] === 'set' ? l[1] : l[0] === 'add' ? j + l[1] : j * 2; out.push({ el, j }); }
      });
      ex(lines); return out;
    }
    let els;
    function setup() {
      const R = cfg.rounds[r]; CH.dotsBar($('.dots', root), cfg.rounds.length, r); jarV.textContent = '?'; panel.innerHTML = ''; els = new Map();
      const add = (l, ind) => { const d = h(`<div class="${ind ? 'in1' : ''}">${text(l)}</div>`); els.set(l, d); panel.appendChild(d); if (l[0] === 'repeat') l[2].forEach(b => add(b, 1)); };
      R.lines.forEach(l => add(l, 0));
      ch.innerHTML = '';
      R.opts.forEach(o => { const b = h(`<button type="button" class="choice numc">${o}</button>`); b.onclick = () => guess(o, b); ch.appendChild(b); });
    }
    async function guess(o, btn) {
      if (busy) return; busy = true; g.hide(); $$('button', ch).forEach(b => b.disabled = true);
      const steps = trace(cfg.rounds[r].lines, els);
      for (const s of steps) { $$('.now', panel).forEach(e => e.classList.remove('now')); s.el.classList.add('now'); jarV.textContent = s.j; pop(jarV); CH.sfx.step(); await sleep(650); }
      $$('.now', panel).forEach(e => e.classList.remove('now'));
      const ans = steps[steps.length - 1].j; busy = false;
      if (o === ans) {
        r++;
        if (r < cfg.rounds.length) return g.feedback({ ok: true, title: `Yes, ${ans}!`, msg: 'Next program.', btn: 'Next', onBtn: setup });
        CH.dotsBar($('.dots', root), cfg.rounds.length, r); return g.finish({ title: 'Jar genius!' });
      }
      g.mistake(); shake(btn);
      g.feedback({ ok: false, title: `The jar ended at ${ans}`, msg: 'Run it again in your head, one line at a time.', btn: 'Try again', onBtn: setup });
    }
    setup();
    return { solve() {
      const steps = trace(cfg.rounds[r].lines, els), vals = steps.map(s => s.j), ans = vals[vals.length - 1];
      $$('.choice', ch).forEach(b => b.classList.toggle('hint', +b.textContent === ans));
      return `The jar goes <b>${vals.join(' → ')}</b>, so it ends at <b>${ans}</b>.`;
    } };
  });

  /* Column addition with tens rods and ones cubes (Block Adder) */
  CH.engine('adder', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><div class="mat"></div>
      <ol class="algo"><li>Push the ones together</li><li>10 or more ones? Trade 10 ones for 1 ten</li><li>Push the tens together</li><li>Read the answer</li></ol>
      <div class="actions"><button type="button" class="btn alt small" data-act="ones">⬇ Push ones</button><button type="button" class="btn alt small" data-act="trade">🔁 Trade 10 ones</button>
      <button type="button" class="btn alt small" data-act="tens">⬇ Push tens</button><button type="button" class="btn small" data-act="read">👀 Read answer</button></div>
      <div class="choices nums" hidden></div>`;
    const mat = $('.mat', root), ch = $('.choices', root), algo = $$('.algo li', root);
    let P = 0, st;
    function setup() {
      const [a, b] = cfg.problems[P];
      st = { a, b, aT: Math.floor(a / 10), aO: a % 10, bT: Math.floor(b / 10), bO: b % 10, rT: 0, rO: 0, ones: false, tens: false, traded: false };
      CH.dotsBar($('.dots', root), cfg.problems.length, P); ch.hidden = true; draw();
    }
    const col = (n, kind) => `<div class="col${kind === 'o' && n >= 10 ? ' over' : ''}"><small>${n}</small>${(kind === 't' ? '<i class="rod"></i>' : '<i class="cube"></i>').repeat(n)}</div>`;
    function draw() {
      mat.innerHTML = `<span></span><span class="h">Tens</span><span class="h">Ones</span><span class="sign"></span>${col(st.aT, 't')}${col(st.aO, 'o')}
        <span class="sign">+</span>${col(st.bT, 't')}${col(st.bO, 'o')}<span class="line"></span><span class="sign">=</span>${col(st.rT, 't')}${col(st.rO, 'o')}`;
      algo[0].classList.toggle('done', st.ones);
      algo[1].classList.toggle('done', st.ones && st.rO < 10 && (st.traded || st.a % 10 + st.b % 10 < 10));
      algo[2].classList.toggle('done', st.tens);
      algo[3].classList.remove('done');
    }
    const oops = msg => { g.mistake(); g.feedback({ ok: false, title: 'Not that step', msg, btn: 'OK' }); };
    $$('[data-act]', root).forEach(b => b.onclick = () => {
      g.hide();
      const a = b.dataset.act;
      CH.sfx.pop(a === 'read' ? 1.2 : 1);
      if (a === 'ones') { if (st.ones) return oops('The ones are already together.'); st.rO = st.aO + st.bO; st.aO = st.bO = 0; st.ones = true; }
      else if (a === 'trade') {
        if (!st.ones) return oops('Push the ones together first, then see if there are 10 or more.');
        if (st.rO < 10) return oops(`There are only ${st.rO} ones. You need 10 to trade.`);
        st.rO -= 10; st.rT += 1; st.traded = true;
      } else if (a === 'tens') {
        if (!st.ones) return oops('Start with the ones column, on the right.');
        if (st.tens) return oops('The tens are already together.');
        st.rT += st.aT + st.bT; st.aT = st.bT = 0; st.tens = true;
      } else {
        if (!st.ones || !st.tens) return oops('Push all the blocks down first.');
        if (st.rO >= 10) return oops(`The ones column has ${st.rO}. A column holds at most 9, so trade first.`);
        algo[3].classList.add('done');
        const ans = st.a + st.b, carry = st.a % 10 + st.b % 10 >= 10;
        const opts = [ans, ...(carry ? [ans - 10, Number(`${Math.floor(st.a / 10) + Math.floor(st.b / 10)}${st.a % 10 + st.b % 10}`)] : [ans - 10, ans + 10])];
        for (let i = 0; i < P; i++) opts.push(opts.shift());
        ch.innerHTML = ''; ch.hidden = false;
        opts.forEach(o => {
          const c = h(`<button type="button" class="choice numc">${o}</button>`);
          c.onclick = () => {
            if (o !== ans) { shake(c); return oops('Count the tens rods and the ones cubes in the answer row.'); }
            ch.hidden = true;
            if (P < cfg.problems.length - 1) return g.feedback({ ok: true, title: `${st.a} + ${st.b} = ${ans}`, msg: 'Next sum.', btn: 'Next', onBtn: () => { P++; setup(); } });
            g.finish({ title: 'Adding machine!' });
          };
          ch.appendChild(c);
        });
        return;
      }
      draw();
    });
    setup();
    return { solve() {
      const carry = st.a % 10 + st.b % 10 >= 10;
      return `<b>Push ones</b> (${st.a % 10} + ${st.b % 10} = ${st.a % 10 + st.b % 10})${carry ? ', <b>Trade 10 ones</b> for a ten' : ''}, <b>Push tens</b>, then <b>Read answer</b>: ${st.a} + ${st.b} = <b>${st.a + st.b}</b>.`;
    } };
  });

  /* Spot palindromes, then run flip-and-add until one appears (Mirror Numbers) */
  CH.engine('mirror', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><div class="mstage"></div>`;
    const stage = $('.mstage', root), dots = $('.dots', root);
    const isPal = n => { const s = String(n); return s === [...s].reverse().join(''); };
    const flip = n => Number([...String(n)].reverse().join(''));
    let round = 1, cur = null;
    function roundOne() {
      round = 1;
      CH.dotsBar(dots, 2, 0);
      const picked = new Set();
      stage.innerHTML = `<p class="q">Tap every mirror number, then press Check.</p><div class="tiles"></div><div class="actions"><button type="button" class="btn check">✔ Check</button></div>`;
      const tiles = $('.tiles', stage);
      cfg.tiles.forEach(n => { const b = h(`<button type="button" class="num" aria-pressed="false">${n}</button>`); b.onclick = () => { picked.has(n) ? picked.delete(n) : picked.add(n); b.setAttribute('aria-pressed', picked.has(n)); b.classList.remove('wrong'); g.hide(); }; tiles.appendChild(b); });
      $('.check', stage).onclick = () => {
        const btns = $$('.num', tiles); let wrong = 0;
        cfg.tiles.forEach((n, i) => { const bad = picked.has(n) !== isPal(n); btns[i].classList.toggle('wrong', bad); if (bad) wrong++; });
        if (!wrong) return g.feedback({ ok: true, title: 'Found them all!', msg: 'Now the flip-and-add machine.', btn: 'Next', onBtn: roundTwo });
        g.mistake(); g.feedback({ ok: false, title: `${wrong} to fix`, msg: 'Red rings are wrong. Read each number from both ends.', btn: 'OK' });
      };
    }
    function roundTwo() {
      round = 2;
      CH.dotsBar(dots, 2, 1);
      let si = 0, n = cfg.starts[0];
      cur = () => n;
      stage.innerHTML = `<div class="codepanel"><div>repeat until it is a mirror number:</div><div class="in1">flip the digits and add</div></div>
        <div class="bignum"></div><div class="log"></div>
        <div class="actions"><button type="button" class="btn alt flipb">🔄 Flip &amp; add</button><button type="button" class="btn stopb">🪞 It's a mirror number!</button></div>`;
      const big = $('.bignum', stage), log = $('.log', stage);
      const show = () => { big.textContent = n; pop(big); };
      show();
      $('.flipb', stage).onclick = () => {
        g.hide();
        if (isPal(n)) { g.mistake(); return g.feedback({ ok: false, title: 'Look again', msg: `${n} reads the same both ways. Time to stop.`, btn: 'OK' }); }
        const f = flip(n), s = n + f; log.appendChild(h(`<div>${n} + ${f} = ${s}</div>`)); n = s; show();
      };
      $('.stopb', stage).onclick = () => {
        g.hide();
        if (!isPal(n)) { g.mistake(); return g.feedback({ ok: false, title: 'Not yet', msg: `${n} backwards is ${flip(n)}. Keep going.`, btn: 'OK' }); }
        si++;
        if (si < cfg.starts.length) return g.feedback({ ok: true, title: `${n} is a mirror number!`, msg: `Now try ${cfg.starts[si]}.`, btn: 'Next', onBtn: () => { n = cfg.starts[si]; log.innerHTML = ''; show(); } });
        g.finish({ title: 'Mirror master!' });
      };
    }
    roundOne();
    return { solve() {
      if (round === 1) {
        // click the tiles so the engine's own selection matches the answer
        const want = cfg.tiles.filter(isPal); $$('.tiles .num', stage).forEach(b => { if (want.includes(+b.textContent) !== (b.getAttribute('aria-pressed') === 'true')) b.click(); });
        return `The mirror numbers are <b>${cfg.tiles.filter(isPal).join(', ')}</b>. Selected for you: press <b>Check</b>.`;
      }
      let n = cur(); const seq = [n]; while (!isPal(n) && seq.length < 10) { n = n + flip(n); seq.push(n); }
      return `<b>${seq.join(' → ')}</b>. Press Flip &amp; add ${seq.length - 1} time${seq.length === 2 ? '' : 's'}, then press <b>It's a mirror number!</b>`;
    } };
  });
})(window.CH);
