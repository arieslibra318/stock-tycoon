/* =========================================================
   結局：第 5 季結束（1990 年泡沫破裂）時依總資產分成成功／普通／失敗；
   中途成為證券大亨直接成功，總資產跌破 30 萬直接失敗
   ========================================================= */
const FINAL_SEASON = 5, BROKE_NET = 3e5, WIN_BY_LEN = { 40: 1e7, 20: 4e6 };
const winNet = () => WIN_BY_LEN[S.len || 40] || 1e7;
const endingKind = nw => nw >= winNet() ? 'win' : nw < START_CASH ? 'fail' : 'normal';
function seasonEntry() {
  const nw = netWorth(), base = (S.netHist || [])[0] || S.dayStartNet || START_CASH, d = Math.min(S.day, DAYS);
  return { s: S.season, me: nw / base - 1, idx: SEASON.index[d] / SEASON.index[0] - 1 };
}
const ENDINGS = {
  win: {
    tag: '成功結局', title: '台北股市傳奇', paper: ['城中日報・號外', '少年股神阿德　身價突破千萬'],
    lines: () => [
      '1990 年 2 月，加權指數衝上一萬兩千點，整座城市都在慶祝。',
      '你在最熱鬧的時候想起老張伯的話：「大家都在搶的時候，就是該走的時候。」',
      '幾個月後泡沫破裂，指數跌回兩千多點；你的錢，早就安安穩穩地落袋了。',
      '你在城中路買下一整棟透天厝，一樓開了間小小的研究室，專門教人看財報。',
      '小美笑著說：「阿德，現在大家都叫你老師了。」',
    ],
    quote: '市場永遠都在，紀律讓你一直留在場上。',
  },
  tycoon: {
    tag: '成功結局', title: '證券大亨誕生', get paper() { return ['城中日報・號外', `從跑單小弟到證券大亨　身價破${wan(RANKS[RANKS.length - 1].min).replace(' ', '')}`]; },
    lines: () => [
      `第 ${S.season} 季第 ${Math.min(S.day, DAYS)} 天，你的總資產突破 ${wan(RANKS[RANKS.length - 1].min)}，證券行的報價看板好像為你停了三秒。`,
      '記者小周連夜寫稿，大戶阿忠在居酒屋舉杯：「後生可畏！」',
      '可是你心裡清楚，運氣和實力一樣重要，下一次不一定這麼幸運。',
      '你捐了一筆錢給城中公園，換上新的長椅，讓下棋的阿伯坐得舒服一點。',
      '城中金牛的鼻子，從此被摸得更亮了。',
    ],
    quote: '賺到錢的人很多，守得住的人很少。',
  },
  normal: {
    tag: '普通結局', title: '平凡的幸福', paper: ['城中日報', '萬點行情落幕　股民回歸日常'],
    lines: () => [
      '1990 年，泡沫破裂，加權指數從一萬兩千點一路跌到兩千多點。',
      '你沒有變成大亨，但也沒有被市場吞掉。',
      '你用賺來的錢買了一台野狼機車，週末載著家人去淡水看夕陽。',
      '偶爾經過城中證券，看板還是紅紅綠綠地跳著，你只是笑一笑，繼續往前騎。',
      '拉二胡的阿伯還在騎樓下：「股市起起落落，日子還是要過。」',
    ],
    quote: '平凡，也是一種幸福。',
  },
  fail: {
    tag: '失敗結局', title: '泡沫之後', paper: ['城中日報', '股市崩盤　萬點跌回兩千'],
    lines: () => [
      '1990 年，泡沫破裂。看板上一整片綠色，像一場停不下來的雨。',
      '當初的明牌一個個落空，帳戶裡的數字越來越小。',
      S.phone ? '你把大哥大賣回通訊行，退掉雅房，提著行李走向車站。' : '你退掉雅房，提著行李走向車站。',
      '房東太太追出來，塞給你一包肉粽：「年輕人，留得青山在。」',
      '多年以後你當了老師，第一堂理財課總是這樣開場：「不要借錢買股票。」',
    ],
    quote: '輸了一場，不代表輸了一生。',
  },
  broke: {
    tag: '失敗結局', title: '斷頭的那一天', paper: ['城中日報', '融資斷頭潮　散戶血本無歸'],
    lines: () => [
      `第 ${S.season} 季第 ${Math.min(S.day, DAYS)} 天，你的總資產跌破三十萬。`,
      '營業員小美打了三通電話，你都不敢接。',
      S.phone ? '你把大哥大賣回通訊行，退掉雅房，提著行李走向車站。' : '你退掉雅房，提著行李走向車站。',
      '房東太太追出來，塞給你一包肉粽：「年輕人，留得青山在。」',
      '多年以後你當了老師，第一堂理財課總是這樣開場：「不要借錢買股票。」',
    ],
    quote: '輸了一場，不代表輸了一生。',
  },
};
const ENDING_SCENE = { win: 'fireworks', tycoon: 'fireworks', normal: 'sunset', fail: 'rain', broke: 'rain' };

