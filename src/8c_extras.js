/* =========================================================
   extras：遊戲長度、下單張數、行情回饋、街頭反應、交情、新手教學、年代新聞
   ========================================================= */
const yearOf = s => (S && S.total ? 1984 : 1985) + s;

/* ---------- 開新局：選遊戲長度 ---------- */
// 每個月的種子由這一局的 base 推出來，換月時行情重新洗牌
const seasonSeed = (base, s) => ((Math.imul(base ^ 0x5bd1e995, 2654435761) >>> 0) + s * 104729) % 2000000000;
const NEWOPT = { total: 6 };
function openNewGame() { $('titleBtns').classList.add('hide'); $('newBox').classList.remove('hide'); renderNewGame(); }
function renderNewGame() {
  const T = NEWOPT.total;
  $('newBox').innerHTML = `<h3>開始新的一年</h3>
    <div class="nbRow"><span>遊戲長度</span><button class="tab ${T === 6 ? 'on' : ''}" data-total="6">6 個月（1985–1990）</button><button class="tab ${T === 12 ? 'on' : ''}" data-total="12">12 個月（1985–1996）</button></div>
    <p class="nbNote">每個月 20 個交易日，代表那一年最熱鬧的一個月：6 個月從 1985 年走到 1990 年泡沫破裂；12 個月會再經歷崩盤後的起伏，一直走到 1996 年。遊戲後半段行情偏空，大約六到七成的日子在跌。</p>
    <div class="nbRow" style="justify-content:flex-end;margin-bottom:0"><button class="btn" id="nbBack">返回</button><button class="btn pri" id="nbGo">開始</button></div>`;
  const q = s => $('newBox').querySelector(s);
  $('newBox').querySelectorAll('[data-total]').forEach(b => b.onclick = () => { NEWOPT.total = +b.dataset.total; renderNewGame(); });
  q('#nbBack').onclick = () => { $('newBox').classList.add('hide'); $('titleBtns').classList.remove('hide'); };
  q('#nbGo').onclick = () => startGame(false, null, { len: 20, total: NEWOPT.total, base: Math.random() * 2000000000 | 0 });
}

/* ---------- 下單張數 ---------- */
let trQty = 1;
const QTY_OPTS = [[1, '1 張'], [5, '5 張'], [10, '10 張'], ['q', '¼ 資金'], ['h', '½ 資金'], ['all', '全部']];
const qtyLab = () => ({ q: '¼', h: '½', all: '全部' })[trQty] || String(trQty);
const qtyFrac = () => trQty === 'q' ? 0.25 : trQty === 'h' ? 0.5 : 1;
function qtyFor(id, side, mode) {
  const i = STOCKS.findIndex(s => s.id === id), unit = prices()[i] * LOT;
  if (side > 0) {
    if (typeof trQty === 'number') return trQty;
    const per = mode === 'cash' ? unit * (1 + FEE) : mode === 'mar' ? unit * (1 - MARGIN_LOAN + FEE) : unit * SHORT_MARGIN;
    return Math.max(1, Math.floor(S.cash * qtyFrac() / per));
  }
  const held = ((mode === 'cash' ? S.hold : mode === 'mar' ? S.mar : S.sht)[id] || {}).q || 0;
  return -(typeof trQty === 'number' ? Math.min(trQty, held) : Math.max(1, Math.ceil(held * qtyFrac())));
}
function qtyBar() { return `<div class="qtyBar"><span>每次下單</span>${QTY_OPTS.map(([v, t]) => `<button class="tab ${trQty === v ? 'on' : ''}" data-qty="${v}">${t}</button>`).join('')}</div>`; }

