/* ---------- 對話框 ---------- */
const DLG = {
  active: false, typing: false, full: '', i: 0, res: null, choices: null, sel: 0, who: null,
  show(who, text) {
    this.active = true; $('dialog').classList.remove('hide'); $('dlgCh').innerHTML = ''; this.choices = null;
    const look = who === 'me' ? LOOKS.me : who && who.look ? (typeof who.look === 'string' ? LOOKS[who.look] : who.look) : null;
    if (this.who && this.who.ch) this.who.ch.say(false);
    this.who = who;
    $('dlgName').textContent = who === 'me' ? '阿德' : who ? who.name : '旁白';
    $('dlgName').style.background = who === 'me' ? 'var(--pin-deep)' : '';
    const pc = $('dlgP'); pc.classList.toggle('hide', !look); if (look) drawPortrait(pc, look);
    if (who && who.ch) who.ch.say(true);
    if (who === 'me') PL.ch.say(true);
    this.full = text; this.i = 0; this.typing = true; $('dlgText').textContent = ''; $('dlgNext').classList.add('hide');
  },
  tick(dt) {
    if (!this.typing) return;
    this.i = Math.min(this.full.length, this.i + dt * 38);
    $('dlgText').textContent = this.full.slice(0, Math.floor(this.i));
    if (this.i >= this.full.length) this.finishType();
  },
  finishType() { this.typing = false; $('dlgText').textContent = this.full; if (!this.choices) $('dlgNext').classList.remove('hide'); if (this.who && this.who.ch) this.who.ch.say(false); PL.ch.say(false); },
  advance() { if (!this.active || this.choices) return; if (this.typing) { this.finishType(); return; } sfx('tick'); const r = this.res; this.res = null; r && r(); },
  key(code) {
    if (!this.choices) return;
    const btns = [...$('dlgCh').children];
    if (code === 'ArrowDown' || code === 'KeyS') this.sel = (this.sel + 1) % btns.length;
    if (code === 'ArrowUp' || code === 'KeyW') this.sel = (this.sel + btns.length - 1) % btns.length;
    if (/^Digit[1-9]$/.test(code)) { const i = +code.slice(5) - 1; if (btns[i]) return btns[i].click(); }
    if (code === 'Enter' || code === 'Space' || code === 'KeyE') return btns[this.sel].click();
    btns.forEach((b, i) => b.classList.toggle('sel', i === this.sel));
  },
  hide() { this.active = false; this.choices = null; $('dialog').classList.add('hide'); if (this.who && this.who.ch) this.who.ch.say(false); PL.ch.say(false); this.who = null; },
};
function say(who, text) { return new Promise(res => { DLG.show(who, text); DLG.res = res; }); }
function choose(opts) {
  return new Promise(res => {
    DLG.finishType(); $('dlgNext').classList.add('hide');
    const box = $('dlgCh'); box.innerHTML = ''; DLG.sel = 0; DLG.choices = opts;
    opts.forEach((o, i) => { const b = document.createElement('button'); b.textContent = (i + 1) + '. ' + o; if (i === 0) b.classList.add('sel'); b.onclick = e => { e.stopPropagation(); sfx('blip'); DLG.choices = null; box.innerHTML = ''; res(i); }; box.appendChild(b); });
  });
}