/* ---------- 背景動畫（2D canvas） ---------- */
function endingAnim(cv, scene) {
  const g = cv.getContext('2d'); let W = 0, H = 0, dpr = 1, raf = 0, t0 = performance.now(), last = t0;
  const rr2 = (a, b) => a + Math.random() * (b - a);
  let city = [];
  const resize = () => {
    dpr = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    city = []; for (let x = -10; x < W + 10;) { const w = rr2(34, 80), h = rr2(H * 0.12, H * 0.38); const win = []; for (let y = 10; y < h - 10; y += 16) for (let wx = 8; wx < w - 10; wx += 14) win.push([wx, y, Math.random()]); city.push({ x, w, h, win }); x += w + rr2(2, 10); }
  };
  resize(); addEventListener('resize', resize);
  const parts = [], rockets = [], drops = [], falls = [];
  const skyline = (lit, col) => { for (const b of city) { g.fillStyle = col; g.fillRect(b.x, H - b.h, b.w, b.h); for (const [wx, wy, r] of b.win) if (r < lit) { g.fillStyle = r < lit * 0.5 ? '#ffd27a' : '#f2b94e'; g.fillRect(b.x + wx, H - b.h + wy, 6, 8); } } };
  const frame = now => {
    const dt = Math.min(0.05, (now - last) / 1000), t = (now - t0) / 1000; last = now;
    if (scene === 'fireworks') {
      const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#070b24'); sky.addColorStop(1, '#2a1b4a'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
      if (Math.random() < dt * 1.6) rockets.push({ x: rr2(W * 0.1, W * 0.9), y: H, vy: -rr2(H * 0.9, H * 1.2), top: rr2(H * 0.12, H * 0.42), hue: [45, 0, 330, 200, 120][Math.random() * 5 | 0] });
      for (let i = rockets.length - 1; i >= 0; i--) { const r = rockets[i]; r.y += r.vy * dt; g.fillStyle = '#fff6d0'; g.fillRect(r.x - 1.5, r.y, 3, 10);
        if (r.y < r.top) { const n = 70; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, v = rr2(60, 190); parts.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rr2(1.2, 2), age: 0, hue: r.hue + rr2(-15, 15) }); } rockets.splice(i, 1); } }
      for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.age += dt; if (p.age > p.life) { parts.splice(i, 1); continue; } p.vy += 90 * dt; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt; g.globalAlpha = 1 - p.age / p.life; g.fillStyle = `hsl(${p.hue},95%,65%)`; g.fillRect(p.x - 1.6, p.y - 1.6, 3.2, 3.2); }
      g.globalAlpha = 1;
      if (falls.length < 70 && Math.random() < 0.6) falls.push({ x: rr2(0, W), y: -10, v: rr2(40, 90), r: rr2(0, 6), s: rr2(4, 9), c: ['#ffd27a', '#ffffff', '#ff8a5c'][Math.random() * 3 | 0] });
      for (const f of falls) { f.y += f.v * dt; f.r += dt * 3; if (f.y > H + 10) { f.y = -10; f.x = rr2(0, W); } g.fillStyle = f.c; g.save(); g.translate(f.x + Math.sin(f.r) * 8, f.y); g.rotate(f.r); g.fillRect(-f.s / 2, -f.s / 4, f.s, f.s / 2); g.restore(); }
      skyline(0.75, '#14102a');
    } else if (scene === 'sunset') {
      const k = Math.min(1, t / 40), sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, `hsl(${265 - k * 20},45%,${32 - k * 12}%)`); sky.addColorStop(0.6, `hsl(${22 - k * 8},85%,${62 - k * 14}%)`); sky.addColorStop(1, `hsl(40,90%,${70 - k * 20}%)`); g.fillStyle = sky; g.fillRect(0, 0, W, H);
      const sy = H * 0.55 + k * H * 0.25; g.fillStyle = '#ffcf6a'; g.beginPath(); g.arc(W * 0.68, sy, Math.min(W, H) * 0.11, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(60,30,40,.55)'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { const bx = (t * 30 + i * 140) % (W + 200) - 100, by = H * 0.25 + i * 26 + Math.sin(t * 2 + i) * 6; g.beginPath(); g.moveTo(bx - 8, by - 4); g.quadraticCurveTo(bx - 4, by - 8, bx, by); g.quadraticCurveTo(bx + 4, by - 8, bx + 8, by - 4); g.stroke(); }
      skyline(k * 0.6, '#3a2433');
      g.fillStyle = '#2b1d26'; g.fillRect(0, H - 22, W, 22);
      const mx = (t * 70) % (W + 160) - 80, my = H - 26; g.fillStyle = '#1a1018';   // 野狼機車
      g.beginPath(); g.arc(mx - 16, my, 8, 0, 7); g.arc(mx + 16, my, 8, 0, 7); g.fill(); g.fillRect(mx - 18, my - 14, 36, 8); g.fillRect(mx - 4, my - 30, 10, 18); g.beginPath(); g.arc(mx + 1, my - 34, 6, 0, 7); g.fill(); g.fillRect(mx - 16, my - 26, 9, 14); g.beginPath(); g.arc(mx - 11, my - 30, 5, 0, 7); g.fill();
    } else {
      const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#1d2226'); sky.addColorStop(1, '#3a4248'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
      if (falls.length < 26 && Math.random() < dt * 6) falls.push({ x: rr2(0, W), y: -20, v: rr2(30, 70), txt: Math.random() < 0.5 ? '▼' + rr2(3, 10).toFixed(2) + '%' : '跌停', a: rr2(0.25, 0.6), s: rr2(14, 26) });
      for (let i = falls.length - 1; i >= 0; i--) { const f = falls[i]; f.y += f.v * dt; if (f.y > H + 30) { falls.splice(i, 1); continue; } g.globalAlpha = f.a; g.fillStyle = '#2fbf71'; g.font = `700 ${f.s}px ui-monospace,monospace`; g.fillText(f.txt, f.x, f.y); }
      g.globalAlpha = 1;
      skyline(0.12 + (Math.sin(t * 7) > 0.97 ? 0.1 : 0), '#14181b');
      while (drops.length < 220) drops.push({ x: rr2(0, W), y: rr2(-H, H), v: rr2(500, 800), l: rr2(10, 22) });
      g.strokeStyle = 'rgba(200,215,225,.35)'; g.lineWidth = 1; g.beginPath(); for (const d of drops) { d.y += d.v * dt; d.x -= d.v * dt * 0.12; if (d.y > H) { d.y = -20; d.x = rr2(0, W + 60); } g.moveTo(d.x, d.y); g.lineTo(d.x + d.l * 0.12, d.y - d.l); } g.stroke();
      if (Math.random() < dt * 0.15) { g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 0, W, H); }
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); };
}