/* ---------- 賺賠的回饋：漲停歡呼、斷頭警報 ---------- */
const PULSE = { day: '', lim: {}, warn: {} };
function flash(color, alarm) {
  const el = $('flash'); el.style.setProperty('--fc', color); el.classList.remove('go', 'alarm'); void el.offsetWidth; el.classList.add('go'); if (alarm) el.classList.add('alarm');
}
function ring() { if (!AU.ctx || !S.sfx) return; const t = AU.ctx.currentTime; for (let k = 0; k < 8; k++) tone(k % 2 ? 1320 : 1760, t + k * 0.11, 0.09, 'square', 0.045); }
function celebrate(text, good) {
  toast(`<b class="${good ? 'up' : 'down'}">${text}</b>`);
  if (good) {
    sfx('done'); flash('rgba(255,196,60,.8)'); buzz(70); achieve('limitup');
    const crowd = NPCS.filter(n => n.sit && n.road === 'E' && n.ch.root.visible); crowd.forEach(n => n.ch.wave = 2.5);
    if (crowd.length) crowdSay = { t: 3.5, n: crowd[0], txt: '漲停！漲停啦！' };
  } else { sfx('bad'); flash('rgba(20,150,90,.7)'); buzz([40, 50, 40]); }
}
function marginWarn(s, r, kind) {
  const lv = r < 1.36 ? 2 : r < 1.45 ? 1 : 0; if (lv <= (PULSE.warn[s.id] || 0)) return; PULSE.warn[s.id] = lv;
  ring(); flash('rgba(215,38,61,.8)', true); buzz([200, 100, 200]);
  toast(`<b class="down">營業員小美緊急來電</b>：你的${s.name}${kind}維持率剩 ${Math.round(r * 100)}%，${lv === 2 ? '再跌一點就會被斷頭！' : '快接近 130% 的斷頭線了。'}可以先賣掉一部分或停損。`);
}
function marketPulse() {
  const key = `${S.season}-${S.day}`; if (PULSE.day !== key) { PULSE.day = key; PULSE.lim = {}; PULSE.warn = {}; }
  const p = prices(), pc = prevClose();
  STOCKS.forEach((s, i) => {
    if (!listedNow(i)) return;
    const [up, dn] = limits(pc[i]), long = ((S.hold[s.id] || {}).q || 0) + ((S.mar[s.id] || {}).q || 0), short = (S.sht[s.id] || {}).q || 0;
    if (!PULSE.lim[s.id] && (long || short)) {
      if (p[i] >= up) { PULSE.lim[s.id] = 1; celebrate(long ? `你的${s.name}漲停了！` : `你放空的${s.name}漲停了……`, long > 0); }
      else if (p[i] <= dn) { PULSE.lim[s.id] = 1; celebrate(short && !long ? `你放空的${s.name}跌停了！` : `你的${s.name}跌停了……`, short > 0 && !long); }
    }
    const m = S.mar[s.id]; if (m && m.loan) marginWarn(s, m.q * LOT * p[i] / m.loan, '融資');
    const t = S.sht[s.id]; if (t && t.q) marginWarn(s, (t.margin + t.proceeds) / (t.q * LOT * p[i]), '融券');
  });
}

/* ---------- 街頭跟著行情變化 ---------- */
const PED_TALK = {
  up: ['今天又漲了！晚上去吃好料的！', '我同事說他一個月賺了一台車。', '紅通通的，心情真好！', '連我阿嬤都在問要買哪一支。', '漲成這樣，明天還追不追啊？'],
  down: ['完了完了，套牢了……', '我的會錢都押進去了……', '早知道就不要融資。', '今天不要跟我講股票。', '跌成這樣，要不要攤平啊？'],
  flat: ['今天盤很悶。', '還在等方向啦。', '聽說下午有消息？', '不漲不跌，看了好累。', '先去喝杯茶再說。'],
};
let pedSay = { t: 0, n: null, txt: '' }, pedT = 4;
function marketMood() {
  if (!SEASON || !S.day) return 0; const ph = PHASE(), d = Math.min(S.day, DAYS);
  if (ph === 'open' || ph === 'post' || ph === 'night') return idxOf(prices()) / SEASON.index[d - 1] - 1;
  return d > 1 ? SEASON.index[d - 1] / SEASON.index[d - 2] - 1 : 0;
}
let buskT = 3;
function updateStreet(dt) {
  // 靠近拉二胡的阿伯，會先聽到琴聲
  const bk = NPC_BY.busker; buskT -= dt;
  if (bk && buskT < 0) { buskT = 13; if (GAME.mode === 'ground' && !GAME.busy && bk.ch.root.visible && angDist(PL.dir, bk.dir) < 14) { erhu(); if (!S.eggs.busker) pedSay = { t: 4, n: bk, txt: '♪～' }; } }
  pedSay.t -= dt; pedT -= dt; if (pedT > 0 || GAME.mode !== 'ground') return; pedT = 5 + Math.random() * 4;
  const mood = marketMood(), ph = PHASE(), k = NPC_BY.kiosk;
  if ((ph === 'post' || ph === 'night') && Math.abs(mood) >= 0.03 && k && k.ch.root.visible && angDist(PL.dir, k.dir) < 14) { pedSay = { t: 4, n: k, txt: `號外！號外！今天大盤${mood > 0 ? '大漲' : '大跌'} ${Math.abs(mood * 100).toFixed(1)}%！` }; return; }
  const near = NPCS.filter(n => n.walk && n.ch.root.visible && angDist(PL.dir, n.dir) < 12); if (!near.length) return;
  const pool = mood > 0.012 ? PED_TALK.up : mood < -0.012 ? PED_TALK.down : PED_TALK.flat;
  pedSay = { t: 3.5, n: near[Math.random() * near.length | 0], txt: pool[Math.random() * pool.length | 0] };
}

