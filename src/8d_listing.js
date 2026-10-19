/* =========================================================
   listing：族群篩選、新股申購、下市清算、融資券追繳、分析師與不定期角色、交情浮動、小地圖、步數
   ========================================================= */

/* ---------- 看盤：族群篩選與標籤 ---------- */
let trSec = 'all';
const isWatch = i => !!(SEASON.delist && SEASON.delist.i === i && curDay() >= SEASON.delist.warn);
const isNewStock = i => !!(STOCKS[i].ipo && SEASON.from[i] <= curDay() && curDay() < SEASON.from[i] + 5);
const hasPos = id => !!(S.hold[id] || S.mar[id] || S.sht[id]);
function stockTags(i) { return (isNewStock(i) ? '<span class="tagN">新股</span>' : '') + (isWatch(i) ? '<span class="tagW">全額交割</span>' : ''); }
function secBar() {
  const secs = [...new Set(STOCKS.filter((s, i) => listedNow(i)).map(s => s.sector))];
  return `<div class="qtyBar secBar"><span>族群</span>${[['all', '全部'], ['mine', '我的持股']].concat(secs.map(x => [x, x])).map(([v, t]) => `<button class="tab ${trSec === v ? 'on' : ''}" data-sec="${v}">${t}</button>`).join('')}</div>`;
}
function rowShown(s, i) {
  const mine = hasPos(s.id); if (!listedNow(i) && !mine) return false;
  return trSec === 'all' || (trSec === 'mine' ? mine : s.sector === trSec);
}

/* ---------- 新股申購（掛牌前 5 天開放，掛牌當天早上抽籤） ---------- */
const IPO_WIN = 0.15, IPO_FEE = 20;
const ipoUpcoming = () => (SEASON.ipos || []).filter(x => x.day > S.day && x.day - S.day <= 5);
const subFrozen = () => { let v = 0; for (const id in S.subs || {}) { const x = (SEASON.ipos || []).find(x => STOCKS[x.i].id === id); if (x) v += x.price * LOT; } return v; };
function ipoBox() {
  const up = ipoUpcoming(); if (!up.length) return '';
  return `<div class="sum ipoBox">${up.map(x => { const s = STOCKS[x.i], sub = (S.subs || {})[s.id]; return `<span><b>新股申購</b>　${s.name}（${s.sector}）承銷價 ${x.price} 元，第 ${x.day} 天掛牌，中籤率約 ${IPO_WIN * 100}%　${sub ? '<b>已申購 1 張，掛牌當天早上抽籤</b>' : `<button class="btn" data-sub="${s.id}">申購 1 張（先扣 ${wan(x.price * LOT + IPO_FEE)}）</button>`}</span>`; }).join('')}</div>`;
}
function subscribe(id) {
  const x = SEASON.ipos.find(x => STOCKS[x.i].id === id), cost = x.price * LOT + IPO_FEE;
  if (S.cash < cost) { toast('現金不夠申購'); sfx('bad'); return; }
  S.subs = S.subs || {}; S.subs[id] = x.day; S.cash -= cost; sfx('coin');
  toast(`已申購 ${STOCKS[x.i].name} 1 張，第 ${x.day} 天早上抽籤；沒抽中會退款（手續費 ${IPO_FEE} 元不退）`); renderTrade(); refreshHUD();
}
function ipoDraw() {
  for (const id in S.subs || {}) {
    if (S.subs[id] !== S.day) continue; const x = SEASON.ipos.find(x => STOCKS[x.i].id === id); delete S.subs[id]; if (!x) continue;
    if (Math.random() < IPO_WIN) { const h = S.hold[id] || (S.hold[id] = { q: 0, cost: 0 }); h.cost = (h.cost * h.q + x.price) / (h.q + 1); h.q += 1; toast(`<b class="up">恭喜中籤！</b>${STOCKS[x.i].name} 1 張以承銷價 ${x.price} 元入帳，今天掛牌`); sfx('done'); }
    else { S.cash += x.price * LOT; toast(`${STOCKS[x.i].name}沒抽中，申購款已退回`); }
  }
}

