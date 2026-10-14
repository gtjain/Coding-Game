/* Engines for ages 7–8: rule detective gates (odd/even, plus/minus, multiples) and variables with
   loops and ifs. Each engine: (root, cfg, g) => { solve(), unmount?() }. */
(function (CH) {
  const { $, $$, sleep, shake, pop, h } = CH;

  /* Look at the YES / NO examples, work out the rule, then run the gate (rule gates) */
  const RULES = {
    even: { text: 'is even', test: x => x % 2 === 0 },
    odd: { text: 'is odd', test: x => Math.abs(x % 2) === 1 },
    ends: { text: 'ends in', param: true, test: (x, n) => Math.abs(x) % 10 === n },
    gt: { text: 'is more than', param: true, test: (x, n) => x > n },
    lt: { text: 'is less than', param: true, test: (x, n) => x < n },
    mult: { text: 'is a multiple of', param: true, test: (x, n) => n !== 0 && x % n === 0 }
  };
  CH.engine('ruleGate', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><p class="rgoal">🕵️ Look at the examples. What is the rule?</p>
      <div class="baskets"><div class="basket ex yes"><h4>✅ YES door</h4><div class="in exy"></div></div><div class="basket ex no"><h4>❌ NO door</h4><div class="in exn"></div></div></div>
      <div class="rule"><div><span class="kw">IF</span>the number…</div><div class="chips rtpl"></div>
        <div class="rparam" hidden><span class="stepper"><button type="button" class="minus" aria-label="Lower">−</button><b class="rn">0</b><button type="button" class="plus" aria-label="Higher">+</button></span></div>
        <div><span class="kw">THEN</span>YES door <span class="kw">ELSE</span>NO door</div></div>
      <p class="fine">Now these numbers go through your gate:</p><div class="belt nums gtest"></div>
      <div class="baskets"><div class="basket"><h4>✅ YES</h4><div class="in L"></div></div><div class="basket"><h4>❌ NO</h4><div class="in R"></div></div></div>
      <div class="actions"><button type="button" class="btn go">▶ Run gate</button></div>`;
    const [lo, hi] = cfg.range || [0, 10];
    let r = 0, t = null, n = cfg.start != null ? cfg.start : lo, busy = false;
    const all = R => [...R.yes, ...R.no, ...R.test];
    function drawRule() {
      $('.rtpl', root).innerHTML = '';
      cfg.templates.forEach(k => { const b = h(`<button type="button" class="chip" data-t="${k}" aria-pressed="${t === k}">${RULES[k].text}${RULES[k].param ? ' …' : ''}</button>`); b.onclick = () => { if (busy) return; t = k; g.hide(); drawRule(); }; $('.rtpl', root).appendChild(b); });
      $('.rparam', root).hidden = !(t && RULES[t].param);
      $('.rn', root).textContent = n;
    }
    function setup() {
      const R = cfg.rounds[r]; busy = false; t = null; n = cfg.start != null ? cfg.start : lo;
      CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      $('.exy', root).innerHTML = R.yes.map(x => `<span class="num">${x}</span>`).join('');
      $('.exn', root).innerHTML = R.no.map(x => `<span class="num">${x}</span>`).join('');
      $('.gtest', root).innerHTML = R.test.map(x => `<span class="num">${x}</span>`).join('');
      $('.in.L', root).innerHTML = ''; $('.in.R', root).innerHTML = '';
      drawRule();
    }
    $('.minus', root).onclick = () => { if (busy) return; n = Math.max(lo, n - 1); g.hide(); drawRule(); };
    $('.plus', root).onclick = () => { if (busy) return; n = Math.min(hi, n + 1); g.hide(); drawRule(); };
    $('.go', root).onclick = async () => {
      if (busy) return;
      if (!t) return g.feedback({ ok: false, title: 'Pick a rule', msg: 'Choose what the gate should check.', btn: 'OK' });
      const R = cfg.rounds[r], mine = x => RULES[t].test(x, n), want = x => RULES[R.ans.t].test(x, R.ans.n);
      busy = true; g.hide(); $('.in.L', root).innerHTML = ''; $('.in.R', root).innerHTML = '';
      const els = $$('.num', $('.gtest', root)); let wrong = 0;
      for (let i = 0; i < R.test.length; i++) {
        const x = R.test[i], c = els[i].cloneNode(true), yes = mine(x);
        $(yes ? '.in.L' : '.in.R', root).appendChild(c); CH.sfx.pop(yes ? 1.1 : .85, .6);
        if (yes !== want(x)) { c.classList.add('wrong'); wrong++; }
        await sleep(300);
      }
      // the examples must fit the rule too
      const exWrong = [...R.yes.filter(x => !mine(x)), ...R.no.filter(x => mine(x))];
      busy = false;
      if (!wrong && !exWrong.length && all(R).every(x => mine(x) === want(x))) {
        r++;
        if (r < cfg.rounds.length) return g.feedback({ ok: true, title: 'Rule cracked!', msg: 'Next mystery.', btn: 'Next', onBtn: setup });
        CH.dotsBar($('.dots', root), cfg.rounds.length, r); return g.finish({ title: 'Rule detective!' });
      }
      g.mistake();
      g.feedback({ ok: false, title: wrong ? `${wrong} went through the wrong door` : 'The examples do not fit', msg: exWrong.length ? `Your rule does not match the example ${exWrong[0]}. Look at the YES and NO examples again.` : 'Look at the red-ringed numbers. What do all the YES numbers share?', btn: 'Try again' });
    };
    setup();
    return { solve() { const R = cfg.rounds[r]; t = R.ans.t; if (R.ans.n != null) n = R.ans.n; drawRule();
      return `The rule is: the number <b>${RULES[t].text}${RULES[t].param ? ' ' + n : ''}</b>. It is set for you: press <b>Run gate</b>.`; } };
  });

  /* Predict a variable after a program with several variables, loops and ifs (Variable Boxes) */
  CH.engine('vars', (root, cfg, g) => {
    root.innerHTML = `<div class="dots"></div><div class="codepanel vcode"></div><div class="vboxes"></div><p class="q vq"></p><div class="choices nums vopts"></div>`;
    const code = $('.vcode', root), boxes = $('.vboxes', root), opts = $('.vopts', root);
    const sign = n => n < 0 ? `- ${-n}` : `+ ${n}`;
    const text = s => s[0] === 'set' ? `${s[1]} = ${s[2]}` : s[0] === 'copy' ? `${s[1]} = ${s[2]}` : s[0] === 'add' ? `${s[1]} = ${s[1]} ${sign(s[2])}` :
      s[0] === 'addv' ? `${s[1]} = ${s[1]} + ${s[2]}` : s[0] === 'subv' ? `${s[1]} = ${s[1]} - ${s[2]}` : s[0] === 'mul' ? `${s[1]} = ${s[1]} × ${s[2]}` :
      s[0] === 'rep' ? `repeat ${s[1]} times:` : `if ${s[1][0]} ${s[1][1]} ${s[1][2]}:`;
    const cmp = (a, op, b) => op === '>' ? a > b : op === '<' ? a < b : a === b;
    let r = 0, busy = false, els = new Map(), names = [];
    function trace(lines) {
      const env = {}, out = [];
      const ex = L => L.forEach(s => {
        const el = els.get(s);
        if (s[0] === 'rep') { out.push({ el, env: { ...env } }); for (let k = 0; k < s[1]; k++) ex(s[2]); return; }
        if (s[0] === 'if') { const ok = cmp(env[s[1][0]], s[1][1], s[1][2]); out.push({ el, env: { ...env }, test: ok }); if (ok) ex(s[2]); return; }
        const [op, v, x] = s;
        env[v] = op === 'set' ? x : op === 'copy' ? env[x] : op === 'add' ? env[v] + x : op === 'addv' ? env[v] + env[x] : op === 'subv' ? env[v] - env[x] : env[v] * x;
        out.push({ el, env: { ...env } });
      });
      ex(lines); return out;
    }
    function setup() {
      const R = cfg.rounds[r]; busy = false; els = new Map(); names = [];
      CH.dotsBar($('.dots', root), cfg.rounds.length, r);
      code.innerHTML = '';
      const add = (s, depth) => {
        const d = h(`<div class="in${depth}">${text(s)}</div>`); els.set(s, d); code.appendChild(d);
        if ((s[0] === 'set' || s[0] === 'copy') && !names.includes(s[1])) names.push(s[1]);
        if (s[0] === 'rep' || s[0] === 'if') s[2].forEach(b => add(b, depth + 1));
      };
      R.lines.forEach(s => add(s, 0));
      boxes.innerHTML = names.map(v => `<div class="vbox" data-v="${v}"><small>${v}</small><b>?</b></div>`).join('');
      $('.vq', root).innerHTML = `What is in <b>${R.ask}</b> at the end?`;
      opts.innerHTML = '';
      R.opts.forEach(o => { const b = h(`<button type="button" class="choice numc" data-n="${o}">${o}</button>`); b.onclick = () => guess(o, b); opts.appendChild(b); });
    }
    async function guess(o, btn) {
      if (busy) return; busy = true; g.hide(); $$('button', opts).forEach(b => b.disabled = true);
      const R = cfg.rounds[r], steps = trace(R.lines);
      for (const s of steps) {
        $$('.now', code).forEach(e => e.classList.remove('now')); s.el.classList.add('now');
        names.forEach(v => { const b = $(`.vbox[data-v="${v}"] b`, boxes); const val = s.env[v] != null ? s.env[v] : '?'; if (b.textContent !== String(val)) { b.textContent = val; pop(b); } });
        CH.sfx.step(); await sleep(steps.length > 14 ? 380 : 600);
      }
      $$('.now', code).forEach(e => e.classList.remove('now'));
      const ans = steps[steps.length - 1].env[R.ask]; busy = false;
      if (o === ans) {
        r++;
        if (r < cfg.rounds.length) return g.feedback({ ok: true, title: `Yes, ${R.ask} is ${ans}!`, msg: 'Next program.', btn: 'Next', onBtn: setup });
        CH.dotsBar($('.dots', root), cfg.rounds.length, r); return g.finish({ title: 'Variable wizard!' });
      }
      g.mistake(); shake(btn);
      g.feedback({ ok: false, title: `${R.ask} ended at ${ans}`, msg: 'Watch the boxes change, line by line. Then try again.', btn: 'Try again', onBtn: setup });
    }
    setup();
    return { solve() { const R = cfg.rounds[r], steps = trace(R.lines), ans = steps[steps.length - 1].env[R.ask];
      $$('.choice', opts).forEach(b => b.classList.toggle('hint', +b.dataset.n === ans));
      return `Step by step, <b>${R.ask}</b> goes ${[...new Set(steps.map(s => s.env[R.ask]).filter(v => v != null))].join(' → ')}. It ends at <b>${ans}</b>.`; } };
  });
})(window.CH);
