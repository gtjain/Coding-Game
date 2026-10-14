/* Voice-input engines. Speech recognition is the browser's (Chrome, Edge, Safari).
   Every game also shows word buttons, so it stays playable without a microphone. */
(function (CH) {
  const { $, $$, h, shake, sleep } = CH;

  // Turn a heard phrase into commands. words: { CMD: { hear: ['phrase', ...] } }. Longer phrases win.
  CH.parseSpeech = (text, words) => {
    const toks = text.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean);
    const phrases = Object.entries(words).flatMap(([cmd, w]) => w.hear.map(p => [cmd, p.split(' ')])).sort((a, b) => b[1].length - a[1].length);
    const out = [];
    for (let i = 0; i < toks.length;) {
      const m = phrases.find(([, p]) => p.every((t, k) => toks[i + k] === t));
      if (m) { out.push(m[0]); i += m[1].length; } else i++;
    }
    return out;
  };

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  // One shared listener; the active game owns it.
  function listener(words, onCmds, onState) {
    let rec = null, on = false;
    function start() {
      if (!SR) { onState('unsupported'); return; }
      rec = new SR(); rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = false; rec.maxAlternatives = 3;
      rec.onresult = e => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (!e.results[i].isFinal) continue;
          const alts = [...e.results[i]].map(a => a.transcript);
          const hit = alts.map(a => CH.parseSpeech(a, words)).find(c => c.length) || [];
          onState('heard', alts[0]); if (hit.length) onCmds(hit);
        }
      };
      rec.onerror = e => { if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(e.error)) { on = false; onState('blocked'); } };
      rec.onend = () => { if (on) { try { rec.start(); } catch (e) { on = false; onState('off'); } } else onState('off'); };
      on = true;
      try { rec.start(); onState('on'); } catch (e) { on = false; onState('blocked'); }
    }
    function stop() { on = false; try { rec && rec.stop(); } catch (e) {} }
    return { start, stop, get on() { return on; } };
  }

  function micUI(root, cfg, g, onCmds) {
    const mic = $('.mic', root), heard = $('.heard', root), btn = $('.micbtn', root);
    const L = listener(cfg.words, onCmds, (state, text) => {
      mic.dataset.state = state;
      if (state === 'on') { heard.textContent = 'Listening… say a word.'; g.say(CH.LINES.listening); }
      else if (state === 'heard') heard.textContent = `I heard: “${text}”`;
      else if (state === 'off') heard.textContent = 'Tap the microphone to talk.';
      else if (state === 'blocked') heard.textContent = 'This page is not allowed to use the microphone. A grown-up can open the website version and allow the microphone. Tap the words below for now.';
      else if (state === 'unsupported') heard.textContent = 'This browser cannot listen. Tap the words below instead.';
    });
    btn.onclick = () => { if (L.on) L.stop(); else L.start(); };
    if (!SR) { mic.dataset.state = 'unsupported'; heard.textContent = 'This browser cannot listen. Tap the words below instead.'; }
    // test hook: feed a transcript through the same parser
    root.__hear = text => { heard.textContent = `I heard: “${text}”`; const c = CH.parseSpeech(text, cfg.words); if (c.length) onCmds(c); return c; };
    return L;
  }
  const micHTML = `<div class="mic" data-state="off"><button type="button" class="micbtn" aria-label="Start or stop listening">🎤</button><p class="heard">Tap the microphone to talk.</p></div>`;
  const wordButtons = (words, keys) => keys.map(k => `<button type="button" class="blk wide sayword" data-cmd="${k}"${k === 'GO' ? ' data-sfx="none"' : ''}>${words[k].glyph} ${words[k].label}</button>`).join('');

  /* Each word moves at once (Talk to Bunny) */
  CH.engine('voiceMove', (root, cfg, g) => {
    root.innerHTML = `<div class="boardHost"></div>${micHTML}<p class="saylabel">No microphone? Tap a word:</p><div class="palette">${wordButtons(cfg.words, Object.keys(cfg.words))}</div>`;
    const board = CH.makeBoard($('.boardHost', root), cfg.board);
    let queue = Promise.resolve(), done = false;
    const run = cmds => { cmds.forEach(c => { queue = queue.then(async () => {
      if (done) return;
      const r = await board.act(c);
      if (r === 'bump') { g.mistake(); g.say(CH.LINES.bump); }
      if (r === 'goal') { done = true; L.stop(); g.finish({ title: 'Hop to it! You made it!' }); }
    }); }); };
    const L = micUI(root, cfg, g, run);
    $$('.sayword', root).forEach(b => b.onclick = () => run([b.dataset.cmd]));
    return { unmount() { L.stop(); }, solve() {
      return `Say: <b>${CH.solvePath(cfg.board).map(d => cfg.words[d].label).join(', ')}</b>. Or tap those words.`;
    } };
  });

  /* Words build a program; "go" runs it (Robot Radio) */
  CH.engine('voiceCode', (root, cfg, g) => {
    root.innerHTML = `<div class="boardHost"></div>${micHTML}<div class="tray prog" data-empty="Say forward, left or right"></div>
      <p class="saylabel">No microphone? Tap a word:</p><div class="palette">${wordButtons(cfg.words, Object.keys(cfg.words))}</div>
      <div class="actions"><button type="button" class="btn ghost clear">Clear</button></div>`;
    const board = CH.makeBoard($('.boardHost', root), cfg.board);
    const ops = ['F', 'LT', 'RT'].map(k => ({ id: k, glyph: cfg.words[k].glyph, label: cfg.words[k].label }));
    const ed = CH.makeEditor(root, { ops, max: 16, palette: false });   // no palette: words add blocks
    const go = CH.wireEditor(root, g, ed, { run: board.run, reset: board.reset, winTitle: 'Signal received!', bumpTitle: 'Bumped into a wall', missTitle: 'Not at the battery yet' });
    const run = cmds => cmds.forEach(c => {
      if (c === 'GO') { CH.sfx.rise(); go(); } else if (c === 'UNDO') ed.undo(); else ed.add({ t: 'op', op: c });
    });
    const L = micUI(root, cfg, g, run);
    $$('.sayword', root).forEach(b => b.onclick = () => run([b.dataset.cmd]));
    return { unmount() { L.stop(); }, solve() {
      if (ed.busy) return '';
      const ops = CH.toTurns(CH.solvePath(cfg.board), cfg.board.heading || 0);
      ed.load({ main: ops }); board.reset();
      return `Say: <b>${ops.map(o => cfg.words[o].label).join(', ')}</b>, then <b>go</b>. The blocks are loaded: say or tap <b>go</b>.`;
    } };
  });
  CH.voiceUI = { micUI, micHTML, wordButtons };   // used by Talk to Draw
})(window.CH);
