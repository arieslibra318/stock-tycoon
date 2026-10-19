/* =========================================================
   main：音樂、提示、主迴圈、開始遊戲
   ========================================================= */
function sfx2(k) {
  if (!AU.ctx || !S.sfx) return; const t = AU.ctx.currentTime;
  if (k === 'bell') { [1568, 1568, 1568].forEach((f, i) => tone(f, t + i * 0.18, 0.5, 'sine', 0.12)); }
  if (k === 'extra') { noiseHit(t, 0.3, 900, 0.4, 'bandpass'); [392, 523, 659].forEach((f, i) => tone(f, t + 0.1 + i * 0.09, 0.4, 'square', 0.05)); }
  if (k === 'tick2') tone(2093, t, 0.03, 'square', 0.02);
}
const _sfx = sfx; sfx = function (k) { if (k === 'bell' || k === 'extra' || k === 'tick2') return sfx2(k); return _sfx(k); };
const MEL = [[69, 72, 74, 76, 74, 72, 69, 0, 67, 69, 72, 0, 74, 72, 69, 0], [69, 72, 74, 79, 76, 74, 72, 0, 74, 76, 74, 72, 69, 0, 0, 0], [76, 79, 81, 79, 76, 74, 76, 0, 72, 74, 76, 74, 72, 69, 67, 0], [69, 0, 72, 74, 76, 0, 74, 72, 69, 0, 0, 0, 69, 0, 0, 0]];
const BASS = [45, 41, 43, 45];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function musicLoop() {
  const c = AU.ctx, step = 60 / 100 / 2; let next = c.currentTime + 0.2, i = 0;
  setInterval(() => {
    if (!AU.ctx) return;
    while (next < c.currentTime + 0.3) {
      const bar = (i >> 4) % 4, s = i % 16, n = MEL[bar][s], open = PHASE() === 'open';
      const quiet = GAME.paused || !S.music || AU.hold;   // 暫停、關音樂、播結局時不排音符
      if (n && !quiet) tone(mtof(n), next, step * 1.7, open ? 'square' : 'triangle', open ? 0.022 : 0.045, AU.mus);
      if (s % 4 === 0 && !quiet) tone(mtof(BASS[bar] - 12), next, step * 3, 'sine', 0.08, AU.mus);
      if (open && s % 2 === 1 && !quiet) tone(mtof(BASS[bar] + 12), next, step * 0.6, 'sine', 0.02, AU.mus);
      next += step; i++;
    }
  }, 100);
}
function updatePrompt() {
  const p = $('prompt');
  if (!NEAR || GAME.mode !== 'ground' || GAME.busy) { if (!p.classList.contains('hide')) p.classList.add('hide'); return; }
  const t = NEAR.verb || `和${NEAR.name}說話`; if ($('promptT').textContent !== t) $('promptT').textContent = t;
  p.querySelector('kbd').classList.toggle('hide', IS_TOUCH); p.classList.remove('hide');
}
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 64 : 54; camera.updateProjectionMatrix(); }
const clock = new THREE.Clock(); let saveT = 0, hudT = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05); GAME.t += dt; SKY_U.uTime.value = GAME.t;
  if (GAME.started) {
    if (!GAME.busy && !GAME.paused) TIME.min += dt * RATE[PHASE()] * (S.speed || 1);
    const ph = PHASE();
    if (ph !== lastPhase) { lastPhase = ph; onPhase(ph); }
    if (ph === 'open' && MK.path) { const k = clamp(Math.floor((TIME.min - 540) / 5), 0, TICKS); if (k !== MK.k) { MK.k = k; MK.prices = MK.path.map(p => p[k]); GAME.idxTicks.push(idxOf(MK.prices)); drawBoard(); renderTrade(); marketPulse(); if (k % 3 === 0) sfx('tick2'); } }
    if (!GAME.busy && TIME.min >= 23 * 60) endDay();
    if (PHASE() === 'pre' && TIME.min >= 480 && GAME.jkDay !== `${S.season}-${S.day}`) { GAME.jkDay = `${S.season}-${S.day}`; toast(`08:00 日韓開盤：日經 ${pct(SEASON.jp[S.day])}・韓股 ${pct(SEASON.kr[S.day])}`); sfx('tick'); renderTrade(); }
    updateGoals(dt); updateRain(dt); updateCerts(dt); updateStreet(dt);
    movePlayer(dt); placeChar(PL.ch, PL.dir, PL.fwd, 0); PL.ch.speed = PL.speed / 5; PL.ch.update(dt, GAME.t);
    updateNPCs(dt); NEAR = findNear(); updatePrompt(); updateTicker(); updateMarquee(dt);
    const tHide = !IS_TOUCH || GAME.busy || GAME.mode !== 'ground'; if (tHide !== GAME.tHide) { GAME.tHide = tHide; $('touch').classList.toggle('hide', tHide); }
    $('marquee').classList.toggle('hide', PHASE() !== 'open'); $('hint').classList.toggle('hide', PHASE() === 'open' || GAME.mode !== 'ground');
    hudT -= dt; if (hudT < 0) { hudT = 0.5; refreshHUD(); }
  }
  updateCars(dt, GAME.started ? PL.dir : new V3(0, 1, 0));
  updateCamera(dt); updateLighting(); DLG.tick(dt);
  sky.position.copy(camera.position);
  renderer.render(scene, camera); updateLabels();
}
/* ---------- 雨 ---------- */
let RAIN = null;
function buildRain() {
  const N = 1600, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = rr(-16, 16); pos[i * 3 + 1] = rr(0, 16); pos[i * 3 + 2] = rr(-16, 16); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  RAIN = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xc8dcf0, size: 0.09, transparent: true, opacity: 0.75, depthWrite: false }));
  RAIN.frustumCulled = false; RAIN.visible = false; scene.add(RAIN);
}
function updateRain(dt) {
  if (!RAIN) return;
  const w = SEASON.weather[Math.min(S.day, DAYS)], on = GAME.mode === 'ground' && (w === 'rain' || w === 'storm' || w === 'typhoon');
  RAIN.visible = on; if (!on) return;
  const sp = w === 'rain' ? 14 : 24, a = RAIN.geometry.attributes.position.array, n = w === 'rain' ? 900 : 1600;
  RAIN.geometry.setDrawRange(0, n);
  for (let i = 0; i < n; i++) { a[i * 3 + 1] -= sp * dt; if (w !== 'rain') a[i * 3] += 5 * dt; if (a[i * 3 + 1] < 0) { a[i * 3 + 1] += 16; a[i * 3] = rr(-16, 16); } if (a[i * 3] > 16) a[i * 3] -= 32; }
  RAIN.geometry.attributes.position.needsUpdate = true;
  RAIN.position.copy(PL.dir).multiplyScalar(R); RAIN.quaternion.setFromUnitVectors(new V3(0, 1, 0), PL.dir);
}
async function intro() {
  GAME.busy = true;
  const o = NPC_BY.oldhand;
  try {
    await say(null, `${yearOf(S.season)} 年，台北。股市一天比一天熱，連菜市場都在討論股票。`);
    await say('me', '我是阿德，帶著家裡給的兩百萬來台北。從今天起，我要在證券行闖出一片天！');
    await say(o, '少年仔，第一次來證券行喔？聽阿伯一句話：消息到處都有，真真假假，要自己判斷。');
    await say(o, '每天 6 點看早報，知道美股昨晚怎麼走；8 點日本、韓國先開盤；9 點台股開盤、下午 1 點半收盤。開盤前去街上多聽聽，記在消息本裡，看誰講得準。');
    await say(o, '還有，那種保證月息四分的投資公司……天底下哪有這麼好的事，你自己想想。');
    await say('me', '（左上角的「任務提示」會告訴我下一步。按 H 看新手指南、P 暫停時間；遊戲不會自動存檔，隨手按 Q 留個暫存點。）');
    if (S.tut === 0) {
      await say(NPC_BY.broker, '我是營業員小美。第一次來的話，我帶你走一遍：先聽消息、再下單、收盤看結果。');
      const c = await choose(['好，帶我走一遍', '我會玩了，跳過教學']);
      if (c === 1) S.tut = TUT.length; else GUIDE = 'broker';
    }
  } finally { DLG.hide(); GAME.busy = false; }
  toast('先去街上打聽消息，9 點再回證券行下單');
}
async function startGame(cont, state, opts) {
  initAudio();
  const prevLen = (S && S.len) || 40; $('newBox').classList.add('hide');
  DLG.hide(); ['trade', 'notes', 'help', 'saves', 'sum', 'ext'].forEach(id => $(id).classList.add('hide')); GAME.busy = false; GAME.ending = false; GAME.paused = false; $('pauseTag').classList.add('hide'); $('bPause').classList.remove('on');
  $('fade').style.opacity = 1; await wait(600);
  if (state) { S = Object.assign(S0(), JSON.parse(JSON.stringify(state))); TIME.min = S.min || 360; cont = true; }
  else if (cont && loadGame()) { TIME.min = S.min || 360; } else { S = S0(); TIME.min = 6 * 60; const o = opts || { len: prevLen, base: Math.random() * 2000000000 | 0 }; S.len = o.len; S.base = o.base; S.seed = seasonSeed(o.base, 1); S.tut = 0; }
  loadSoundPref(); genSeason(S.seed); applyWeatherOverrides();
  lastPhase = PHASE(); MK.prices = null; MK.path = null;
  if (lastPhase === 'open') { MK.path = genIntraday(S.day); MK.k = -1; }
  if (lastPhase === 'post' || lastPhase === 'night') MK.prices = SEASON.close[S.day].slice();
  if (cont && S.pos) setPlayerAt(new V3(...S.pos)); else setPlayerAt(slot('E', 4, 1, 2.3).dir, slot('E', 11, 1, 2.3).dir);
  GAME.mode = 'ground'; GAME.started = true; CAM.blend = 0;
  groundCam(_cg); camera.position.copy(_cg.pos); CAM.look.copy(_cg.look); camera.up.copy(_cg.up);
  $('title').classList.add('hide'); $('hud').classList.remove('hide');
  applySound(); refreshHUD(); drawBoard();
  $('fade').style.opacity = 0; canvas.focus();
  if (cont) { GAME.mpDay = TIME.min > 365 ? `${S.season}-${S.day}` : null; GAME.jkDay = TIME.min >= 480 ? `${S.season}-${S.day}` : null; }
  if (!cont) setTimeout(intro, 700); else toast(`${state ? '讀取存檔完成' : '歡迎回來'}：第 ${S.season} 季・第 ${S.day} 個交易日 ${fmtTime()}`);
  setTimeout(async () => { await dayWeather(); await morningPaper(); }, cont ? 1500 : 11000);
}
async function boot() {
  resize(); addEventListener('resize', resize);
  try { await Promise.race([Promise.all(['900 40px "Noto Serif TC"', '40px VT323', '20px Huninn'].map(f => document.fonts.load(f, '城中證券0123'))), wait(3500)]); } catch (e) { }
  try {
    genSeason(1987);
    buildCity(); buildCars(); buildNPCs(); NPCS.forEach(n => n.ch.root.visible = false);
    PL.ch = new Character(LOOKS.me); scene.add(PL.ch.root); drawPortrait($('pp'), LOOKS.me);
    setPlayerAt(slot('E', 4, 1, 2.3).dir); placeChar(PL.ch, PL.dir, PL.fwd, 0);
    bindInput(); drawBoard(); buildRain(); buildCerts();
    $('loadTxt').classList.add('hide'); $('titleBtns').classList.remove('hide'); if (hasSave()) $('bCont').classList.remove('hide');
    $('bStart').onclick = openNewGame; $('bCont').onclick = () => startGame(true); $('bLoad').onclick = () => openSaves();
    loop();
  } catch (e) { $('loadTxt').textContent = '載入失敗：' + e.message; console.error(e); }
}
boot();