/* ---------- 下市清算 ---------- */
function delistSettle(i, px) {
  const s = STOCKS[i], h = S.hold[s.id], m = S.mar[s.id], t = S.sht[s.id]; let got = 0;
  if (h) { const v = h.q * LOT * px * (1 - FEE - TAX); S.cash += v; got += v; delete S.hold[s.id]; }
  if (m) { const v = m.q * LOT * px * (1 - FEE - TAX) - m.loan; S.cash += v; got += v; delete S.mar[s.id]; }
  if (t) { const v = t.margin + t.proceeds - t.q * LOT * px * (1 + FEE); S.cash += v; got += v; delete S.sht[s.id]; }
  for (const k in S.calls || {}) if (S.calls[k].id === s.id) delete S.calls[k];
  return `${s.name}今天收盤後終止上市${h || m || t ? `，你的部位以最後收盤價 ${px.toFixed(2)} 元清算，${got >= 0 ? '拿回' : '倒賠'} ${money(Math.abs(got))} 元` : ''}`;
}

/* ---------- 融資券：收盤低於 130% 先發追繳令，兩天內沒補足就強制平倉 ---------- */
const CALL_TARGET = 1.66, CALL_DAYS = 2;
function callNeed(c) {
  const i = STOCKS.findIndex(s => s.id === c.id), p = prices()[i];
  if (c.kind === 'mar') { const m = S.mar[c.id]; return m ? Math.max(0, m.loan - m.q * LOT * p / CALL_TARGET) : 0; }
  const t = S.sht[c.id]; return t ? Math.max(0, CALL_TARGET * t.q * LOT * p - t.margin - t.proceeds) : 0;
}
function callBox() {
  const ks = Object.keys(S.calls || {}); if (!ks.length) return '';
  return `<div class="sum callBox">${ks.map(k => { const c = S.calls[k], s = SBY[c.id]; return `<span><b class="down">追繳令</b>　${s.name}${c.kind === 'mar' ? '融資' : '融券'}，第 ${c.due} 天收盤前要補足維持率，否則強制${c.kind === 'mar' ? '斷頭' : '回補'}　<button class="btn" data-pay="${k}">補繳 ${wan(Math.ceil(callNeed(c)))}</button></span>`; }).join('')}</div>`;
}
function payCall(key) {
  const c = S.calls[key]; if (!c) return; const need = Math.ceil(callNeed(c));
  if (S.cash < need) { toast('現金不夠補繳，可以先賣掉一些股票'); sfx('bad'); return; }
  S.cash -= need; if (c.kind === 'mar') S.mar[c.id].loan -= need; else S.sht[c.id].margin += need;
  delete S.calls[key]; sfx('coin'); toast(`已補繳 ${money(need)} 元，追繳解除`); renderTrade(); refreshHUD();
}
function checkCall(s, kind, r, msgs, liquidate) {
  S.calls = S.calls || {}; const key = s.id + ':' + kind, c = S.calls[key], nm = kind === 'mar' ? '融資' : '融券', act = kind === 'mar' ? '斷頭賣出' : '回補';
  if (r >= MAINT) { if (c) { delete S.calls[key]; msgs.push(`${s.name}${nm}維持率回到 ${Math.round(r * 100)}%，追繳解除`); } return; }
  if (r < 1 || (c && S.day >= c.due)) { liquidate(); delete S.calls[key]; msgs.push(`${s.name}${nm}${r < 1 ? '維持率跌破 100%' : '追繳期限到了還沒補足'}，被證券行強制${act}`); return; }
  if (!c) { S.calls[key] = { id: s.id, kind, due: S.day + CALL_DAYS }; GAME.callRing = true; msgs.push(`營業員小美發出追繳令：${s.name}${nm}維持率剩 ${Math.round(r * 100)}%，請在第 ${S.day + CALL_DAYS} 天收盤前補繳（看盤畫面上方），或自己先賣掉，否則會被強制${act}`); }
  else msgs.push(`追繳中：${s.name}${nm}維持率 ${Math.round(r * 100)}%，期限是第 ${c.due} 天收盤`);
}

