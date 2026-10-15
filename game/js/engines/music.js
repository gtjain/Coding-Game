/* Piano games for ages 4–6: find the keys, copy a tune, build a tune with a loop, fix a buggy tune.
   One octave from middle C. Each note has a colour, the same everywhere in the game. */
(function (CH) {
  const { $, $$, sleep, shake, pop, h, LINES } = CH;
  const NOTES = {
    C: [261.63, '#E8423F', 'C'], D: [293.66, '#FF8A2A', 'D'], E: [329.63, '#F5C02A', 'E'], F: [349.23, '#43B649', 'F'],
    G: [392.0, '#22B5C9', 'G'], A: [440.0, '#3D6BFF', 'A'], B: [493.88, '#8A4FFF', 'B'], C2: [523.25, '#E8423F', 'C']
  };
  const KEYS = Object.keys(NOTES);
  const BLACK_AFTER = [0, 1, 3, 4, 5];   // black keys sit after C, D, F, G, A
  const chip = (n, extra = '') => `<span class="nchip${extra}" style="--c:${NOTES[n][1]}">${NOTES[n][2]}</span>`;

  function keyboard(host, { labels = true, onKey }) {
    host.innerHTML = `<div class="piano${labels ? '' : ' nolabel'}">${KEYS.map(n => `<button type="button" class="pkey" data-n="${n}" style="--c:${NOTES[n][1]}" aria-label="${NOTES[n][2]}"><b>${NOTES[n][2]}</b></button>`).join('')}
      ${BLACK_AFTER.map(i => `<i class="bkey" style="--i:${i + 1}" aria-hidden="true"></i>`).join('')}</div>`;
    $$('.pkey', host).forEach(b => b.onclick = () => onKey(b.dataset.n, b));
    const el = $('.piano', host);
    return {
      el, key: n => $(`.pkey[data-n="${n}"]`, el),
      labels(on) { el.classList.toggle('nolabel', !on); }
    };
  }
  const play = (n, dur) => CH.sfx.note(NOTES[n][0], dur);
  async function light(kb, n, ms = 520) { const k = kb.key(n); k.classList.add('down'); play(n); await sleep(ms * .8); k.classList.remove('down'); await sleep(ms * .2); }

  CH.engine('piano', (root, cfg, g) => {
    const mode = cfg.mode;
    root.innerHTML = `<div class="dots"></div><div class="pmain"></div><div class="pianohost"></div><div class="actions pacts"></div>`;
    const main = $('.pmain', root), acts = $('.pacts', root);
    let r = 0, busy = false, alive = true, kb;
    const R = () => cfg.rounds[r];
    const nextRound = async (title, msg) => {
      busy = true; g.say(LINES.yes); await sleep(900); busy = false; r++;
      if (r < cfg.rounds.length) return g.feedback({ ok: true, title, msg, btn: 'Next', onBtn: setup });
      CH.dotsBar($('.dots', root), cfg.rounds.length, r); g.finish({ title: cfg.winTitle || 'Music maker!' });
    };

    /* ---- find the key ---- */
    let idx = 0;
    const find = {
      setup() { idx = 0; kb.labels(R().labels); main.innerHTML = `<p class="pfind">Find <span class="pbig"></span></p>${R().labels ? '' : '<p class="fine">Tip: C is just left of the two black keys.</p>'}<div class="seqrow pgot"></div>`; acts.innerHTML = ''; this.ask(); },
      ask() { const n = R().notes[idx]; $('.pbig', main).textContent = NOTES[n][2]; pop($('.pbig', main)); g.say(cfg.findSay[NOTES[n][2]]); },
      async key(n, b) {
        if (busy) return; play(n); pop(b);
        const want = R().notes[idx];
        if (NOTES[n][2] !== NOTES[want][2]) { g.mistake(); shake(b); return; }
        $('.pgot', main).insertAdjacentHTML('beforeend', chip(n, ' pop')); idx++;
        if (idx < R().notes.length) return this.ask();
        nextRound(R().labels ? 'You know the keys!' : 'Wow, without letters!', R().labels ? 'Now the letters hide. Can you still find them?' : 'Next.');
      },
      solve() { const n = R().notes[idx]; $$('.pkey', root).forEach(k => k.classList.toggle('hint', NOTES[k.dataset.n][2] === NOTES[n][2]));
        return `Every white key has a letter: C D E F G A B, then C again. <b>${NOTES[n][2]}</b> is the glowing key. C is just left of the two black keys.`; }
    };

    /* ---- copy the tune ---- */
    let got = [], heard = false;
    const copy = {
      setup() { got = []; heard = false; main.innerHTML = `<p class="pfind">${R().name}</p><div class="seqrow pgot" aria-label="Your notes"></div>`;
        acts.innerHTML = `<button type="button" class="btn alt listen">👂 Listen</button>`; $('.listen', acts).onclick = () => this.listen(); },
      async listen() {
        if (busy) return; busy = true; g.hide(); got = []; $('.pgot', main).innerHTML = '';
        for (const n of R().tune) { if (!alive) return; await light(kb, n, 560); }
        busy = false; heard = true; g.say(LINES.yourTurn);
      },
      async key(n, b) {
        if (busy) return; play(n); pop(b);
        if (!heard) { shake($('.listen', acts)); return; }
        if (n !== R().tune[got.length]) { g.mistake(); shake(b); g.say(LINES.watchAgain); got = []; $('.pgot', main).innerHTML = ''; return; }
        got.push(n); $('.pgot', main).insertAdjacentHTML('beforeend', chip(n, ' pop'));
        if (got.length === R().tune.length) nextRound('You played it!', 'Here is a longer tune.');
      },
      solve() { heard = true; return `The tune is <span class="kbig">${R().tune.map(n => chip(n)).join(' ')}</span>. Tap those keys in order.`; }
    };

    /* ---- build the tune with a loop ---- */
    let body = [], times = 2;
    const loop = {
      setup() {
        body = []; times = 2;
        main.innerHTML = `<p class="fine">The song:</p><div class="seqrow ptarget">${R().target.map(n => chip(n)).join('')}</div>
          <div class="loopmaker"><span>🔁 Repeat</span><span class="stepper"><button type="button" class="minus" aria-label="Fewer times">−</button><b class="pn">2</b><button type="button" class="plus" aria-label="More times">+</button></span><span>times:</span><div class="pbody" aria-label="Notes in the loop"></div></div>
          <p class="fine">Tap piano keys to put notes in the loop. Tap a note in the loop to take it out.</p>`;
        acts.innerHTML = `<button type="button" class="btn ghost clear">Clear</button><button type="button" class="btn go">▶ Play</button>`;
        $('.minus', main).onclick = () => { if (busy) return; times = Math.max(2, times - 1); g.hide(); this.draw(); };
        $('.plus', main).onclick = () => { if (busy) return; times = Math.min(6, times + 1); g.hide(); this.draw(); };
        $('.clear', acts).onclick = () => { if (busy) return; body = []; g.hide(); this.draw(); };
        $('.go', acts).onclick = () => this.run();
        this.draw();
      },
      draw() {
        $('.pn', main).textContent = times;
        const b = $('.pbody', main); b.innerHTML = '';
        body.forEach((n, i) => { const c = h(`<button type="button" class="nchip big" style="--c:${NOTES[n][1]}" aria-label="Remove ${NOTES[n][2]}">${NOTES[n][2]}</button>`); c.onclick = () => { if (busy) return; body.splice(i, 1); g.hide(); this.draw(); }; b.appendChild(c); });
      },
      key(n, b) { if (busy) return; play(n); pop(b); if (body.length >= 4) { shake($('.pbody', main)); return; } body.push(n); g.hide(); this.draw(); },
      async run() {
        if (busy || !body.length) { shake($('.pbody', main)); return; }
        busy = true; g.hide();
        const song = Array.from({ length: times }, () => body).flat(), tg = $$('.ptarget .nchip', main);
        tg.forEach(c => c.classList.remove('now', 'wrong', 'ok'));
        for (let i = 0; i < song.length; i++) {
          if (!alive) return;
          const c = tg[i], ok = song[i] === R().target[i];
          if (c) c.classList.add(ok ? 'ok' : 'wrong');
          $$('.pbody .nchip', main).forEach((e, j) => e.classList.toggle('now', j === i % body.length));
          await light(kb, song[i], 420);
        }
        $$('.pbody .nchip', main).forEach(e => e.classList.remove('now')); busy = false;
        if (song.join() === R().target.join()) return nextRound('That is the song!', 'Next song.');
        g.mistake();
        g.feedback({ ok: false, title: song.length !== R().target.length ? `Your loop played ${song.length} notes. The song has ${R().target.length}.` : 'Some notes are different',
          msg: 'Find the part of the song that repeats. Put it in the loop once.', btn: 'Try again', onBtn: () => tg.forEach(c => c.classList.remove('ok', 'wrong')) });
      },
      solve() { if (busy) return ''; body = [...R().body]; times = R().n; this.draw();
        return `The part that repeats is <span class="kbig">${R().body.map(n => chip(n)).join(' ')}</span>, ${R().n} times. The loop is ready: press <b>Play</b>.`; }
    };

    /* ---- fix the buggy tune ---- */
    let found = false;
    const bug = {
      tune() { const t = [...R().tune]; t[R().bug.i] = R().bug.wrong; return t; },
      setup() {
        found = false;
        main.innerHTML = `<p class="pfind">${R().name}</p><p class="fine">🤖 The robot plays it like this. One note is a bug.</p><div class="seqrow pbug"></div>`;
        acts.innerHTML = `<button type="button" class="btn alt real">🎵 Real song</button><button type="button" class="btn ghost robo">🤖 Robot song</button>`;
        $('.real', acts).onclick = () => this.hear(R().tune, false);
        $('.robo', acts).onclick = () => this.hear(this.tune(), true);
        this.draw();
      },
      draw() {
        const el = $('.pbug', main); el.innerHTML = '';
        this.tune().forEach((n, i) => { const c = h(`<button type="button" class="nchip big" style="--c:${NOTES[n][1]}" aria-label="Note ${i + 1}, ${NOTES[n][2]}">${NOTES[n][2]}</button>`); c.onclick = () => this.pick(i, c); el.appendChild(c); });
      },
      async hear(t, robot) {
        if (busy) return; busy = true; g.hide();
        const cs = $$('.pbug .nchip', main);
        for (let i = 0; i < t.length; i++) { if (!alive) return; if (robot) cs.forEach((c, j) => c.classList.toggle('now', j === i)); await light(kb, t[i], 480); }
        cs.forEach(c => c.classList.remove('now')); busy = false;
      },
      pick(i, c) {
        if (busy || found) return;
        if (i !== R().bug.i) { g.mistake(); shake(c); g.say(LINES.tryAgain); return; }
        found = true; c.classList.add('bugged'); c.textContent = '🐛'; g.say(LINES.bugNote);
      },
      async key(n, b) {
        if (busy) return; play(n); pop(b);
        if (!found) return;
        if (n !== R().tune[R().bug.i]) { g.mistake(); shake(b); return; }
        busy = true; const c = $$('.pbug .nchip', main)[R().bug.i];
        c.classList.remove('bugged'); c.style.setProperty('--c', NOTES[n][1]); c.textContent = NOTES[n][2]; c.classList.add('ok'); pop(c);
        await sleep(400);
        for (const m of R().tune) { if (!alive) return; await light(kb, m, 420); }
        busy = false; nextRound('Bug squished! The song is fixed.', 'Next song.');
      },
      solve() {
        const i = R().bug.i, right = R().tune[i];
        if (!found) $$('.pbug .nchip', main)[i].classList.add('hint');
        $$('.pkey', root).forEach(k => k.classList.toggle('hint', found && k.dataset.n === right));
        return `Note ${i + 1} is the bug. It should be <b>${NOTES[right][2]}</b>. Tap the bug note, then the <b>${NOTES[right][2]}</b> key.`; }
    };

    const M = { find, copy, loop, bug }[mode];
    kb = keyboard($('.pianohost', root), { labels: true, onKey: (n, b) => M.key(n, b) });
    function setup() { busy = false; CH.dotsBar($('.dots', root), cfg.rounds.length, r); $$('.pkey', root).forEach(k => k.classList.remove('hint')); M.setup(); }
    setup();
    return { unmount() { alive = false; }, solve: () => M.solve() };
  });
})(window.CH);
