/* App shell: players, per-kid play timer, grown-up PIN, home path, flash-card deck. */
(function (CH) {
  const { $, $$, esc, h, pick, LINES } = CH;
  const CAT = window.CH_CATALOG;
  const GAMES = CAT.games;
  const byId = Object.fromEntries(GAMES.map(g => [g.id, g]));
  const deckFor = tier => GAMES.filter(g => g.tier === tier).map((g, i) => [g, i]).sort((a, b) => a[0].unit - b[0].unit || a[1] - b[1]).map(x => x[0]);
  const TIER_NAME = { young: 'Ages 4–6', older: 'Ages 7–9' };
  const AVATARS = ['🐰', '🐸', '🦊', '🐼', '🐯', '🐙', '🦄', '🐢', '🦁', '🐨', '🐧', '🦖'];
  const VOICES = [['af_heart', 'Heart (in use)'], ['af_bella', 'Bella'], ['bf_emma', 'Emma, British'], ['am_puck', 'Puck']];

  /* ---------- storage ---------- */
  const KEY = 'code-hoppers-v3';
  const freshTime = () => ({ left: limitSecs(), locked: false, overtime: false, graceEnd: null });
  let S;
  function limitSecs() { return S.settings.demo ? 30 : S.settings.limitMin * 60; }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!s || !Array.isArray(s.profiles)) s = { current: 'Pip', profiles: [
      { name: 'Pip', avatar: '🐰', age: 'young', xp: 25, streak: 3, last: null, combo: 1, done: { A1: 3 } },
      { name: 'Juno', avatar: '🦊', age: 'older', xp: 45, streak: 5, last: null, combo: 0, done: { B1: 2, B2: 3 } }] };
    s.settings = Object.assign({ limitMin: 15, demo: false, pin: null }, s.settings || {});
    return s;
  }
  S = load();
  S.profiles.forEach(p => { p.time = p.time || freshTime(); p.combo = p.combo || 0; });
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  const cur = () => S.profiles.find(p => p.name === S.current) || null;

  /* ---------- header ---------- */
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  function renderHeader() {
    const p = cur(), t = $('#timer'), w = $('#whoBtn');
    w.innerHTML = p ? `<span class="av">${p.avatar}</span><span class="nm">${esc(p.name)}</span><span class="stat">⭐ ${p.xp}</span><span class="stat" title="Days in a row">🔥 ${p.streak}</span>` : 'Pick a player';
    t.hidden = !p;
    if (!p) return;
    t.classList.toggle('over', p.time.overtime || p.time.locked);
    t.textContent = p.time.locked ? '⏱ Locked' : p.time.overtime ? '⏱ Last game!' : `⏱ ${fmt(p.time.left)}`;
  }
  $('#whoBtn').onclick = () => go('home');

  /* ---------- play timer: 15 min per kid, finish the current game, then lock ---------- */
  const GRACE_MS = 3 * 60 * 1000;
  let ticks = 0;
  setInterval(() => {
    const p = cur();
    if (!p || p.time.locked || document.hidden) return;
    if (!p.time.overtime) {
      p.time.left = Math.max(0, p.time.left - 1);
      if (p.time.left === 0) { p.time.overtime = true; p.time.graceEnd = Date.now() + GRACE_MS; save(); CH.say(LINES.timeUp); }
    } else if (Date.now() > p.time.graceEnd) lockNow(p);
    if (++ticks % 5 === 0) save();
    renderHeader();
  }, 1000);
  function lockNow(p) {
    if (!p || p.time.locked) return;
    Object.assign(p.time, { locked: true, overtime: false, graceEnd: null }); save(); renderHeader();
    unmountGame(); go('home');
    openLock(p);
  }
  function unlock(p) { p.time = freshTime(); save(); renderHeader(); closeModal(); renderHome(); }

  /* ---------- modal + PIN ---------- */
  const modal = $('#modal'), sheet = $('#sheet');
  let modalClosable = false, keyHandler = null;
  function openModal(html, closable) { modalClosable = closable; sheet.innerHTML = html; modal.hidden = false; keyHandler = closable ? e => { if (e.key === 'Escape') closeModal(); } : null; }
  function closeModal() { modal.hidden = true; sheet.innerHTML = ''; keyHandler = null; }
  modal.addEventListener('click', e => { if (e.target === modal && modalClosable) closeModal(); });
  document.addEventListener('keydown', e => { if (!modal.hidden && keyHandler) keyHandler(e); });

  async function hashPin(pin) {
    const txt = 'code-hoppers:' + pin;
    try { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); }
    catch (e) { let x = 0; for (const c of txt) x = (x * 31 + c.charCodeAt(0)) | 0; return 'x' + x; }
  }
  function pinScreen({ title, msg, icon = '🔒', closable, extra, onDone }) {
    openModal(`<div class="big">${icon}</div><h2 id="mTitle">${title}</h2><p class="pmsg">${msg}</p>
      <div class="pindots">${'<i></i>'.repeat(4)}</div>
      <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button" data-k="${n}">${n}</button>`).join('')}<span></span><button type="button" data-k="0">0</button><button type="button" data-k="del" aria-label="Delete">⌫</button></div>
      <div class="actions">${extra ? `<button type="button" class="btn alt" id="mExtra">${extra.text}</button>` : ''}${closable ? '<button type="button" class="btn ghost" id="mClose">Close</button>' : ''}</div>`, closable);
    let v = '';
    const dots = $$('.pindots i', sheet);
    const draw = () => dots.forEach((d, i) => d.classList.toggle('on', i < v.length));
    const ui = { error(m) { $('.pmsg', sheet).textContent = m; CH.shake($('.pindots', sheet)); v = ''; draw(); } };
    const press = k => {
      if (k === 'del') { v = v.slice(0, -1); draw(); return; }
      if (v.length >= 4) return;
      v += k; draw();
      if (v.length === 4) { const val = v; setTimeout(() => onDone(val, ui), 150); }
    };
    $$('.keypad button', sheet).forEach(b => b.onclick = () => press(b.dataset.k));
    keyHandler = e => { if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); else if (e.key === 'Escape' && closable) closeModal(); };
    if (closable) $('#mClose', sheet).onclick = closeModal;
    if (extra) $('#mExtra', sheet).onclick = extra.fn;
  }
  function askGrownup(o) {
    if (!S.settings.pin) {
      pinScreen({ ...o, title: 'Create a grown-up PIN', msg: 'Grown-up: choose 4 digits. Kids should not see them.', icon: '🔑', onDone: a => {
        pinScreen({ ...o, title: 'Type it again', msg: 'Same 4 digits, to be sure.', icon: '🔑', onDone: async (b, ui) => {
          if (a !== b) { ui.error('The two PINs did not match. Start again.'); setTimeout(() => askGrownup(o), 900); return; }
          S.settings.pin = await hashPin(a); save(); o.onOk();
        } });
      } });
      return;
    }
    pinScreen({ ...o, onDone: async (v, ui) => { if (await hashPin(v) === S.settings.pin) o.onOk(); else ui.error('That PIN is not right. Try again.'); } });
  }
  function openLock(p) {
    CH.say(LINES.breakTime);
    askGrownup({ title: `Time for a break, ${esc(p.name)}!`, msg: `You played for ${S.settings.demo ? '30 seconds (demo)' : S.settings.limitMin + ' minutes'}. Ask a grown-up to type the PIN.`,
      icon: '🌙', closable: false, extra: S.profiles.length > 1 ? { text: '👥 Switch player', fn: () => { closeModal(); go('home'); } } : null, onOk: () => unlock(p) });
  }
  $('#parentBtn').onclick = () => askGrownup({ title: 'Grown-ups only', msg: 'Type the PIN to manage players and play time.', closable: true, onOk: openSettings });

  /* ---------- grown-up settings ---------- */
  let removeArmed = null;
  function openSettings() {
    const st = S.settings;
    openModal(`<h2 id="mTitle">Grown-up settings</h2><div class="settings">
      <div class="row"><h4>Play time for each kid</h4><div class="opts" id="limOpts">${[5, 10, 15, 20, 30].map(m => `<button type="button" data-m="${m}" aria-pressed="${!st.demo && st.limitMin === m}">${m} min</button>`).join('')}<button type="button" data-m="demo" aria-pressed="${st.demo}">30 s demo</button></div>
      <p class="fine">When a kid's time runs out they can finish the game they are in (up to 3 minutes). Then their profile locks until you type the PIN. Other kids keep their own time.</p></div>
      <div class="row"><h4>Players</h4><div id="kidRows" class="kidrows"></div></div>
      <div class="row"><h4>Add a player</h4><div class="addrow"><input id="newName" maxlength="12" placeholder="Name" autocomplete="off" aria-label="New player name">
        <div class="opts" id="newAge"><button type="button" data-a="young" aria-pressed="true">4–6</button><button type="button" data-a="older" aria-pressed="false">7–9</button></div>
        <button type="button" class="btn small" id="addKid">Add</button></div><p class="err" id="addErr"></p></div>
      <div class="row"><h4>Voice</h4><div class="opts">${VOICES.map(([v, n]) => `<button type="button" data-v="${v}">▶ ${n}</button>`).join('')}</div>
      <p class="fine">Recorded with Kokoro, a free open-source voice. Tell us which voice you like and every line gets re-recorded in it.</p></div>
      <div class="actions"><button type="button" class="btn ghost small" id="sPin">Change PIN</button><button type="button" class="btn" id="sDone">Done</button></div></div>`, true);
    $$('#limOpts button', sheet).forEach(b => b.onclick = () => {
      if (b.dataset.m === 'demo') st.demo = true; else { st.demo = false; st.limitMin = +b.dataset.m; }
      S.profiles.forEach(p => { if (!p.time.locked) p.time = freshTime(); });
      save(); renderHeader(); $$('#limOpts button', sheet).forEach(x => x.setAttribute('aria-pressed', x === b)); kidRows();
    });
    let newAge = 'young';
    $$('#newAge button', sheet).forEach(b => b.onclick = () => { newAge = b.dataset.a; $$('#newAge button', sheet).forEach(x => x.setAttribute('aria-pressed', x === b)); });
    $('#addKid', sheet).onclick = () => {
      const name = $('#newName', sheet).value.trim(), err = $('#addErr', sheet);
      if (!name) { err.textContent = 'Type a name first.'; return; }
      if (S.profiles.some(p => p.name.toLowerCase() === name.toLowerCase())) { err.textContent = 'That name is taken.'; return; }
      S.profiles.push({ name, avatar: AVATARS[S.profiles.length % AVATARS.length], age: newAge, xp: 0, streak: 0, last: null, combo: 0, done: {}, time: freshTime() });
      if (!cur()) S.current = name;
      save(); $('#newName', sheet).value = ''; err.textContent = ''; kidRows(); renderHome(); renderHeader();
    };
    $$('[data-v]', sheet).forEach(b => b.onclick = () => { CH.stopVoice(); try { new Audio(`audio/samples/${b.dataset.v}.mp3`).play().catch(() => {}); } catch (e) {} });
    $('#sPin', sheet).onclick = () => { S.settings.pin = null; save(); askGrownup({ closable: true, onOk: openSettings }); };
    $('#sDone', sheet).onclick = closeModal;
    kidRows();
  }
  function kidRows() {
    const box = $('#kidRows', sheet); if (!box) return;
    box.innerHTML = '';
    S.profiles.forEach(p => {
      const r = h(`<div class="kidrow"><span class="av">${p.avatar}</span><b>${esc(p.name)}</b>
        <div class="opts"><button type="button" data-a="young" aria-pressed="${p.age === 'young'}">4–6</button><button type="button" data-a="older" aria-pressed="${p.age === 'older'}">7–9</button></div>
        <span class="tleft">${p.time.locked ? '🔒 Locked' : '⏱ ' + fmt(p.time.left) + ' left'}</span>
        <button type="button" class="btn alt small restart">${p.time.locked ? 'Unlock' : 'Restart timer'}</button>
        <button type="button" class="btn warn small remove">${removeArmed === p ? 'Tap again to remove' : 'Remove'}</button></div>`);
      $$('[data-a]', r).forEach(b => b.onclick = () => { p.age = b.dataset.a; save(); kidRows(); renderHome(); });
      $('.restart', r).onclick = () => { p.time = freshTime(); save(); renderHeader(); kidRows(); renderHome(); };
      $('.remove', r).onclick = () => {
        if (removeArmed !== p) { removeArmed = p; kidRows(); return; }
        S.profiles = S.profiles.filter(x => x !== p); removeArmed = null;
        if (S.current === p.name) S.current = S.profiles[0]?.name || null;
        save(); kidRows(); renderHome(); renderHeader();
      };
      box.appendChild(r);
    });
  }

  /* ---------- kid edits own name + avatar (no PIN) ---------- */
  function openEdit(p) {
    let av = p.avatar;
    openModal(`<div class="big">${av}</div><h2 id="mTitle">Your profile</h2>
      <label class="lbl" for="editName">Your name</label><input id="editName" class="field" maxlength="12" value="${esc(p.name)}" autocomplete="off">
      <span class="lbl">Pick a buddy</span><div class="avs">${AVATARS.map(a => `<button type="button" data-av="${a}" aria-pressed="${a === av}">${a}</button>`).join('')}</div>
      <p class="err" id="editErr"></p>
      <div class="actions"><button type="button" class="btn ghost" id="eCancel">Cancel</button><button type="button" class="btn" id="eSave">Save</button></div>`, true);
    $$('[data-av]', sheet).forEach(b => b.onclick = () => { av = b.dataset.av; $('.big', sheet).textContent = av; $$('[data-av]', sheet).forEach(x => x.setAttribute('aria-pressed', x === b)); });
    $('#eCancel', sheet).onclick = closeModal;
    $('#eSave', sheet).onclick = () => {
      const name = $('#editName', sheet).value.trim(), err = $('#editErr', sheet);
      if (!name) { err.textContent = 'Type a name first.'; return; }
      if (S.profiles.some(x => x !== p && x.name.toLowerCase() === name.toLowerCase())) { err.textContent = 'Someone already has that name. Try another one.'; return; }
      const wasCurrent = S.current === p.name;
      p.name = name; p.avatar = av; if (wasCurrent) S.current = name;
      save(); closeModal(); renderHome(); renderHeader();
    };
  }

  /* ---------- home: players + path ---------- */
  function renderHome() {
    const p = cur();
    const players = $('#players'); players.innerHTML = '';
    if (!S.profiles.length) players.innerHTML = '<p class="fine">No players yet. A grown-up can add one in 🔒 Grown-ups.</p>';
    S.profiles.forEach(x => {
      const t = h(`<div class="ptile${x === p ? ' on' : ''}"><button type="button" class="pselect" aria-pressed="${x === p}"><span class="av">${x.avatar}</span><span class="nm">${esc(x.name)}</span><small>${TIER_NAME[x.age]} · ⭐ ${x.xp}${x.time.locked ? ' · 🔒' : ''}</small></button>
        <button type="button" class="pedit" aria-label="Edit ${esc(x.name)}">✏️</button></div>`);
      $('.pselect', t).onclick = () => { S.current = x.name; save(); renderHome(); renderHeader(); if (x.time.locked) openLock(x); };
      $('.pedit', t).onclick = () => openEdit(x);
      players.appendChild(t);
    });
    const hero = $('#hello');
    if (!p) { hero.innerHTML = '<h2>Who is playing?</h2>'; $('#path').innerHTML = ''; return; }
    const deck = deckFor(p.age), next = deck.find(g => !p.done[g.id]) || deck[0];
    hero.innerHTML = `<span class="av big">${p.avatar}</span><div class="hi"><h2>Hi, ${esc(p.name)}!</h2>
      <p>⭐ ${p.xp} XP · 🔥 ${p.streak}-day streak${p.combo > 1 ? ` · ⚡ ${p.combo} perfect games in a row` : ''}</p></div>
      <button type="button" class="btn big" id="playBtn" ${p.time.locked ? 'disabled' : ''}>${p.time.locked ? '🔒 Locked' : '▶ Play'}</button>`;
    $('#playBtn').onclick = () => go(next.id);
    $('#pathTitle').textContent = `${p.name}'s path · ${TIER_NAME[p.age]}`;
    const box = $('#path'); box.innerHTML = '';
    const offs = [0, 56, 0, -56]; let k = 0, found = false;
    CAT.units[p.age].forEach((u, ui) => {
      const games = deck.filter(g => g.unit === ui); if (!games.length) return;
      box.appendChild(h(`<div class="unit ${p.age}"><h4>Unit ${ui + 1} · ${u}</h4><p>${games.length} cards</p></div>`));
      games.forEach(g => {
        const done = p.done[g.id]; let st = 'open';
        if (done) st = 'done'; else if (!found) { st = 'current'; found = true; }
        const n = h(`<button type="button" class="node ${st}"><span class="dot">${g.icon}</span><span>${g.title}</span><small>${done ? '⭐'.repeat(done) : ''}</small></button>`);
        n.style.transform = `translateX(${offs[k++ % 4]}px)`;
        n.onclick = () => go(g.id);
        box.appendChild(n);
      });
    });
    const other = p.age === 'young' ? 'older' : 'young';
    $('#peekBtn').textContent = `Grown-ups: peek at the ${TIER_NAME[other]} deck`;
    $('#peekBtn').onclick = () => go(deckFor(other)[0].id);
  }

  /* ---------- deck of flash cards ---------- */
  let mounted = null, lastIdx = -1;
  const stars = n => '⭐'.repeat(n) + '☆'.repeat(3 - n);
  function unmountGame() { try { mounted && mounted.unmount && mounted.unmount(); } catch (e) {} mounted = null; CH.stopVoice(); }

  function award(id, st) {
    const p = cur(); if (!p) return null;
    const xp = 10 + st * 5;
    p.combo = st === 3 ? p.combo + 1 : 0;
    const bonus = p.combo >= 2 ? Math.min(25, 5 * (p.combo - 1)) : 0;
    p.xp += xp + bonus; p.done[id] = Math.max(p.done[id] || 0, st);
    const today = new Date().toDateString();
    if (p.last !== today) { p.streak += 1; p.last = today; }
    save(); renderHeader();
    return { xp, bonus, combo: p.combo, name: p.name };
  }

  function openCard(id) {
    const g = byId[id], p = cur();
    if (!g) return go('home');
    if (p && p.time.locked) { go('home'); openLock(p); return; }
    unmountGame();
    const deck = deckFor(g.tier), i = deck.indexOf(g);
    const dir = lastIdx < 0 ? '' : i >= lastIdx ? 'in-next' : 'in-prev'; lastIdx = i;
    $('#home').hidden = true; $('#deck').hidden = false;
    $('#progress').innerHTML = deck.map((d, j) => `<button type="button" class="seg${j === i ? ' here' : ''}${p && p.done[d.id] ? ' s' + p.done[d.id] : ''}" aria-label="Card ${j + 1}: ${d.title}"></button>`).join('');
    $$('#progress .seg').forEach((s, j) => s.onclick = () => go(deck[j].id));
    $('#pos').textContent = `${i + 1} / ${deck.length}`;
    $('#unitName').textContent = `${TIER_NAME[g.tier]} · Unit ${g.unit + 1} · ${CAT.units[g.tier][g.unit]}`;
    const prev = $('#prevBtn'), next = $('#nextBtn');
    prev.disabled = i === 0; next.disabled = i === deck.length - 1;
    prev.onclick = () => i > 0 && go(deck[i - 1].id);
    next.onclick = () => i < deck.length - 1 && go(deck[i + 1].id);

    const card = h(`<article class="card ${dir}" data-tier="${g.tier}" id="card-${g.id}">
      <div class="ghead"><span class="code">${g.id}</span><div><h3>${g.title}</h3><p class="skill">${g.skill}</p></div>
        <span class="best" aria-label="Best">${p && p.done[g.id] ? stars(p.done[g.id]) : ''}</span>
        <button class="speak" type="button" aria-label="Read the instructions aloud">🔊</button></div>
      <p class="how">${g.how}</p><div class="play"></div><div class="result" role="status" hidden></div>
      <details class="notes"><summary>Design notes</summary><ul>${g.notes.map(n => `<li>${n}</li>`).join('')}</ul></details></article>`);
    $('#stack').innerHTML = ''; $('#stack').appendChild(card);
    $('.speak', card).onclick = () => CH.say(g.say);
    mounted = CH.engines[g.engine]($('.play', card), g.cfg, makeApi(g, card, deck, i)) || {};
    if (g.tier === 'young') setTimeout(() => { if ($('#card-' + g.id)) CH.say(g.say); }, 350);
    window.scrollTo({ top: 0 });
  }

  function makeApi(g, card, deck, i) {
    let mistakes = 0;
    const res = $('.result', card), young = g.tier === 'young';
    const show = (ok, title, msg, buttons) => {
      res.className = 'result ' + (ok ? 'ok' : 'bad');
      res.innerHTML = `<div class="rtext"><strong>${title}</strong><span>${msg}</span></div><div class="rbtns"></div>`;
      buttons.forEach(b => { const el = h(`<button type="button" class="btn ${b.cls || ''}">${b.text}</button>`); el.onclick = () => { res.hidden = true; b.fn && b.fn(); }; $('.rbtns', res).appendChild(el); });
      res.hidden = false;
    };
    return {
      young, say: CH.say,
      mistake() { mistakes++; },
      hide() { res.hidden = true; },
      feedback({ ok, title, msg, btn = 'OK', onBtn }) {
        show(ok, title, msg, [{ text: btn, cls: ok ? '' : 'warn', fn: onBtn }]);
        if (young) CH.say(ok ? LINES.yes : pick(LINES.keepGoing));
      },
      finish({ title }) {
        const st = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;
        const tries = mistakes + 1;
        const rw = award(g.id, st);
        const best = $('.best', card); if (best && rw) best.textContent = stars(cur().done[g.id]);
        const seg = $$('#progress .seg')[i]; if (seg && rw) seg.className = `seg here s${cur().done[g.id]}`;
        let msg = `<span class="stars">${stars(st)}</span> ${st === 3 ? 'First try!' : `${tries} tries`}`;
        if (rw) msg += ` · +${rw.xp} XP` + (rw.bonus ? ` · <b class="combo">⚡ ${rw.combo} in a row: +${rw.bonus} bonus</b>` : '');
        else msg += ' · Pick a player to save stars.';
        const p = cur();
        if (p && p.time.overtime) {
          show(true, title, msg + ' · That was the last game for now.', [{ text: 'Finish', fn: () => lockNow(p) }]);
          setTimeout(() => { if (p.time.overtime) lockNow(p); }, 8000);
        } else {
          const last = i === deck.length - 1;
          show(true, title, msg, [{ text: '↻ Play again', cls: 'ghost', fn: () => openCard(g.id) }, { text: last ? 'Back to path' : 'Next card ▶', fn: () => go(last ? 'home' : deck[i + 1].id) }]);
        }
        if (young || (rw && rw.bonus)) CH.say(rw && rw.bonus ? LINES.streak : pick(LINES.praise));
      }
    };
  }

  /* ---------- routing: #home or #<card id>; browser back/forward work too ---------- */
  function go(where) {
    const p = cur();
    if (p && p.time.overtime && mounted) { lockNow(p); return; }   // leaving a game after time is up ends the session
    const target = where === 'home' ? '#home' : '#' + where;
    if (location.hash === target) route(); else location.hash = target;
  }
  function route() {
    const id = location.hash.slice(1);
    if (id && byId[id]) return openCard(id);
    unmountGame(); lastIdx = -1;
    $('#deck').hidden = true; $('#home').hidden = false; renderHome();
  }
  window.addEventListener('hashchange', route);
  $('#homeBtn').onclick = () => go('home');
  document.addEventListener('keydown', e => {
    if (!modal.hidden || $('#deck').hidden || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
    if (e.key === 'ArrowRight') $('#nextBtn').click();
    if (e.key === 'ArrowLeft') $('#prevBtn').click();
  });

  renderHeader(); route();
  const p0 = cur(); if (p0 && p0.time.locked) openLock(p0);
  window.__app = { S, deckFor, byId };
})(window.CH);