/* ---------- 結局音樂 ---------- */
function endingTune(kind) {
  if (!AU.ctx || !S.music) return () => { };
  const c = AU.ctx, out = c.createGain(); out.gain.value = 0.7; out.connect(AU.master); AU.hold = true;
  const tunes = {
    win: { wave: 'triangle', bpm: 132, notes: [[60, 1], [64, 1], [67, 1], [72, 2], [67, 1], [72, 3], [0, 1], [69, 1], [71, 1], [72, 1], [74, 2], [76, 1], [79, 3], [0, 1], [77, 1], [76, 1], [74, 1], [72, 4]] },
    normal: { wave: 'sine', bpm: 84, notes: [[64, 2], [67, 1], [69, 1], [72, 2], [69, 2], [67, 2], [64, 1], [62, 1], [60, 4], [62, 2], [64, 1], [67, 1], [69, 2], [67, 2], [64, 4]] },
    fail: { wave: 'triangle', bpm: 66, notes: [[69, 2], [67, 1], [65, 1], [64, 2], [62, 2], [60, 2], [59, 1], [57, 1], [57, 4], [0, 1], [64, 2], [62, 2], [60, 2], [57, 4]] },
  };
  const tn = tunes[kind === 'tycoon' ? 'win' : kind === 'broke' ? 'fail' : kind], beat = 60 / tn.bpm; let t = c.currentTime + 0.3;
  for (const [n, d] of tn.notes) {
    if (n) { const o = c.createOscillator(), e = c.createGain(); o.type = tn.wave; o.frequency.value = 440 * Math.pow(2, (n - 69) / 12); e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(0.14, t + 0.03); e.gain.exponentialRampToValueAtTime(0.0001, t + d * beat * 0.95); o.connect(e); e.connect(out); o.start(t); o.stop(t + d * beat); }
    t += d * beat;
  }
  return () => { out.gain.setTargetAtTime(0, c.currentTime, 0.2); setTimeout(() => { out.disconnect(); AU.hold = false; }, 600); };
}