/* ---------- 早報：新股、下市、今天會出現的人 ---------- */
function irregular(id, p) {
  if (!SEASON || !S.day) return false; let h = SEASON.seed ^ 0x9e3779b9; for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 2654435761);
  return mulberry32((h + S.day * 104729 + S.season * 7) >>> 0)() < p;
}
function listNews(d) {
  const out = [];
  for (const x of SEASON.ipos || []) { const s = STOCKS[x.i]; if (d === Math.max(1, x.day - 5)) out.push(`新股 ${s.name}（${s.sector}）將在第 ${x.day} 天掛牌，承銷價 ${x.price} 元，證券行開放申購抽籤`); if (d === x.day) out.push(`新股 ${s.name} 今天掛牌上市`); }
  const dl = SEASON.delist; if (dl) { const s = STOCKS[dl.i]; if (d === dl.warn) out.push(`${s.name}財報虧損、會計師出具保留意見，今天起打入全額交割股，不能融資融券`); if (d === dl.day) out.push(`${s.name}今天是最後交易日，收盤後終止上市，持股以收盤價清算`); }
  const who = NPCS.filter(n => n.appear && n.appearNote && irregular(n.id, n.appearP)).map(n => n.appearNote);
  return out.map(t => `<p><b>證券新聞</b>：${t}</p>`).join('') + (who.length ? `<p><b>今日動態</b>：${who.join('；')}</p>` : '');
}

/* ---------- 交情：0–10 點，會漲也會跌；每個人的消息體質開局時決定（看不到） ---------- */
const hearts = id => Math.round(((S.bond || {})[id] || 0) / 2);
function assignTypes() {
  if (S.npcType) return; const r = mulberry32(((S.base != null ? S.base : S.seed) ^ 0x2545f491) >>> 0), t = {};
  const fixed = { engineer: 'sharp', shipping: 'sharp', builder: 'sharp', prof: 'sharp', driver: 'sharp', guru: 'contra' };
  const rest = NPCS.filter(n => n.rel && !fixed[n.id]).map(n => n.id);
  for (let i = rest.length - 1; i > 0; i--) { const j = r() * (i + 1) | 0;[rest[i], rest[j]] = [rest[j], rest[i]]; }
  rest.forEach((id, k) => t[id] = k < rest.length * 0.4 ? 'sharp' : k < rest.length * 0.7 ? 'coin' : 'contra');
  if (t.analyst === 'contra') t.analyst = 'coin';
  S.npcType = Object.assign(t, fixed);
}
function bondDecay() {
  const now = S.season * 100 + S.day;
  for (const n of NPCS) { if (!n.rel) continue; const b = (S.bond || {})[n.id] || 0, idle = now - ((S.bondSeen || {})[n.id] || now); if (b && idle >= 2 && idle % 2 === 0) S.bond[n.id] = b - 1; }
}