/* ---------- 交情：常聊天、請客會變好，太久沒去會變淡（hearts、assignTypes 在 8d） ---------- */
const bondLv = id => hearts(id) >= 4 ? 2 : hearts(id) >= 2 ? 1 : 0;
// 準的人交情越好越準（七成到九成）；丟銅板的人一直是五成；反指標大約兩成會對
function relOf(n) { assignTypes(); const t = (S.npcType || {})[n.id], b = (S.bond || {})[n.id] || 0; return t === 'sharp' ? Math.min(0.9, 0.7 + 0.02 * b) : t === 'coin' ? 0.5 : t === 'contra' ? 0.2 : n.rel; }
function bondUp(n, k = 1) {
  if (!n.rel) return; S.bond = S.bond || {}; S.bondSeen = S.bondSeen || {}; const before = hearts(n.id);
  S.bond[n.id] = Math.min(10, (S.bond[n.id] || 0) + k); S.bondSeen[n.id] = S.season * 100 + S.day;
  const after = hearts(n.id); if (after > before) toast(`你和${n.name}的交情升到 ${'♥'.repeat(after)}`);
}

/* ---------- 新手教學（第一天） ---------- */
const TUT = [
  { text: '教學 1/4：到證券行門口找老張伯聊天，聽一則明牌', at: 'broker', done: () => S.rumors.length > 0 },
  { text: () => PHASE() === 'pre' ? '教學 2/4：9 點開盤後，走進城中證券（在門口按互動），到櫃檯找小美照明牌買 1 張（或按 K）' : '教學 2/4：走進城中證券（在門口按互動），到櫃檯找小美照明牌買 1 張（或按 K）', at: 'broker', done: () => S.tradeDay === S.day || Object.keys(S.hold).length + Object.keys(S.mar).length + Object.keys(S.sht).length > 0 },
  { text: '教學 3/4：等 13:30 收盤，看看今天的成績（按 T 可以快轉）', done: () => PHASE() === 'post' || PHASE() === 'night' || S.day > 1 },
  { text: '教學 4/4：按 N 打開消息本，看看明牌有沒有應驗', done: () => !!S.tutN },
];
function tutTick() {
  if (S.tut == null || S.tut >= TUT.length || !GAME.started) return;
  if (TUT[S.tut].done()) { S.tut++; sfx('done'); toast(S.tut >= TUT.length ? '教學完成！之後照左上角的任務提示自由發揮吧' : `完成教學 ${S.tut}/${TUT.length}`); }
}
const TUT_GOAL = {
  id: 'tut', text: () => { const t = TUT[S.tut].text; return typeof t === 'function' ? t() : t; }, done: () => false,
  when: () => S.tut != null && S.tut < TUT.length, get at() { return S.tut != null && S.tut < TUT.length ? TUT[S.tut].at : undefined; },
};
GOALS.unshift(TUT_GOAL);

/* ---------- 年代新聞：最後一個月的泡沫 ---------- */
function eraNews(d) {
  if (yearOf(S.season) !== 1990 || S.ended) return '';
  const a = Math.round(DAYS * 0.3), b = Math.round(DAYS * 0.45), c = Math.round(DAYS * 0.55);
  const t = d === 1 ? '新的一年，人人都在問：指數會不會衝上一萬兩千點？' : d === a ? '全民瘋股票：計程車司機、菜販都在報明牌' : d === b ? '央行總裁警告股市過熱，將收緊銀根' : d === c ? '萬點崩跌！融資斷頭潮湧現' : '';
  return t ? `<p><b>${d === c ? '頭條快訊' : '時事'}</b>：${t}</p>` : '';
}