/* ---------- 結局演出 ---------- */
function playEnding(kind) {
  const E = ENDINGS[kind], scene = ENDING_SCENE[kind], nw = netWorth();
  S.ended = kind; GAME.busy = true; DLG.hide(); closeModals(); GAME.busy = true;
  const log = (S.log || []).concat(S.log && S.log.some(l => l.s === S.season) ? [] : [seasonEntry()]);
  const eggN = Object.keys(S.eggs || {}).length + (S.certs || []).length, eggT = EGG_LIST.length + EGG_CERT_POS.length;
  const root = $('ending'), cv = $('endCv'), wrap = $('endWrap');
  wrap.innerHTML = `<div class="endStory"><div class="endTag">${E.tag}</div><div class="endTitle">${E.title}</div>
    <div class="endPaper"><small>${E.paper[0]}</small>${E.paper[1]}</div>
    <div class="endLines">${E.lines().map(l => `<p>${l}</p>`).join('')}</div><div class="endQuote">${E.quote}</div></div>
    <div class="endStats"><h3 style="margin:0 0 8px">${E.tag}・${E.title}</h3>
      <div class="sum" style="margin-bottom:8px"><span>最終總資產 <b class="${cls(nw - START_CASH)}">${money(nw)}</b></span><span>本金的 <b>${(nw / START_CASH).toFixed(1)}</b> 倍</span><span>身分 <b>${RANKS[rankOf(nw)].name}</b></span><span>彩蛋 <b>${eggN}/${eggT}</b></span></div>
      <table class="q"><tr><th style="text-align:left">季</th><th>你的資產</th><th>同期大盤</th></tr>${log.map(l => `<tr><td style="text-align:left">第 ${l.s} 季</td><td class="${cls(l.me)}">${pct(l.me)}</td><td class="${cls(l.idx)}">${pct(l.idx)}</td></tr>`).join('')}</table>
      <p class="note">${kind === 'win' || kind === 'tycoon' ? '恭喜！' : kind === 'normal' ? '守住本金就贏過很多人了。' : '下一次，試試少用融資、多聽準的人說話。'}結局只看第 ${FINAL_SEASON} 季結束時的總資產：${wan(winNet())} 以上是成功、低於本金是失敗，中間是普通；中途當上證券大亨或資產跌破 ${BROKE_NET / 1e4} 萬 會提早迎來結局。</p>
      <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button class="btn" id="endAgain">重新開始新的人生</button><button class="btn pri" id="endGo">繼續自由遊玩</button></div></div>
    <button class="endSkip" id="endSkip">跳過 ▸</button>`;
  root.className = 'end-' + scene; root.classList.remove('hide');
  const stopAnim = endingAnim(cv, scene), stopTune = endingTune(kind);
  if (kind === 'fail' || kind === 'broke') sfx('bad'); else sfx('done');
  const q = s => wrap.querySelector(s), lines = [...wrap.querySelectorAll('.endLines p')];
  let step = 0, timer = 0, done = false;
  const steps = [() => q('.endTitle').classList.add('on'), () => q('.endPaper').classList.add('on')].concat(lines.map(p => () => p.classList.add('on')), [() => q('.endQuote').style.opacity = 1, showStats]);
  function showStats() {
    if (done) return; done = true; clearTimeout(timer);
    q('.endStory').style.opacity = 0; q('#endSkip').remove();
    setTimeout(() => { q('.endStory').style.display = 'none'; const st = q('.endStats'); st.style.display = 'block'; requestAnimationFrame(() => st.style.opacity = 1); }, 700);
  }
  const next = () => { if (done) return; clearTimeout(timer); if (step < steps.length) steps[step++](); if (step < steps.length) timer = setTimeout(next, step <= 2 ? 1300 : 2800); };
  timer = setTimeout(next, 500);
  q('.endStory').onclick = next; q('#endSkip').onclick = showStats;
  return new Promise(res => {
    const close = () => { stopAnim(); stopTune(); root.classList.add('hide'); wrap.innerHTML = ''; };
    q('#endGo').onclick = () => { close(); GAME.busy = false; toast('自由遊玩：之後不會再有結局，盡情挑戰更高的身分吧'); res(); };
    q('#endAgain').onclick = () => { close(); startGame(false); };
  });
}