/* ---------- 分析師與不定期出現的角色 ---------- */
function sectorCall(n) {
  if (S.talked[n.id] === S.day) return null; S.talked[n.id] = S.day; bondUp(n);
  const d = S.day; if (d + 3 > DAYS) return null; const secs = {};
  STOCKS.forEach((s, i) => { if (!listed(i, d + 1) || !listed(i, d + 3)) return; let c = 1; for (let k = d + 1; k <= d + 3; k++) c *= 1 + SEASON.ret[k][i]; (secs[s.sector] = secs[s.sector] || []).push(c - 1); });
  const ranked = Object.entries(secs).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  if (!ranked.length) return null; const act = ranked[0][1] >= 0 ? 1 : -1, dir = Math.random() < relOf(n) ? act : -act;
  const m = { kind: 'sector', sector: ranked[0][0], dir, text: `研究報告：未來三天，${ranked[0][0]}族群${dir > 0 ? '偏多，可以留意' : '偏空，最好避開'}。`, resolve: d + 3, day: d, npc: n.id, npcName: n.name };
  S.rumors.push(m); $('noteBadge').classList.remove('hide'); return m;
}
const POLICY_HINT = { limitdown: '上面在討論要把跌幅縮小、暫停放空，就這幾天。', reform10: '聽說漲跌幅限制要放寬到 10%，長官最近一直在開這個會。' };
Object.assign(TALK, {
  analyst: async n => {
    await say(n, '我是城中證券研究部的陳博士。今天幫你看一個族群的三天走勢。');
    const m = sectorCall(n);
    if (!m) { await say(n, S.talked[n.id] === S.day ? '報告今天已經給你了，記得對照消息本。' : '季底了，盤勢不明朗，我建議多看少做。'); return; }
    await say(n, m.text); toast('記進消息本了（三天後驗證）'); sfx('tick');
  },
  guru: async n => { await rumorTalk(n, '各位鄉親！跟著明燈老師，保證賺大錢！今天的飆股是——'); },
  prof: async n => {
    await say(n, '我在大學教經濟，最近在看一些總體數據……');
    const d = S.day, e = SEASON.events.find(e => e.day > d && e.day - d <= 6 && e.def.hints.length);
    if (e && S.talked[n.id] !== d) {
      S.talked[n.id] = d; bondUp(n);
      const m = { kind: 'event', ev: e.id, text: e.def.hints[0][1], truth: Math.random() < relOf(n), resolve: e.day, day: d, npc: n.id, npcName: n.name };
      if (!m.truth) { const f = EVENTS.filter(x => !x.policy && x.id !== e.id && x.hints.length); const fe = f[Math.random() * f.length | 0]; m.ev = null; m.evName = fe.name; m.text = fe.hints[0][1]; }
      S.rumors.push(m); $('noteBadge').classList.remove('hide'); await say(n, '我的判斷是：' + m.text); toast('記進消息本了'); return;
    }
    await rumorTalk(n, '總體面最近沒什麼大事，倒是學生跟我提過一個個股……');
  },
  driver: async n => {
    await say(n, '（壓低聲音）我是幫長官開車的。車上聽到的事，不要說是我講的。');
    if (S.talked[n.id] === S.day) { await say(n, '今天就這樣，我要去接長官了。'); return; }
    S.talked[n.id] = S.day; bondUp(n);
    const d = S.day, dl = SEASON.delist, pe = SEASON.policy.find(x => x.day > d && x.day - d <= 4), ip = (SEASON.ipos || []).find(x => x.day > d && x.day - d <= 6);
    let m = null;
    if (dl && dl.warn > d && dl.warn - d <= 5) m = { kind: 'event', ev: null, evName: '下市', text: `${STOCKS[dl.i].name}的財報有大問題，過幾天就要打入全額交割了，手上有的快跑。`, truth: true, resolve: dl.warn };
    else if (pe) m = { kind: 'event', ev: pe.id, text: POLICY_HINT[pe.id], truth: true, resolve: pe.day };
    else if (ip) m = { kind: 'event', ev: null, evName: '新股', text: `${STOCKS[ip.i].name}要上市了，承銷價很便宜，記得去證券行抽籤。`, truth: true, resolve: ip.day };
    if (!m) { await say(n, '最近長官都在開會，沒聽到什麼特別的。'); return; }
    Object.assign(m, { day: d, npc: n.id, npcName: n.name }); S.rumors.push(m); $('noteBadge').classList.remove('hide');
    await say(n, m.text); toast('記進消息本了'); sfx('tick');
  },
});

