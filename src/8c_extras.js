/* =========================================================
   extras：挑戰碼與遊戲長度、下單張數、行情回饋、街頭反應、交情、新手教學、年代新聞
   ========================================================= */
const yearOf = s => 1985 + s;

/* ---------- 挑戰碼：同一個碼＝同一盤行情（不開即時天氣時） ---------- */
const seasonSeed = (base, s) => ((Math.imul(base ^ 0x5bd1e995, 2654435761) >>> 0) + s * 104729) % 2000000000;
function challengeCode(base = S.base, len = S.len || 40) { return base == null ? '' : (len === 20 ? 'S' : 'L') + base.toString(36).toUpperCase().padStart(6, '0'); }
function parseCode(t) {
  const m = /^([SL])([0-9A-Z]{1,7})$/.exec((t || '').toUpperCase().replace(/[^0-9A-Z]/g, ''));
  if (!m) return null; const base = parseInt(m[2], 36);
  return base >= 0 && base < 2147483647 ? { len: m[1] === 'S' ? 20 : 40, base } : null;
}
function dailyBase() { const d = new Date(); return (d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()) * 7919 % 2000000000; }
const NEWOPT = { len: 40, code: '' };
function openNewGame() { $('titleBtns').classList.add('hide'); $('newBox').classList.remove('hide'); renderNewGame(); }
function renderNewGame(msg) {
  const L = NEWOPT.len;
  $('newBox').innerHTML = `<h3>開始新的一年</h3>
    <div class="nbRow"><span>遊戲長度</span><button class="tab ${L === 20 ? 'on' : ''}" data-len="20">短篇・每季 20 天</button><button class="tab ${L === 40 ? 'on' : ''}" data-len="40">完整版・每季 40 天</button></div>
    <p class="nbNote">兩種都是 5 季，從 1986 年走到 1990 年泡沫破裂；短篇大約只要完整版一半的時間。</p>
    <div class="nbRow"><span>挑戰碼</span><input id="nbCode" maxlength="9" placeholder="留白＝隨機新局" value="${NEWOPT.code}" aria-label="挑戰碼" autocomplete="off"><button class="btn" id="nbDaily">今日挑戰</button></div>
    <p class="nbNote">同一個挑戰碼會出現同一盤行情，可以和朋友比誰賺得多（挑戰碼裡已經含有遊戲長度）。${msg ? `<br><b class="down">${msg}</b>` : ''}</p>
    <div class="nbRow" style="justify-content:flex-end;margin-bottom:0"><button class="btn" id="nbBack">返回</button><button class="btn pri" id="nbGo">開始</button></div>`;
  const q = s => $('newBox').querySelector(s);
  $('newBox').querySelectorAll('[data-len]').forEach(b => b.onclick = () => { NEWOPT.len = +b.dataset.len; NEWOPT.code = ''; renderNewGame(); });
  q('#nbDaily').onclick = () => { NEWOPT.code = challengeCode(dailyBase(), NEWOPT.len); renderNewGame(); };
  q('#nbBack').onclick = () => { $('newBox').classList.add('hide'); $('titleBtns').classList.remove('hide'); };
  q('#nbGo').onclick = () => {
    const t = q('#nbCode').value.trim();
    if (t) { const p = parseCode(t); if (!p) return renderNewGame('挑戰碼看起來不對，應該是 S 或 L 開頭、後面接英文和數字'); NEWOPT.code = t; startGame(false, null, p); }
    else startGame(false, null, { len: NEWOPT.len, base: Math.random() * 2000000000 | 0 });
  };
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
    sfx('done'); flash('rgba(255,196,60,.8)');
    const crowd = NPCS.filter(n => n.sit && n.road === 'E' && n.ch.root.visible); crowd.forEach(n => n.ch.wave = 2.5);
    if (crowd.length) crowdSay = { t: 3.5, n: crowd[0], txt: '漲停！漲停啦！' };
  } else { sfx('bad'); flash('rgba(20,150,90,.7)'); }
}
function marginWarn(s, r, kind) {
  const lv = r < 1.36 ? 2 : r < 1.45 ? 1 : 0; if (lv <= (PULSE.warn[s.id] || 0)) return; PULSE.warn[s.id] = lv;
  ring(); flash('rgba(215,38,61,.8)', true);
  toast(`<b class="down">營業員小美緊急來電</b>：你的${s.name}${kind}維持率剩 ${Math.round(r * 100)}%，${lv === 2 ? '再跌一點就會被斷頭！' : '快接近 130% 的斷頭線了。'}可以先賣掉一部分或停損。`);
}
function marketPulse() {
  const key = `${S.season}-${S.day}`; if (PULSE.day !== key) { PULSE.day = key; PULSE.lim = {}; PULSE.warn = {}; }
  const p = prices(), pc = prevClose();
  STOCKS.forEach((s, i) => {
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
function updateStreet(dt) {
  pedSay.t -= dt; pedT -= dt; if (pedT > 0 || GAME.mode !== 'ground') return; pedT = 5 + Math.random() * 4;
  const mood = marketMood(), ph = PHASE(), k = NPC_BY.kiosk;
  if ((ph === 'post' || ph === 'night') && Math.abs(mood) >= 0.03 && k && k.ch.root.visible && angDist(PL.dir, k.dir) < 14) { pedSay = { t: 4, n: k, txt: `號外！號外！今天大盤${mood > 0 ? '大漲' : '大跌'} ${Math.abs(mood * 100).toFixed(1)}%！` }; return; }
  const near = NPCS.filter(n => n.walk && n.ch.root.visible && angDist(PL.dir, n.dir) < 12); if (!near.length) return;
  const pool = mood > 0.012 ? PED_TALK.up : mood < -0.012 ? PED_TALK.down : PED_TALK.flat;
  pedSay = { t: 3.5, n: near[Math.random() * near.length | 0], txt: pool[Math.random() * pool.length | 0] };
}

/* ---------- 交情：常聊天的人消息更準 ---------- */
const BOND_NAME = ['陌生', '熟識', '麻吉'];
const bondLv = id => { const b = (S.bond || {})[id] || 0; return b >= 7 ? 2 : b >= 3 ? 1 : 0; };
const relOf = n => Math.min(0.95, n.rel + [0, 0.05, 0.1][bondLv(n.id)]);
function bondUp(n) {
  if (!n.rel) return; S.bond = S.bond || {}; const before = bondLv(n.id); S.bond[n.id] = (S.bond[n.id] || 0) + 1; const after = bondLv(n.id);
  if (after > before) { toast(`你和${n.name}的交情變成「${BOND_NAME[after]}」了：${after === 2 ? '消息更準，偶爾還會多講一則' : '講的消息會更準一點'}`); sfx('done'); }
}

/* ---------- 新手教學（第一天） ---------- */
const TUT = [
  { text: '教學 1/4：到證券行門口找老張伯聊天，聽一則明牌', at: 'broker', done: () => S.rumors.length > 0 },
  { text: () => PHASE() === 'pre' ? '教學 2/4：9 點開盤後，到證券行找小美（或按 K）照明牌買 1 張' : '教學 2/4：到證券行找小美（或按 K），照明牌買 1 張股票', at: 'broker', done: () => S.tradeDay === S.day || Object.keys(S.hold).length + Object.keys(S.mar).length + Object.keys(S.sht).length > 0 },
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

/* ---------- 年代新聞：最後一季的泡沫 ---------- */
function eraNews(d) {
  if (S.season !== FINAL_SEASON || S.ended) return '';
  const a = Math.round(DAYS * 0.3), b = Math.round(DAYS * 0.45), c = Math.round(DAYS * 0.55);
  const t = d === 1 ? '新的一年，人人都在問：指數會不會衝上一萬兩千點？' : d === a ? '全民瘋股票：計程車司機、菜販都在報明牌' : d === b ? '央行總裁警告股市過熱，將收緊銀根' : d === c ? '萬點崩跌！融資斷頭潮湧現' : '';
  return t ? `<p><b>${d === c ? '頭條快訊' : '時事'}</b>：${t}</p>` : '';
}