/* ---------- 小地圖（右下角，上方＝鏡頭方向，點一下打開大地圖） ---------- */
let MINI = null;
function buildMini() {
  const c = document.createElement('canvas'); c.id = 'mini'; c.width = c.height = 300; c.title = '小地圖（點一下打開城市地圖）';
  $('hud').appendChild(c); c.onclick = () => toggleMap(); if (IS_TOUCH) c.classList.add('touch'); MINI = { c, g: c.getContext('2d'), t: 0 };
}
function drawMini(dt) {
  if (!MINI) return; MINI.t -= dt; if (MINI.t > 0) return; MINI.t = 0.12;
  const show = GAME.started && GAME.mode === 'ground'; MINI.c.classList.toggle('hide', !show); if (!show) return;
  const g = MINI.g, W = 300, C = W / 2, RAD = 26, sc = (C - 10) / RAD, up = PL.dir, fw = PL.camF, rt = new V3().crossVectors(fw, up);
  const cosR = Math.cos(RAD * 1.25 / R), P = d => { const k = d.dot(up); if (k < cosR) return null; const v = d.clone().addScaledVector(up, -k); return [C + v.dot(rt) * R * sc, C - v.dot(fw) * R * sc]; };
  g.clearRect(0, 0, W, W); g.save(); g.beginPath(); g.arc(C, C, C - 3, 0, 7); g.fillStyle = 'rgba(246,238,219,.93)'; g.fill(); g.clip();
  g.strokeStyle = '#a69a86'; g.lineWidth = 22; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const road of ['E', 'M']) { g.beginPath(); let pen = false; for (let s = -Math.PI * R; s <= Math.PI * R; s += 1) { const q = P(roadPoint(road, s)); if (q) { pen ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); pen = true; } else pen = false; } g.stroke(); }
  g.font = '700 22px "Huninn", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const p of PLACES) { const q = P(p.front); if (!q) continue; const on = GUIDE === p.id; g.fillStyle = on ? '#d7263d' : '#2b7f86'; g.beginPath(); g.arc(q[0], q[1], on ? 10 : 7, 0, 7); g.fill(); g.fillStyle = '#2b2622'; g.fillText(p.name.replace(/^城中|^月見|^清香/, '').slice(0, 2), q[0], q[1] - 18); }
  for (const n of NPCS) { if (!n.ch.root.visible || !n.rel || S.talked[n.id] === S.day) continue; const q = P(n.dir); if (!q) continue; g.fillStyle = '#f2b62e'; g.strokeStyle = '#2b2622'; g.lineWidth = 2; g.beginPath(); g.arc(q[0], q[1], 6, 0, 7); g.fill(); g.stroke(); }
  g.restore();
  g.fillStyle = '#d7263d'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(C, C - 16); g.lineTo(C + 11, C + 11); g.lineTo(C, C + 5); g.lineTo(C - 11, C + 11); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = '#2b2622'; g.lineWidth = 5; g.beginPath(); g.arc(C, C, C - 3, 0, 7); g.stroke();
}

/* ---------- 步數：1 單位約 10 公尺、一步約 0.7 公尺 ---------- */
const STEP_PER_UNIT = 14;
let stepLast = null, stepT = 0;
function countSteps(dt) {
  if (!GAME.started || GAME.mode !== 'ground') { stepLast = null; return; }
  if (stepLast) {
    const d = angDist(stepLast, PL.dir);
    if (d > 0.0005 && d < 2) {
      const st = d * STEP_PER_UNIT; S.stepsDay = (S.stepsDay || 0) + st; S.steps = (S.steps || 0) + st;
      const key = S.season * 100 + S.day; if (S.stepsDay >= 10000 && S.stepGoal !== key) { S.stepGoal = key; toast('今天走了一萬步！日行萬步，身體健康'); sfx('done'); }
    }
  }
  stepLast = PL.dir.clone();
  stepT -= dt; if (stepT < 0) { stepT = 0.3; const el = $('chStep').lastElementChild, t = Math.floor(S.stepsDay || 0).toLocaleString('zh-TW'); if (el.textContent !== t) el.textContent = t; }
}
