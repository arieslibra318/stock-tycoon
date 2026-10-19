/* =========================================================
   flow：對話腳本、下單、消息本、收盤結算、號外、一天的節奏、主迴圈
   ========================================================= */
const wait = ms => new Promise(r => setTimeout(r, ms));
const prices = () => MK.prices || SEASON.close[S.day - 1];
const prevClose = () => SEASON.close[S.day - 1];
function holdValue(p = prices()) { let v = 0; STOCKS.forEach((s, i) => { const h = S.hold[s.id]; if (h) v += h.q * LOT * p[i]; }); return v; }
function marginParts(p = prices()) {
  let mv = 0, loan = 0, sv = 0, coll = 0;
  STOCKS.forEach((s, i) => { const m = S.mar[s.id]; if (m) { mv += m.q * LOT * p[i]; loan += m.loan; } const h = S.sht[s.id]; if (h) { sv += h.q * LOT * p[i]; coll += h.margin + h.proceeds; } });
  return { mv, loan, sv, coll, eq: mv - loan + coll - sv };
}
const netWorth = () => S.cash + holdValue() + marginParts().eq + S.deposit;
const rankOf = n => { let r = 0; RANKS.forEach((k, i) => { if (n >= k.min) r = i; }); return r; };
const pct = x => Math.abs(x) < 5e-5 ? '0.00%' : (x > 0 ? '▲' : '▼') + Math.abs(x * 100).toFixed(2) + '%';
const cls = x => x > 0.00001 ? 'up' : x < -0.00001 ? 'down' : '';

/* ---------- 消息 ---------- */
function giveRumor(n) {
  if (S.talked[n.id] === S.day) return null;
  const m = makeRumor(n, S.day); S.talked[n.id] = S.day; if (!m) return null;
  Object.assign(m, { day: S.day, npc: n.id, npcName: n.name }); S.rumors.push(m);
  $('noteBadge').classList.remove('hide'); return m;
}
const GREET = {
  oldhand: ['我在證券行坐了二十年，什麼大風大浪沒看過。', '年輕人，別把雞蛋放在同一個籃子裡。', '消息滿天飛的時候，最要冷靜。'],
  auntie: ['欸，少年仔，你也來看盤喔？', '買菜錢先拿來買股票，晚上再賺回來啦！', '我女兒都說我在賭博，這叫投資好不好！'],
  reporter: ['我跑財經線的，消息比你快一點點。', '我只能說到這裡，你自己判斷喔。'],
  banker: ['做生意要看大環境。', '我們銀行看的是資金往哪裡流。'],
  engineer: ['我只懂電子業，其他的別問我。'], shoeshine: ['擦一雙二十塊，順便聽點消息。', '來擦鞋的老闆都愛聊股票。'], shipping: ['跑船的最怕兩件事：颱風跟戰爭。'], builder: ['土地不會變多，房子只會越來越貴啦！'],
  taxi: ['我一天載幾十個客人，什麼消息都聽得到。'], kiosk: ['報紙一份八塊，消息免費。'], broker: ['歡迎光臨城中證券！'],
};
async function rumorTalk(n, intro) {
  await say(n, intro || pickR(Math.random, GREET[n.role] || ['你好啊。']));
  const m = giveRumor(n);
  if (!m) { await say(n, S.talked[n.id] === S.day ? '今天就這些了，明天再來吧。' : '最近沒什麼特別的消息。'); return; }
  await say(n, m.text); toast('記進消息本了（按 N 查看）'); sfx('tick');
}
const TALK_NIGHT = {
  whale: async n => {
    await say(n, '（滿臉通紅）少年仔，坐坐坐！今天行情你有沒有賺？');
    const c = await choose(['請他喝一杯（1,000 元）', '聊聊天就好']);
    S.izDay = S.day;
    if (c === 1) { await say(n, '哈哈，做股票啊，要膽大心細！'); return; }
    if (S.cash < 1000) { await say(n, '沒錢還請我喝？算了算了。'); return; }
    S.cash -= 1000; sfx('coin'); await rumorTalk(n, '夠意思！跟你講，這個我只跟自己人講……');
  },
  mama: async n => {
    await say(n, '歡迎光臨～今天的燒鳥很新鮮喔。要喝點什麼？');
    const c = await choose(['來一杯清酒（300 元）', '只是看看']);
    S.izDay = S.day;
    if (c === 1) { await say(n, '下次再來坐喔～'); return; }
    if (S.cash < 300) { await say(n, '錢不夠喔？下次再來。'); return; }
    S.cash -= 300; sfx('coin'); await rumorTalk(n, '來，請慢用。對了，剛剛有幾個客人在聊……');
  },
};
const PED_LINES = [
  '今天股市又在吵了，我只想好好上班。', '聽說館前街最北邊有一頭金色的牛，摸了會帶來好運。', '館前街最南邊那隻黑熊，看起來兇，其實是在提醒大家別貪心。',
  '公園那邊下棋的阿伯，以前可是證券行的紅人。', '我阿公說以前的股票是印在紙上的，現在路邊還撿得到喔，哈哈。', '算命仙說我今年財運旺，結果股票套牢了。',
  '車站附近常常有人在拉二胡，很好聽。', '晚上去居酒屋，大戶喝醉了什麼都講。', '颱風天證券行休市，我反而最開心。', '有人說看早報的美股就知道今天台股怎麼走，真的嗎？',
  '城中路東邊有個賣玉蘭花的阿嬤，跟她買一串，聞了心情就好。', '我上次在車站旁邊撿到一張很舊的股票，背面還蓋著紅色印章。', '廟埕裡好像也藏著什麼東西，亮亮的。',
];
const LUCK = ['大吉：明天出門往東走，會遇到貴人。', '中吉：該停損的時候別猶豫，留得青山在。', '小吉：別人搶著買的時候，你可以先喝杯茶。', '上上籤：耐心是你最好的明牌。', '吉：今晚去居酒屋，說不定能聽到好消息。', '平：今天適合研究，不適合衝動。'];
function erhu() {
  if (!AU.ctx || !S.sfx) return; const t0 = AU.ctx.currentTime;
  [[64, 0.5], [67, 0.5], [69, 0.9], [67, 0.4], [64, 0.4], [62, 0.8], [60, 0.5], [62, 0.5], [64, 1.3]].reduce((t, [n, d]) => { const o = AU.ctx.createOscillator(), g = AU.ctx.createGain(), v = AU.ctx.createOscillator(), vg = AU.ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = 440 * Math.pow(2, (n - 69) / 12); v.frequency.value = 5.5; vg.gain.value = 5; v.connect(vg); vg.connect(o.frequency); const f = AU.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.1); g.gain.setValueAtTime(0.06, t + d * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(f); f.connect(g); g.connect(AU.sfx); o.start(t); v.start(t); o.stop(t + d + 0.05); v.stop(t + d + 0.05); return t + d; }, t0 + 0.1);
}
const EGG_LIST = [
  { id: 'bull', name: '摸摸城中金牛', hint: '館前街的最北邊（星球北極）' }, { id: 'bear', name: '拍拍城中黑熊', hint: '館前街的最南邊（星球南極）' },
  { id: 'fortune', name: '找算命仙算一次', hint: '館前街南段的騎樓下' }, { id: 'busker', name: '聽阿伯拉二胡', hint: '館前街北段，靠近車站' }, { id: 'yulan', name: '買一串玉蘭花', hint: '城中路東邊的盡頭' },
];
function findEgg(id, label) {
  if (S.eggs[id]) return; S.eggs[id] = 1; sfx('done');
  const n = Object.keys(S.eggs).length + S.certs.length; toast(`發現彩蛋：${label}（${n}/${EGG_LIST.length + EGG_CERT_POS.length}）`); $('noteBadge').classList.remove('hide');
}
async function eggAct(id) {
  GAME.busy = true;
  try {
    if (id === 'bull') {
      await say(null, '（金色的公牛被摸得閃閃發亮，牛鼻子特別亮，大概大家都摸這裡。）');
      findEgg('bull', '城中金牛');
      if (S.bullSeason === S.season) { await say(null, '金牛閃了一下光……但今天沒有反應。（每一季只靈驗一次）'); return; }
      if (S.day >= DAYS) { await say(null, '金牛靜靜地看著你。這一季快結束了，下一季再來吧。'); return; }
      let d2 = S.day + 1; while (d2 < DAYS && Math.max(...SEASON.ret[d2]) <= 0) d2++;
      const nx = SEASON.ret[d2], i = nx.indexOf(Math.max(...nx)), st = STOCKS[i];
      S.bullSeason = S.season;
      S.rumors.push({ kind: 'tip', stock: st.id, dir: 1, text: `金牛顯靈：${st.name}第 ${d2} 天會漲`, resolve: d2, day: S.day, npc: 'bull', npcName: '城中金牛' }); $('noteBadge').classList.remove('hide');
      await say(null, `金牛的眼睛亮了一下，你腦中浮現一個名字：「${st.name}」。（記進消息本了，每季只有一次）`);
    } else {
      await say(null, '（黑熊坐在石台上，脖子掛著一塊小牌子。）');
      await say(null, '牌子上寫著：「漲多了會跌，跌深了會漲；停損，是留在市場裡的門票。」');
      findEgg('bear', '城中黑熊');
    }
  } finally { DLG.hide(); GAME.busy = false; }
}
const TALK = {
  ped: async n => { await say(n, PED_LINES[(n.idx * 7 + S.day * 3) % PED_LINES.length]); },
  fortune: async n => {
    await say(n, '來來來，鐵口直斷，看相、卜卦，一次 200 元。');
    const c = await choose(['算一次（200 元）', '我不信這個']);
    if (c === 1) { await say(n, '不信也好，命運掌握在自己手裡。'); return; }
    if (S.cash < 200) { await say(n, '少年仔，先去賺點錢再來吧。'); return; }
    S.cash -= 200; sfx('coin'); await say(n, '（搖了搖竹籤筒）嗯……' + LUCK[(S.day * 5 + S.season) % LUCK.length]); findEgg('fortune', '鐵口直斷算命仙');
  },
  busker: async n => {
    await say(n, '年輕人，要不要聽一段？不收錢的。');
    const c = await choose(['好啊，拉一段', '下次吧']);
    if (c === 1) return;
    erhu(); await say(n, '（悠揚的二胡聲在騎樓下迴盪，路過的人都放慢了腳步。）'); await say(n, '股市起起落落，日子還是要過，對吧？'); findEgg('busker', '騎樓下的二胡');
  },
  yulan: async n => {
    await say(n, '玉蘭花，一串 50 元，香香的，掛在身上保平安喔。');
    const c = await choose(['買一串（50 元）', '不用了，謝謝']);
    if (c === 1) { await say(n, '好、好，路上小心喔。'); return; }
    if (S.cash < 50) { await say(n, '沒關係啦，送你一朵聞聞看。'); } else { S.cash -= 50; sfx('coin'); await say(n, '來，香不香？今天一定順順利利。'); }
    findEgg('yulan', '玉蘭花阿嬤');
  },
  whale: n => TALK_NIGHT.whale(n), mama: n => TALK_NIGHT.mama(n),
  rumor: n => rumorTalk(n),
  crowd: async n => { await say(n, ['漲啊！漲啊！', '唉唷，又被套牢了……', '我只是來吹冷氣的啦。'][Math.random() * 3 | 0]); },
  broker: async n => {
    await say(n, PHASE() === 'open' ? '現在盤中，要下單嗎？' : '我們 9 點開盤、下午 1 點半收盤喔。');
    const c = await choose(['看盤、下單', '打聽一下消息', '沒事']);
    if (c === 0) { DLG.hide(); openTrade(true); } else if (c === 1) await rumorTalk(n, '我只是營業員，聽來的不一定準喔……');
  },
  kiosk: async n => {
    await say(n, '今天的報紙：「' + headline() + '」');
    await rumorTalk(n, '另外跟你講個小道消息……');
  },
  boss: async n => {
    const d = S.day, p = SEASON.pumps.find(p => p.day - d >= 1 && p.day - d <= 2 && S.talked['boss' + p.day] === undefined);
    if (p && S.talked.boss !== d) {
      S.talked.boss = d; S.talked['boss' + p.day] = d; const s = SBY[p.stock];
      await say(n, '少年仔，看你順眼。跟你講，我們這幾天要「照顧」一下' + s.name + '。');
      await say(n, '先拉三天，第四天開始我們就要出場了。要不要跟，你自己決定。');
      S.rumors.push({ kind: 'tip', stock: s.id, dir: 1, text: `阿財哥說要拉抬${s.name}三天，之後就出貨。`, resolve: p.day, day: d, npc: 'boss', npcName: n.name }); $('noteBadge').classList.remove('hide');
      toast('記進消息本了'); return;
    }
    await say(n, ['最近沒什麼好做的，喝茶喝茶。', '股市啊，就是有人買、有人賣，有人哭、有人笑。', '想跟我做？先把本錢養大再說。'][Math.random() * 3 | 0]);
  },
  temple: async n => {
    await say(n, '來求明牌喔？心誠則靈啦。');
    const c = await choose(['擲筊求明牌', '只是來拜拜']);
    if (c === 1) { await say(n, '平安就好，平安就好。'); return; }
    if (S.talked.monk === S.day) { await say(n, '一天問一次就好，神明也要休息。'); return; }
    S.talked.monk = S.day; sfx('tick');
    const r = Math.random(), s = STOCKS[r * STOCKS.length | 0], dir = Math.random() < 0.5 ? 1 : -1;
    await say(n, '（鏗——）聖筊！神明說：「' + s.name + (dir > 0 ? '，往上』' : '，往下』').replace('』', '」'));
    S.rumors.push({ kind: 'tip', stock: s.id, dir, text: `擲筊明牌：${s.name}${dir > 0 ? '會漲' : '會跌'}`, resolve: Math.min(DAYS, S.day + 1), day: S.day, npc: 'monk', npcName: '神明（擲筊）' }); $('noteBadge').classList.remove('hide');
    await say(n, '明牌給你了，信不信由你喔。');
  },
  ponzi: async n => {
    if (S.ponziGone) { await say(null, '（金滿堂的鐵門拉下來了，門口貼著封條，還有人在哭。）'); return; }
    await say(n, '來來來，金滿堂投資，月息四分！放一百萬，每個月領四萬，比銀行好幾十倍！');
    if (S.deposit > 0) await say(n, `你現在放了 ${wan(S.deposit)} 元，每五個交易日配一次息喔。`);
    const c = await choose(['存 50 萬', '存 100 萬', S.deposit > 0 ? '全部領出來' : '這麼好賺，錢從哪裡來？', '不用了']);
    if (c === 0 || c === 1) { const a = c === 0 ? 5e5 : 1e6; if (S.cash < a) { await say(n, '錢不夠啦，先去股市賺一點再來。'); return; } S.cash -= a; if (!S.deposit) S.depDay = S.day; S.deposit += a; sfx('coin'); await say(n, '聰明！放心，我們保證獲利！'); }
    else if (c === 2 && S.deposit > 0) { await say(n, '這麼快就要領？……好、好啦。'); S.cash += S.deposit; S.deposit = 0; sfx('coin'); }
    else if (c === 2) await say(n, '這個嘛……我們有很厲害的操盤團隊，你不用管那麼多啦！');
  },
  phone: async n => {
    if (S.phone) { await say(n, '大哥大用得還順手嗎？在哪裡都能打給營業員下單喔。'); return; }
    await say(n, '最新款大哥大，一支 6 萬！有了它，不用跑證券行，在哪裡都能下單。');
    const c = await choose(['買一支（6 萬）', '太貴了']);
    if (c === 0) { if (S.cash < PHONE_PRICE) { await say(n, '現金不夠喔。'); return; } S.cash -= PHONE_PRICE; S.phone = true; sfx('done'); await say(n, '恭喜！現在按 K（或「看盤」）在哪裡都能下單了。'); }
  },
  home: async n => {
    if (PHASE() === 'pre' || PHASE() === 'open') { await say(n, '還這麼早，去證券行看看吧。房租記得月底交喔。'); return; }
    await say(n, '回來啦？要不要早點休息？');
    const c = await choose(['回房間睡覺（跳到明天）', '再出去走走']);
    if (c === 0) { DLG.hide(); await endDay(); }
  },
};
function headline() {
  const d = S.day, e = SEASON.events.find(e => d >= e.day && d < e.day + e.def.dur);
  if (e) return e.def.head;
  const y = d > 1 ? SEASON.index[d - 1] / SEASON.index[d - 2] - 1 : 0;
  return d > 1 ? `昨日加權指數收 ${SEASON.index[d - 1].toFixed(0)} 點（${pct(y)}）；美股昨夜：${SEASON.usHead[d]}` : `新的一年開始；美股昨夜：${SEASON.usHead[d]}`;
}

/* ---------- 看盤下單 ---------- */
function canTradeHere() { return S.phone || angDist(PL.dir, PLACE_BY.broker.front) < 9; }
function openTrade(fromBroker) {
  if (GAME.busy && !fromBroker) return;
  if (!fromBroker && !canTradeHere()) { toast('要在證券行（城中證券）附近才能下單；買了大哥大就能隨時下單'); }
  GAME.busy = true; $('trade').classList.remove('hide'); renderTrade();
}
let trMode = 'cash', chSel = 'idx', chRange = 'season';
// 看盤畫面的走勢圖：大盤、個股或自己的資產；本季累積（日線）或今日分時
function chartSeries() {
  const p = prices(), i = STOCKS.findIndex(s => s.id === chSel), d0 = S.day - 1;
  const live = PHASE() === 'open' && MK.path, path = MK.path || GAME.dayPath;
  if (chRange === 'today') {
    if (!path || MK.k < 0 && !GAME.dayPath) return { pts: [], base: 0, empty: '9:00 開盤後才有今天的分時走勢' };
    const k = live ? MK.k : TICKS;
    if (chSel === 'me') return { pts: [], base: 0, empty: '資產走勢請看「本季累積」' };
    const pts = chSel === 'idx' ? GAME.idxTicks.slice(0, k + 1) : path[i].slice(0, k + 1);
    return { pts, base: chSel === 'idx' ? SEASON.index[d0] : SEASON.close[d0][i], labels: ['09:00', live ? fmtTime() : '13:30'], total: TICKS + 1 };
  }
  let pts;
  if (chSel === 'me') { pts = []; for (let d = 0; d < S.day; d++) pts.push((S.netHist || [])[d] ?? (d === 0 ? S.dayStartNet : pts[pts.length - 1])); pts.push(netWorth()); }
  else if (chSel === 'idx') { pts = SEASON.index.slice(0, S.day); pts.push(idxOf(p)); }
  else { pts = SEASON.close.slice(0, S.day).map(c => c[i]); pts.push(p[i]); }
  const cost = chSel !== 'idx' && chSel !== 'me' ? [S.hold[chSel], S.mar[chSel], S.sht[chSel]].filter(Boolean).map(h => h.cost)[0] : null;
  const evs = chSel === 'me' ? [] : SEASON.events.filter(e => e.day <= S.day).map(e => ({ x: e.day - 1, name: e.def.name }));
  return { pts, base: pts[0], labels: ['開季', `第 ${S.day} 天`], total: Math.max(pts.length, 11), cost, evs };
}
function chartSVG() {
  const c = chartSeries();
  if (c.empty || c.pts.length < 2) return `<div class="chEmpty">${c.empty || '還沒有足夠的資料，過一天再來看'}</div>`;
  const W = 600, H = 170, L = 8, R = 62, T = 12, B = 22, pts = c.pts;
  let lo = Math.min(...pts, c.base), hi = Math.max(...pts, c.base); if (c.cost) { lo = Math.min(lo, c.cost); hi = Math.max(hi, c.cost); }
  const pad = (hi - lo) * 0.08 || hi * 0.01; lo -= pad; hi += pad;
  const X = j => L + j / (c.total - 1) * (W - L - R), Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  const last = pts[pts.length - 1], ch = last / c.base - 1, col = ch > 0.00001 ? 'var(--up)' : ch < -0.00001 ? 'var(--down)' : '#6b5d4a';
  const line = pts.map((v, j) => `${X(j).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const fmt = v => chSel === 'me' ? wan(v) : v >= 1000 ? v.toFixed(0) : v.toFixed(v < 100 ? 2 : 1);
  let g = `<polygon points="${X(0)},${H - B} ${line} ${X(pts.length - 1).toFixed(1)},${H - B}" fill="${col}" opacity=".12"/>`;
  g += `<line x1="${L}" x2="${W - R}" y1="${Y(c.base).toFixed(1)}" y2="${Y(c.base).toFixed(1)}" stroke="#8a7a62" stroke-dasharray="4 4" stroke-width="1"/>`;
  // 右側數字標籤：最新價優先，其餘太近就往下推
  const yLast = Math.min(H - B, Math.max(T + 8, Y(last) + 4)), tags = [yLast];
  const tagY = v => { let y = Y(v) + 4; for (let n = 0; n < 4 && tags.some(t => Math.abs(t - y) < 12); n++) y += y > H / 2 ? -12 : 12; tags.push(y); return y; };
  g += `<text x="${W - R + 4}" y="${tagY(c.base)}" class="chT">${fmt(c.base)}</text>`;
  for (const e of c.evs || []) g += `<line x1="${X(e.x).toFixed(1)}" x2="${X(e.x).toFixed(1)}" y1="${T}" y2="${H - B}" stroke="#c8a02f" stroke-width="1" opacity=".7"><title>${e.name}</title></line><text x="${X(e.x) + 3}" y="${T + 9}" class="chE">${e.name}</text>`;
  if (c.cost) g += `<line x1="${L}" x2="${W - R}" y1="${Y(c.cost).toFixed(1)}" y2="${Y(c.cost).toFixed(1)}" stroke="#1f4f9a" stroke-dasharray="2 3" stroke-width="1.4"/><text x="${W - R + 4}" y="${tagY(c.cost)}" class="chT" fill="#1f4f9a">均價</text>`;
  g += `<polyline points="${line}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
  g += `<circle cx="${X(pts.length - 1).toFixed(1)}" cy="${Y(last).toFixed(1)}" r="4" fill="${col}"/>`;
  g += `<text x="${W - R + 4}" y="${yLast}" class="chT" fill="${col}" font-weight="700">${fmt(last)}</text>`;
  g += `<text x="${L}" y="${H - 6}" class="chT">${c.labels[0]}</text><text x="${X(pts.length - 1)}" y="${H - 6}" class="chT" text-anchor="${pts.length / c.total > 0.85 ? 'end' : 'middle'}">${c.labels[1]}</text>`;
  const name = chSel === 'idx' ? '城中加權指數' : chSel === 'me' ? '我的總資產' : SBY[chSel].name;
  return `<div class="chHead"><b>${name}</b> <span class="${cls(ch)}">${chRange === 'today' ? '今日' : '本季'} ${pct(ch)}</span></div><svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${name}走勢圖">${g}</svg>`;
}
function chartBox() {
  const opts = [['idx', '大盤'], ['me', '我的資產']].concat(STOCKS.map(s => [s.id, s.name])).map(([v, t]) => `<option value="${v}" ${chSel === v ? 'selected' : ''}>${t}</option>`).join('');
  return `<div class="chBox"><div class="chBar"><select id="chSel" aria-label="走勢圖要看哪一個">${opts}</select><span class="mtabs" style="margin:0"><button class="tab ${chRange === 'season' ? 'on' : ''}" data-cr="season">本季累積</button><button class="tab ${chRange === 'today' ? 'on' : ''}" data-cr="today">今日分時</button></span></div>${chartSVG()}</div>`;
}
function renderTrade() {
  if ($('trade').classList.contains('hide')) return;
  const p = prices(), pc = prevClose(), open = PHASE() === 'open', here = canTradeHere(), can = open && here;
  const hv = holdValue(p), mp = marginParts(p), nw = S.cash + hv + mp.eq + S.deposit, dpl = nw - S.dayStartNet;
  let h = `<div class="sum"><span>現金 <b>${money(S.cash)}</b></span><span>現股市值 <b>${money(hv)}</b></span>${mp.loan ? `<span>融資 市值 <b>${money(mp.mv)}</b>／借款 <b>${money(mp.loan)}</b></span>` : ''}${mp.sv ? `<span>融券 擔保 <b>${money(mp.coll)}</b>／市值 <b>${money(mp.sv)}</b></span>` : ''}${S.deposit ? `<span>金滿堂存款 <b>${money(S.deposit)}</b></span>` : ''}<span>總資產 <b>${money(nw)}</b></span><span>今日 <b class="${cls(dpl)}">${dpl >= 0 ? '+' : ''}${money(dpl)}</b></span></div>`;
  h += `<div style="font-size:13px;margin-bottom:4px">${isClosed(S.day) ? '<b>颱風假休市</b>　今天不能下單' : open ? (here ? '<b class="up">● 盤中</b>　點按鈕立即以成交價成交' : '盤中，但你不在證券行附近（或沒有大哥大），只能看盤') : '<b>○ 未開盤</b>　盤中（09:00–13:30）才能下單'}${GAME.paused ? '　<b>⏸ 時間暫停中</b>' : ''}</div>`;
  h += `<div class="sum" style="background:#e6edf5">${intlLine()}</div>`;
  h += chartBox();
  h += `<div class="mtabs"><button class="tab ${trMode === 'cash' ? 'on' : ''}" data-m="cash">現股</button><button class="tab ${trMode === 'mar' ? 'on' : ''}" data-m="mar">融資（借錢買）</button><button class="tab ${trMode === 'sht' ? 'on' : ''}" data-m="sht">融券（借股票賣）</button></div>`;
  const head = { cash: '<th>持有</th><th>均價</th><th>損益</th>', mar: '<th>融資</th><th>均價</th><th>損益</th><th>維持率</th>', sht: '<th>融券</th><th>均價</th><th>損益</th><th>維持率</th>' }[trMode];
  h += `<div class="tw"><table class="q"><tr><th>股票</th><th>成交</th><th>漲跌</th>${head}<th></th></tr>`;
  STOCKS.forEach((s, i) => {
    const ch = p[i] / pc[i] - 1, [up, dn] = limits(pc[i]);
    const lim = p[i] >= up ? '<span class="lim u">漲停</span>' : p[i] <= dn ? '<span class="lim d">跌停</span>' : '';
    let cells = '', q = 0, labels;
    if (trMode === 'cash') { const hd = S.hold[s.id]; q = hd ? hd.q : 0; const pl = hd ? (p[i] - hd.cost) * q * LOT : 0; cells = `<td>${q} 張</td><td>${hd ? hd.cost.toFixed(2) : '—'}</td><td class="${cls(pl)}">${hd ? (pl >= 0 ? '+' : '') + wan(pl) : '—'}</td>`; labels = ['買1', '買5', '賣1', '全賣']; }
    if (trMode === 'mar') { const m = S.mar[s.id]; q = m ? m.q : 0; const pl = m ? (p[i] - m.cost) * q * LOT : 0, r = m ? m.q * LOT * p[i] / m.loan : 0; cells = `<td>${q} 張</td><td>${m ? m.cost.toFixed(2) : '—'}</td><td class="${cls(pl)}">${m ? (pl >= 0 ? '+' : '') + wan(pl) : '—'}</td><td class="${m && r < 1.45 ? 'down' : ''}">${m ? Math.round(r * 100) + '%' : '—'}</td>`; labels = ['資買1', '資買5', '資賣1', '全賣']; }
    if (trMode === 'sht') { const t = S.sht[s.id]; q = t ? t.q : 0; const pl = t ? (t.cost - p[i]) * q * LOT : 0, r = t ? (t.margin + t.proceeds) / (t.q * LOT * p[i]) : 0; cells = `<td>${q} 張</td><td>${t ? t.cost.toFixed(2) : '—'}</td><td class="${cls(pl)}">${t ? (pl >= 0 ? '+' : '') + wan(pl) : '—'}</td><td class="${t && r < 1.45 ? 'down' : ''}">${t ? Math.round(r * 100) + '%' : '—'}</td>`; labels = ['券賣1', '券賣5', '回補1', '全補']; }
    h += `<tr class="${chSel === s.id ? 'chOn' : ''}"><td class="chPick" data-cs="${s.id}" title="看${s.name}的走勢">${s.name}<span class="sec">${s.sector}・${ST_NAME[s.st]}</span></td><td class="${cls(ch)}">${p[i].toFixed(p[i] < 100 ? 2 : 1)}${lim}</td><td class="${cls(ch)}">${pct(ch)}</td>${cells}
      <td><button class="qb buy" data-o="${s.id}" data-q="1" ${can ? '' : 'disabled'}>${labels[0]}</button><button class="qb buy" data-o="${s.id}" data-q="5" ${can ? '' : 'disabled'}>${labels[1]}</button><button class="qb sell" data-o="${s.id}" data-q="-1" ${can && q ? '' : 'disabled'}>${labels[2]}</button><button class="qb sell" data-o="${s.id}" data-q="-1000000" ${can && q ? '' : 'disabled'}>${labels[3]}</button></td></tr>`;
  });
  const note = {
    cash: '1 張＝1000 股。手續費 0.1425%，賣出另收證券交易稅 0.3%（依現行制度簡化）。漲停時買不到、跌停時賣不掉。',
    mar: '融資＝自備 4 成、向證券商借 6 成來買股票，每天要付利息（年息約 6.5%）。維持率＝股票市值 ÷ 借款，收盤時低於 130% 會被「斷頭」強制賣出。漲得多賺得多，跌的時候也賠得快。',
    sht: '融券＝先借股票來賣，等股價跌了再買回來（回補）賺差價。要先繳 9 成保證金，另收借券費 0.08%。維持率＝（保證金＋賣出價款）÷ 股票市值，收盤時低於 130% 會被強制回補。跌停時不能放空、漲停時回補不到。',
  }[trMode];
  const LL = limitOf(S.day);
  h += `</table></div><p class="note"><b>今日漲跌幅限制：漲 ${Math.round(LL.up * 1000) / 10}%／跌 ${Math.round(LL.dn * 1000) / 10}%${LL.ns ? '，暫停平盤以下融券放空' : ''}</b>。${note}公司與行情皆為虛構。</p>`;
  $('trBody').innerHTML = h;
  $('trTitle').textContent = `城中證券・看盤下單　第 ${S.day} 天 ${fmtTime()}`;
  $('trBody').querySelectorAll('[data-m]').forEach(b => b.onclick = () => { trMode = b.dataset.m; renderTrade(); });
  $('trBody').querySelectorAll('[data-cr]').forEach(b => b.onclick = () => { chRange = b.dataset.cr; renderTrade(); });
  $('trBody').querySelectorAll('[data-cs]').forEach(b => b.onclick = () => { chSel = b.dataset.cs; renderTrade(); });
  $('chSel').onchange = e => { chSel = e.target.value; renderTrade(); };
  $('trBody').querySelectorAll('[data-o]').forEach(b => b.onclick = () => order(b.dataset.o, +b.dataset.q, trMode));
}
function order(id, q, mode = 'cash') {
  if (PHASE() !== 'open' || !canTradeHere()) return;
  if (isClosed(S.day)) { toast('颱風假休市，今天不能下單'); return; }
  const i = STOCKS.findIndex(s => s.id === id), name = STOCKS[i].name, p = prices()[i], [up, dn] = limits(prevClose()[i]), unit = p * LOT;
  const tidy = () => { for (const k of ['hold', 'mar', 'sht']) for (const x in S[k]) if (!S[k][x].q) delete S[k][x]; };
  const fail = m => { tidy(); toast(m); sfx('bad'); };
  const fit = (q, per) => { if (q * per > S.cash) q = Math.floor(S.cash / per); return q; };
  if (mode === 'cash') {
    const hd = S.hold[id] || (S.hold[id] = { q: 0, cost: 0 });
    if (q > 0) {
      if (p >= up) return fail(`${name}漲停鎖住，掛了也買不到`);
      q = fit(q, unit * (1 + FEE)); if (q < 1) return fail('現金不夠');
      hd.cost = (hd.cost * hd.q + p * q) / (hd.q + q); hd.q += q; S.cash -= unit * q * (1 + FEE); toast(`買進 ${name} ${q} 張 @${p.toFixed(2)}`);
    } else {
      if (p <= dn) return fail(`${name}跌停鎖住，掛了也賣不掉`);
      q = Math.min(hd.q, -q); if (q < 1) return;
      S.cash += unit * q * (1 - FEE - TAX); hd.q -= q; toast(`賣出 ${name} ${q} 張 @${p.toFixed(2)}`);
    }
    if (!hd.q) delete S.hold[id];
  } else if (mode === 'mar') {
    const m = S.mar[id] || (S.mar[id] = { q: 0, cost: 0, loan: 0 });
    if (q > 0) {
      if (p >= up) return fail(`${name}漲停鎖住，掛了也買不到`);
      q = fit(q, unit * (1 - MARGIN_LOAN + FEE)); if (q < 1) return fail('自備款不夠（融資要自備 4 成）');
      m.cost = (m.cost * m.q + p * q) / (m.q + q); m.q += q; m.loan += unit * q * MARGIN_LOAN; S.cash -= unit * q * (1 - MARGIN_LOAN + FEE);
      toast(`融資買進 ${name} ${q} 張 @${p.toFixed(2)}，借款 ${wan(unit * q * MARGIN_LOAN)}`);
    } else {
      if (p <= dn) return fail(`${name}跌停鎖住，掛了也賣不掉`);
      q = Math.min(m.q, -q); if (q < 1) return;
      const repay = m.loan * q / m.q; S.cash += unit * q * (1 - FEE - TAX) - repay; m.loan -= repay; m.q -= q; toast(`融資賣出 ${name} ${q} 張 @${p.toFixed(2)}，還款 ${wan(repay)}`);
    }
    if (!m.q) delete S.mar[id];
  } else {
    const t = S.sht[id] || (S.sht[id] = { q: 0, cost: 0, margin: 0, proceeds: 0 });
    if (q > 0) {
      if (p <= dn) return fail(`${name}跌停了，不能再放空`);
      if (limitOf(S.day).ns && p <= prevClose()[i]) return fail('主管機關暫停平盤以下融券放空');
      q = fit(q, unit * SHORT_MARGIN); if (q < 1) return fail('保證金不夠（融券要繳 9 成保證金）');
      t.cost = (t.cost * t.q + p * q) / (t.q + q); t.q += q; t.margin += unit * q * SHORT_MARGIN; t.proceeds += unit * q * (1 - FEE - TAX - SHORT_FEE); S.cash -= unit * q * SHORT_MARGIN;
      toast(`融券賣出 ${name} ${q} 張 @${p.toFixed(2)}`);
    } else {
      if (p >= up) return fail(`${name}漲停鎖住，回補不到`);
      q = Math.min(t.q, -q); if (q < 1) return;
      const f = q / t.q, rel = (t.margin + t.proceeds) * f; S.cash += rel - unit * q * (1 + FEE); t.margin *= 1 - f; t.proceeds *= 1 - f; t.q -= q; toast(`融券回補 ${name} ${q} 張 @${p.toFixed(2)}`);
    }
    if (!t.q) delete S.sht[id];
  }
  S.tradeDay = S.day; if (mode !== 'cash') S.usedMargin = true;
  tidy(); sfx('coin'); renderTrade(); refreshHUD(); saveGame();
}
// 收盤：融資付利息、檢查維持率，低於 130% 斷頭
function settleMargin() {
  const p = SEASON.close[S.day], msgs = [];
  STOCKS.forEach((s, i) => {
    const m = S.mar[s.id];
    if (m) { S.cash -= m.loan * LOAN_DAY; const v = m.q * LOT * p[i]; if (v / m.loan < MAINT) { S.cash += v * (1 - FEE - TAX) - m.loan; delete S.mar[s.id]; msgs.push(`${s.name}融資維持率跌破 130%，被斷頭賣出`); } }
    const t = S.sht[s.id];
    if (t) { const v = t.q * LOT * p[i]; if ((t.margin + t.proceeds) / v < MAINT) { S.cash += t.margin + t.proceeds - v * (1 + FEE); delete S.sht[s.id]; msgs.push(`${s.name}融券維持率跌破 130%，被強制回補`); } }
  });
  return msgs;
}
function togglePause() {
  if (!GAME.started) return;
  GAME.paused = !GAME.paused; $('pauseTag').classList.toggle('hide', !GAME.paused); $('bPause').classList.toggle('on', GAME.paused);
  sfx('blip'); renderTrade();
}

/* ---------- 消息本 ---------- */
let noteTab = 'list';
function openNotes() {
  if (GAME.busy) return; GAME.busy = true; S.notesSeen = true; $('notes').classList.remove('hide'); $('noteBadge').classList.add('hide'); renderNotes();
}
function renderNotes() {
  const st = m => m.st === 'ok' ? '<span class="st ok">應驗</span>' : m.st === 'no' ? '<span class="st no">落空</span>' : '<span class="st wait">待驗證</span>';
  let h = `<div class="tabs" style="margin-bottom:10px"><button class="tab ${noteTab === 'list' ? 'on' : ''}" data-t="list">聽到的消息</button><button class="tab ${noteTab === 'src' ? 'on' : ''}" data-t="src">消息來源戰績</button><button class="tab ${noteTab === 'hist' ? 'on' : ''}" data-t="hist">歷史小百科</button><button class="tab ${noteTab === 'egg' ? 'on' : ''}" data-t="egg">彩蛋</button></div>`;
  if (noteTab === 'list') {
    if (!S.rumors.length) h += '<p>還沒有消息。去街上找人聊聊吧：證券行前的老張伯、報社記者、銀行襄理、茶藝館……每個人每天會講一則。</p>';
    for (const m of S.rumors.slice().reverse()) h += `<div class="rumor"><span class="d">第 ${m.day} 天<br>${m.npcName}</span><span>${m.text}${m.kind === 'tip' ? `<br><small style="color:var(--ink-soft)">驗證日：第 ${m.resolve} 天收盤</small>` : m.st === 'no' && !m.truth ? '<br><small style="color:var(--ink-soft)">這件事後來沒有發生</small>' : ''}</span>${st(m)}</div>`;
  } else if (noteTab === 'src') {
    const t = {}; for (const m of S.rumors) { const k = m.npcName; t[k] = t[k] || [0, 0]; if (m.st) { t[k][1]++; if (m.st === 'ok') t[k][0]++; } }
    h += '<table class="q"><tr><th>消息來源</th><th>應驗</th><th>已驗證</th><th>準確率</th></tr>';
    for (const k in t) h += `<tr><td>${k}</td><td>${t[k][0]}</td><td>${t[k][1]}</td><td>${t[k][1] ? Math.round(t[k][0] / t[k][1] * 100) + '%' : '—'}</td></tr>`;
    h += '</table><p class="note">每個人的消息準確度不一樣，而且不會告訴你。多聽幾次，看誰比較準，再決定要不要相信。</p>';
  } else if (noteTab === 'egg') {
    const tot = EGG_LIST.length + EGG_CERT_POS.length, n = Object.keys(S.eggs).length + S.certs.length;
    h += `<div class="sum">已發現 <b>${n}/${tot}</b> 個彩蛋</div>`;
    for (const e of EGG_LIST) h += `<div class="rumor" style="grid-template-columns:1fr auto"><span><b>${S.eggs[e.id] ? e.name : '？？？'}</b><br><small style="color:var(--ink-soft)">提示：${e.hint}</small></span>${S.eggs[e.id] ? '<span class="st ok">找到了</span>' : '<span class="st wait">還沒找到</span>'}</div>`;
    h += `<div class="rumor" style="grid-template-columns:1fr auto"><span><b>紙本股票憑證</b>（${S.certs.length}/${EGG_CERT_POS.length}）<br><small style="color:var(--ink-soft)">提示：車站旁、公園、廟埕、金牛附近、城中路東邊盡頭的騎樓下。集滿有獎勵。</small></span>${S.certs.length >= EGG_CERT_POS.length ? '<span class="st ok">集滿了</span>' : '<span class="st wait">收集中</span>'}</div>`;
    h += '<p class="note">路上的行人偶爾會透露彩蛋的線索。</p>';
  } else {
    if (!S.seen.length) h += '<p>遇到重大事件後，這裡會收錄它改編自哪一段真實歷史。</p>';
    for (const id of S.seen) { const e = EBY[id]; h += `<div class="rumor" style="grid-template-columns:1fr"><span><b>${e.name}</b><br>${e.ref}</span></div>`; }
    h += '<p class="note">事件經過改編與隨機排列，時間順序和幅度不等於真實歷史，正確史實請參考可靠的歷史資料。</p>';
  }
  $('ntBody').innerHTML = h;
  $('ntBody').querySelectorAll('.tab').forEach(b => b.onclick = () => { noteTab = b.dataset.t; renderNotes(); });
}
let helpTab = 'guide';
function openHelp() {
  if (GAME.busy) return; GAME.busy = true; $('help').classList.remove('hide');
  let h = `<div class="tabs" style="margin-bottom:10px"><button class="tab ${helpTab === 'guide' ? 'on' : ''}" data-h="guide">新手指南</button><button class="tab ${helpTab === 'set' ? 'on' : ''}" data-h="set">設定</button></div>`;
  if (helpTab === 'guide') h += `<div class="guide">
    <p style="margin-top:0">1980 年代末的台北，股市像坐雲霄飛車。你是剛到證券行跑單的<b>阿德</b>，帶著 ${wan(START_CASH)}，目標是成為<b>證券大亨</b>（總資產 ${wan(RANKS[RANKS.length - 1].min)}）。左上角的「任務提示」會告訴你下一步做什麼，點一下就會標出目的地。</p>
    <h4>1. 一天怎麼過</h4>
    <ul><li><b>06:00 早報</b>：看美股昨夜收盤和頭條，了解今天的氣氛。</li><li><b>06:00–09:00 盤前</b>：在街上找人聊天，每個人每天講一則消息；<b>08:00</b> 日本、韓國股市先開盤，可以先看國際盤方向。</li><li><b>09:00–13:30 盤中</b>：到城中證券找營業員小美下單（或按 K），比照現行台股交易時間。</li><li><b>13:30 收盤</b>：看賺賠、哪些消息應驗。下午繼續打聽明天的消息。</li><li><b>18:00–23:00 夜晚</b>：月見居酒屋開門，可以花點錢打探消息。23:00 一天結束，或提早回雅房找房東太太休息。</li></ul>
    <p>想慢慢想的時候，按 <b>P</b>（或右上 ⏸）暫停時間；暫停時還是可以走動、看盤、翻消息本。設定裡也可以把時間調慢。</p>
    <h4>2. 怎麼判斷消息</h4>
    <ul><li>每個人的準確度不一樣，而且不會告訴你。消息本的「消息來源戰績」會記下誰說中、誰落空。</li><li>大事件爆發前幾天，相關的人會先聽到風聲（例如記者、銀行襄理）。也有人會講根本不會發生的事。</li><li>阿財哥說要「照顧」某檔股票時，通常會先拉兩天、第三天開始倒貨。</li></ul>
    <h4>3. 現股、融資、融券</h4>
    <ul><li><b>現股</b>：用自己的錢買賣，1 張＝1000 股。</li><li><b>融資</b>：自備 4 成、借 6 成買股票，每天付利息。漲了賺得多，跌了賠得快。</li><li><b>融券</b>：繳 9 成保證金，先借股票來賣，跌了再買回來賺差價。</li><li>維持率收盤低於 130% 會被強制了結（斷頭）。漲停買不到、跌停賣不掉，跌停時也不能放空。</li></ul>
    <h4>4. 漲跌幅與政策突發事件</h4>
    <ul><li>一開始漲跌幅限制是 7%。每天都有小機率發生「制度改革」，從此放寬成 10%（改編自 2015 年）。</li><li>連續兩天大跌超過 11% 時，主管機關有機會出手：接下來 5 天跌幅縮小為 3.5%，並暫停平盤以下融券放空（改編自 2008 年金融海嘯）。</li><li>看盤畫面下方會寫今天的漲跌幅限制。</li></ul>
    <h4>5. 股票類型</h4>
    <ul><li><b>成長股</b>（電子、半導體、伺服器、生技）：波動大，景氣好、題材熱時漲得兇，升息時跌得重。</li><li><b>價值股</b>（金融、電信、食品、紡織資產股）：波動小，比較抗跌。</li><li><b>景氣循環股</b>（塑化、鋼鐵、航運、營建）：跟著景氣、油價和原物料起伏。</li></ul>
    <h4>6. 天氣與情緒</h4>
    <ul><li>晴天大家心情好，股價稍微偏多；下雨天證券行人少，成交量變小、股價稍微偏弱；遇到颱風會放颱風假、休市一天。影響都很小，大方向還是看消息和事件。</li><li>在設定裡可以改成「台北即時天氣」（要在 GitHub Pages 等一般網頁上才抓得到，Claude 的預覽頁面會擋外部連線）。</li></ul>
    <h4>7. 事件卡與歷史小百科</h4>
    <p>每一季會從真實歷史改編的事件裡抽 5 張，隨機排列，包括 1987 黑色星期一、1979–1981 聯準會暴力升息、1995–1996 台海飛彈危機、1997 亞洲金融風暴、2023–2024 AI 浪潮等。爆發時會出現「號外」，消息本的「歷史小百科」記錄它改編自哪一段歷史。地下投資公司每一季一定會倒，別把錢放太久。</p>
    <h4>8. 身分晉升</h4>
    <p><b>結局</b>：故事共 ${FINAL_SEASON} 季，第 ${FINAL_SEASON} 季結束（1990 年泡沫破裂）時，總資產 ${wan(WIN_NET)} 以上是成功結局、低於本金 ${wan(START_CASH)} 是失敗結局，中間是普通結局。中途當上證券大亨會提早迎來成功結局，總資產跌破 ${BROKE_NET / 1e4} 萬 則提早失敗。結局之後可以繼續自由遊玩。</p>
    <p>${RANKS.map(r => `${r.name}（${wan(r.min)}）`).join(' → ')}。大哥大一支 ${wan(PHONE_PRICE)}，買了以後在哪裡都能下單。</p>
    <h4>9. 操作</h4>
    <p>WASD／方向鍵移動、Shift 快跑、E 說話、K 看盤下單、N 消息本、P 暫停、T 快轉到下一個時段、M 城市地圖、H 指南、Q 暫存、O 存檔與讀檔、拖曳轉視角。遊戲不會自動存檔，記得隨手按 Q 留暫存點。手機用左下搖桿、右下「互動」「看盤」。</p>
    <p class="note">這是原型。公司、人物與行情都是虛構的；重大事件改編自 1980 年代末到 1990 年的台灣與國際股市歷史，經過隨機排列，僅供體驗與學習，不構成任何投資建議。</p></div>`;
  else h += `
    <p>時間速度：<button class="btn" data-sp="0.6">慢</button> <button class="btn" data-sp="1">標準</button> <button class="btn" data-sp="1.6">快</button>　目前：${S.speed === 0.6 ? '慢' : S.speed === 1.6 ? '快' : '標準'}</p>
    <p>天氣來源：<button class="btn" id="hpWx">${S.realWx ? '台北即時天氣（開）' : '遊戲模擬天氣'}</button></p>
    <p class="note" style="margin-top:-4px">即時天氣使用 Open-Meteo 的台北天氣，只會在盤前套用到「今天」。抓不到時自動改用模擬天氣。</p>
    <p><button class="btn" id="hpSnd">聲音：${S.music ? '音樂開' : '音樂關'}・${S.sfx ? '音效開' : '音效關'}</button> <button class="btn" id="hpReset">重新開始新的一年</button></p>
    <p class="note" style="margin-top:-4px">重新開始不會刪掉暫存點和存檔格。</p>`;
  $('hpBody').innerHTML = h;
  $('hpBody').querySelectorAll('[data-h]').forEach(b => b.onclick = () => { helpTab = b.dataset.h; openHelp2(); });
  const q = id => $('hpBody').querySelector('#' + id);
  if (q('hpSnd')) q('hpSnd').onclick = () => { cycleSound(); openHelp2(); };
  $('hpBody').querySelectorAll('[data-sp]').forEach(b => b.onclick = () => { S.speed = +b.dataset.sp; saveGame(); openHelp2(); });
  if (q('hpWx')) q('hpWx').onclick = async () => { S.realWx = !S.realWx; saveGame(); openHelp2(); if (S.realWx) await useRealWeather(true); };
  if (q('hpReset')) q('hpReset').onclick = function () { if (this.dataset.c) { closeModals(); startGame(false); } else { this.dataset.c = 1; this.textContent = '再按一次確定'; this.style.background = 'var(--accent)'; this.style.color = '#fff'; } };
}
function openHelp2() { GAME.busy = false; openHelp(); }

/* ---------- 天氣 ---------- */
function applyWeatherOverrides() { for (const d in S.wOver || {}) { if (+d <= DAYS) { SEASON.weather[d] = S.wOver[d].w; SEASON.temp[d] = S.wOver[d].t; } } rebuildSeason(); }
async function useRealWeather(manual) {
  if (PHASE() !== 'pre') { if (manual) toast('即時天氣會從明天盤前開始套用'); return; }
  const r = await fetchRealWeather();
  if (!r) { if (manual) toast('抓不到即時天氣（Claude 預覽頁面會擋外部連線），先用模擬天氣'); return; }
  S.wOver[S.day] = r; applyWeatherOverrides(); MK.prices = null; drawBoard(); toast(`台北即時天氣：${WEATHER[r.w].name} ${r.t}°C`); saveGame();
}
async function dayWeather() {
  if (S.realWx) await useRealWeather(false);
  const w = SEASON.weather[Math.min(S.day, DAYS)], tip = { rain: '下雨天證券行人少，成交量會變小', storm: '豪雨特報，市場氣氛偏悲觀', typhoon: '颱風來了，今天會放颱風假休市', sun: '晴天，大家心情不錯', cloud: '陰天' }[w];
  toast(`今天天氣：${WEATHER[w].name} ${SEASON.temp[Math.min(S.day, DAYS)]}°C・${tip}`);
}

/* ---------- 任務提示 ---------- */
const todayRumors = () => S.rumors.filter(m => m.day === S.day).length;
const GOALS = [
  { id: 'rumor', daily: true, text: () => `跟街坊打聽 3 則消息（${Math.min(3, todayRumors())}/3）`, done: () => todayRumors() >= 3, when: () => PHASE() !== 'night' },
  { id: 'trade', daily: true, text: () => isClosed(S.day) ? '今天颱風休市，好好休息' : PHASE() === 'pre' ? '9 點開盤後，到城中證券找營業員小美下單' : '到城中證券找營業員小美下單（或按 K）', done: () => S.tradeDay === S.day || isClosed(S.day), at: 'broker', when: () => PHASE() === 'pre' || PHASE() === 'open' },
  { id: 'notes', text: () => '按 N 打開消息本，看看誰的消息比較準', done: () => S.notesSeen, when: () => S.day >= 2 || PHASE() === 'post' },
  { id: 'night', daily: true, text: () => PHASE() === 'night' ? '去月見居酒屋打探消息' : '晚上 6 點後，去月見居酒屋打探消息', done: () => S.izDay === S.day, at: 'izakaya', when: () => PHASE() === 'post' || PHASE() === 'night' },
  { id: 'margin', text: () => '在看盤畫面試試「融資」或「融券」', done: () => S.usedMargin, at: 'broker', when: () => S.day >= 3 },
  { id: 'sleep', daily: true, text: () => '23:00 前回阿德的雅房休息（或等時間到）', done: () => false, at: 'home', when: () => PHASE() === 'night' && TIME.min > 21 * 60 },
  { id: 'rank', text: () => { const nx = RANKS[S.rank + 1]; return nx ? `目標：升級成「${nx.name}」（總資產 ${wan(nx.min)}）` : '你已經是證券大亨了！'; }, done: () => false },
];
let GUIDE = null, goalT = 0;
function goalKey(g) { return g.daily ? `${g.id}@${S.season}-${S.day}` : g.id; }
function updateGoals(dt) {
  goalT -= dt; if (goalT > 0) return; goalT = 0.4;
  const list = [];
  for (const g of GOALS) {
    if (g.when && !g.when()) continue;
    const k = goalKey(g);
    if (g.done()) { if (!S.goalSeen[k] && GAME.started) { S.goalSeen[k] = 1; if (g.id !== 'rank') { toast(`完成：${g.text().replace(/（.*?）/g, '')}`); sfx('done'); } } continue; }
    list.push(g); if (list.length >= 3) break;
  }
  if (GUIDE && !list.some(g => g.at === GUIDE)) GUIDE = null;
  const html = '<b>任務提示</b>' + list.map(g => { const pl = g.at && PLACE_BY[g.at]; const d = pl ? Math.round(angDist(PL.dir, pl.front) * 10) : 0; return `<button data-g="${g.at || ''}"><span class="dot"></span><span>${g.text()}${pl && d > 25 ? `<span class="go">${GUIDE === g.at ? '帶路中' : '帶路'} ${d} 公尺</span>` : ''}</span></button>`; }).join('');
  const el = $('goals'); if (el._h !== html) { el._h = html; el.innerHTML = html; el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const a = b.dataset.g; if (!a) return; GUIDE = GUIDE === a ? null : a; if (GUIDE) toast(`已標出目的地：${PLACE_BY[a].name}`); goalT = 0; }); }
}

/* ---------- 紙本股票憑證（彩蛋） ---------- */
const CERTS = [];
function buildCerts() {
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff1c8 }), seal = new THREE.MeshBasicMaterial({ color: 0xd7263d });
  EGG_CERT_POS.forEach((d, i) => {
    const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.03), mat); g.add(p);
    const sl = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), seal); sl.position.set(0.14, -0.08, 0.02); g.add(sl);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.4, 24), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.7, side: THREE.DoubleSide })); g.add(ring);
    scene.add(g); CERTS.push({ g, d, ring, i });
  });
}
function updateCerts(dt) {
  for (const c of CERTS) {
    const got = S.certs.includes(c.i); c.g.visible = !got && GAME.mode === 'ground' && angDist(PL.dir, c.d) < 30; if (!c.g.visible) continue;
    const up = c.d, f = tangentize(new V3(0, 0, 1).applyAxisAngle(up, GAME.t * 1.5), up); placeOn(c.g, up, f, 0.9 + Math.sin(GAME.t * 2 + c.i) * 0.12);
    c.ring.material.opacity = 0.45 + Math.sin(GAME.t * 4) * 0.3;
    if (!GAME.busy && angDist(PL.dir, c.d) < 1.2) {
      S.certs.push(c.i); sfx('done');
      const n = Object.keys(S.eggs).length + S.certs.length, tot = EGG_LIST.length + EGG_CERT_POS.length;
      if (S.certs.length >= EGG_CERT_POS.length) { S.cash += 100000; toast(`集滿 5 張紙本股票憑證！收藏家用 10 萬元收購了（${n}/${tot}）`); }
      else toast(`撿到一張泛黃的紙本股票憑證（${S.certs.length}/${EGG_CERT_POS.length}）・彩蛋 ${n}/${tot}`);
      $('noteBadge').classList.remove('hide');
    }
  }
}

/* ---------- 存檔與讀檔 ---------- */
const SLOT_KEYS = ['stock-tycoon-slot-1', 'stock-tycoon-slot-2', 'stock-tycoon-slot-3'];
let svConfirm = null;
function readSlot(k) { try { const j = JSON.parse(localStorage.getItem(k)); if (!j) return null; return j.s ? j : { s: j, at: null, sum: null }; } catch (e) { return null; } }
function snapshotWrap() {
  S.min = TIME.min; S.pos = PL.dir.toArray();
  return { v: 1, at: Date.now(), sum: { season: S.season, day: S.day, time: fmtTime(), net: Math.round(netWorth()), rank: RANKS[S.rank].name }, s: JSON.parse(JSON.stringify(S)) };
}
function slotText(x) {
  if (!x) return '（空的）';
  const m = x.sum || { season: x.s.season, day: x.s.day, time: '', net: null, rank: RANKS[x.s.rank || 0].name };
  const when = x.at ? new Date(x.at).toLocaleString('zh-TW', { hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  return `第 ${m.season} 季・第 ${m.day} 天 ${m.time}・${m.rank}${m.net != null ? `・總資產 ${wan(m.net)}` : ''}${when ? `<br>存於 ${when}` : ''}`;
}
function openSaves() {
  if (GAME.started && GAME.busy && $('saves').classList.contains('hide')) return;
  if (GAME.started) GAME.busy = true;
  $('saves').classList.remove('hide'); renderSaves();
}
function renderSaves(msg) {
  const ing = GAME.started;
  let ok = true; try { localStorage.setItem('stock-tycoon-test', '1'); localStorage.removeItem('stock-tycoon-test'); } catch (e) { ok = false; }
  let h = msg ? `<div class="sum">${msg}</div>` : '';
  if (!ok) h += '<div class="sum">這個瀏覽器不允許儲存資料（例如無痕模式）。可以用下方的「存檔碼」自己保存進度。</div>';
  h += `<p class="note" style="margin-top:0">遊戲不會自動存檔。隨時按 <b>Q</b>（或這裡的「暫存目前進度」）留一個暫存點，玩壞了可以回到那一刻；想長久保存就存到存檔格。存檔只在這台裝置的這個瀏覽器裡，換裝置請用下方的存檔碼。${ing ? '' : '目前在標題畫面，只能讀取。'}</p>`;
  const rows = [['quick', '暫存點', QUICK_KEY]].concat(SLOT_KEYS.map((k, i) => [String(i + 1), `存檔 ${i + 1}`, k]));
  for (const [id, name, key] of rows) {
    const x = ok ? readSlot(key) : null;
    const acts = [];
    if (ing) acts.push(`<button class="btn" data-save="${id}">${id === 'quick' ? '暫存目前進度' : svConfirm === id ? '再按一次覆蓋' : '存到這裡'}</button>`);
    if (x) acts.push(`<button class="btn pri" data-load="${id}">${id === 'quick' ? '回到暫存點' : '讀取'}</button>`);
    if (x) acts.push(`<button class="btn" data-del="${id}">${id === 'quick' ? '清除' : '刪除'}</button>`);
    h += `<div class="slot"><div><b>${name}</b><small>${slotText(x)}</small></div><div class="acts">${acts.join('')}</div></div>`;
  }
  h += `<h4 style="margin:16px 0 6px">存檔碼（換裝置、備份用）</h4>
    <textarea id="svCode" placeholder="${ing ? '按「產生存檔碼」，或貼上之前複製的存檔碼' : '貼上之前複製的存檔碼'}"></textarea>
    <p style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 0">${ing ? '<button class="btn" id="svExport">產生並複製存檔碼</button>' : ''}<button class="btn pri" id="svImport">讀取存檔碼</button></p>`;
  $('svBody').innerHTML = h;
  const keyOf = id => id === 'quick' ? QUICK_KEY : SLOT_KEYS[+id - 1];
  const nameOf = id => id === 'quick' ? '暫存點' : `存檔 ${id}`;
  $('svBody').querySelectorAll('[data-save]').forEach(b => b.onclick = () => {
    const id = b.dataset.save, k = keyOf(id);
    if (id !== 'quick' && readSlot(k) && svConfirm !== id) { svConfirm = id; return renderSaves(); }
    svConfirm = null;
    try { localStorage.setItem(k, JSON.stringify(snapshotWrap())); sfx('done'); renderSaves(`已存到「${nameOf(id)}」`); } catch (e) { renderSaves('存檔失敗：瀏覽器不允許儲存，請改用存檔碼'); }
  });
  $('svBody').querySelectorAll('[data-load]').forEach(b => b.onclick = () => { const x = readSlot(keyOf(b.dataset.load)); if (x) { $('saves').classList.add('hide'); startGame(true, x.s); } });
  $('svBody').querySelectorAll('[data-del]').forEach(b => b.onclick = () => { const id = b.dataset.del; if (svConfirm !== 'del' + id) { svConfirm = 'del' + id; b.textContent = '再按一次刪除'; return; } svConfirm = null; try { localStorage.removeItem(keyOf(id)); } catch (e) { } renderSaves(`已刪除「${nameOf(id)}」`); });
  const ex = $('svBody').querySelector('#svExport');
  if (ex) ex.onclick = () => {
    const code = 'ZQDH1:' + btoa(unescape(encodeURIComponent(JSON.stringify(snapshotWrap()))));
    const ta = $('svCode'); ta.value = code; ta.focus(); ta.select();
    (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => toast('存檔碼已複製，可以貼到記事本保存'), () => toast('已產生存檔碼，請手動全選複製'));
  };
  $('svBody').querySelector('#svImport').onclick = () => {
    const t = $('svCode').value.trim();
    try { if (!t.startsWith('ZQDH1:')) throw 0; const x = JSON.parse(decodeURIComponent(escape(atob(t.slice(6))))); if (!x.s || !x.s.seed) throw 0; $('saves').classList.add('hide'); startGame(true, x.s); }
    catch (e) { renderSaves('存檔碼看起來不完整，請確認整段都有貼上（開頭是 ZQDH1:）'); }
  };
}

function quickSave() {
  if (!GAME.started || GAME.busy) return;
  try { localStorage.setItem(QUICK_KEY, JSON.stringify(snapshotWrap())); sfx('done'); toast(`已暫存：第 ${S.season} 季・第 ${S.day} 天 ${fmtTime()}（按 O 可以回到這裡）`); }
  catch (e) { toast('這個瀏覽器不允許儲存，請在存檔畫面改用存檔碼'); }
}

/* ---------- 號外、收盤 ---------- */
function showExtra(e) {
  return new Promise(res => {
    GAME.busy = true;
    $('extra').innerHTML = `<div class="mast"><b>號外</b><span>城中日報・第 ${S.day} 個交易日</span></div><h2>${e.def.head}</h2><p>${e.def.body}</p><p class="ref">歷史小百科：${e.def.ref}</p><div class="row"><button class="btn pri" id="extOk">知道了</button></div>`;
    $('ext').classList.remove('hide'); sfx('extra');
    $('extOk').onclick = () => { $('ext').classList.add('hide'); GAME.busy = false; res(); };
  });
}
function showSummary() {
  return new Promise(res => {
    GAME.busy = true;
    const d = S.day, ic = SEASON.index[d], ip = SEASON.index[d - 1], ich = ic / ip - 1;
    const [ok, no] = resolveRumors(d);
    const nw = netWorth(), dpl = nw - S.dayStartNet;
    const moves = STOCKS.map((s, i) => [s, SEASON.ret[d][i]]).sort((a, b) => b[1] - a[1]);
    $('sumTitle').textContent = `第 ${d} 天收盤`;
    $('sumBody').innerHTML = `<canvas id="sumCv" width="700" height="160"></canvas>
      <div class="sum" style="margin-top:10px"><span>加權指數 <b class="${cls(ich)}">${ic.toFixed(2)}（${pct(ich)}）</b></span><span>成交量 <b>${volumeOf(d)} 億</b></span></div>
      <p style="margin:6px 0">你今天 <span class="bigpl ${cls(dpl)}">${dpl >= 0 ? '+' : ''}${money(dpl)}</span>　總資產 <b>${money(nw)}</b></p>
      <p style="margin:6px 0;font-size:14px">今日強勢：${moves.slice(0, 3).map(([s, x]) => `<b class="${cls(x)}">${s.name} ${pct(x)}</b>`).join('、')}</p>
      <p style="margin:6px 0;font-size:14px">今日弱勢：${moves.slice(-3).reverse().map(([s, x]) => `<b class="${cls(x)}">${s.name} ${pct(x)}</b>`).join('、')}</p>
      ${(GAME.marginMsgs || []).map(m => `<p style="margin:6px 0;font-size:14px" class="down">⚠ ${m}</p>`).join('')}
      ${ok + no ? `<p style="margin:6px 0;font-size:14px">今天驗證的消息：應驗 ${ok} 則、落空 ${no} 則（消息本裡看得到是誰說的）</p>` : ''}
      <p class="note">下午到晚上可以繼續打聽明天的消息。</p>
      <div style="display:flex;justify-content:flex-end"><button class="btn pri" id="sumOk">繼續</button></div>`;
    const cv = $('sumCv'), g = cv.getContext('2d'); g.fillStyle = '#15110d'; g.fillRect(0, 0, 700, 160);
    const tk = GAME.idxTicks.length > 2 ? GAME.idxTicks : [ip, ic];
    const lo = Math.min(ip, ...tk), hi = Math.max(ip, ...tk), Y = v => 140 - (v - lo) / Math.max(1e-6, hi - lo) * 110;
    g.strokeStyle = '#555'; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(10, Y(ip)); g.lineTo(690, Y(ip)); g.stroke(); g.setLineDash([]);
    g.strokeStyle = ich >= 0 ? '#ff5a6a' : '#3bd17f'; g.lineWidth = 3; g.beginPath(); tk.forEach((v, k) => { const x = 10 + k / (tk.length - 1) * 680; k ? g.lineTo(x, Y(v)) : g.moveTo(x, Y(v)); }); g.stroke();
    g.fillStyle = '#ffb000'; g.font = '22px VT323, monospace'; g.fillText('TAIEX  09:00 → 13:30', 14, 24);
    $('sum').classList.remove('hide'); sfx('bell');
    $('sumOk').onclick = () => { $('sum').classList.add('hide'); GAME.busy = false; res(); };
  });
}
function volumeOf(d) { if (isClosed(d)) return 0; const x = Math.abs(SEASON.index[d] / SEASON.index[d - 1] - 1); return Math.round((SEASON.thin[d] ? 60 : 380) * (1 + x * 18) * (SEASON.index[d] / 4500) * (WEATHER[SEASON.weather[d]].thin ? 0.7 : 1)); }

/* ---------- 一天的節奏 ---------- */
let lastPhase = null;
async function onPhase(ph) {
  if (ph === 'open') {
    if (isClosed(S.day)) { MK.path = null; toast('颱風來了，今天放颱風假，證券行休市'); return; }
    MK.path = genIntraday(S.day); MK.k = -1; GAME.idxTicks = []; sfx('bell'); toast('噹！開盤了，到證券行找小美下單');
    const e = SEASON.events.find(e => e.day === S.day);
    if (e) {
      if (!S.seen.includes(e.id)) S.seen.push(e.id);
      if (e.id === 'ponzi' && S.deposit > 0) { const lost = S.deposit; S.deposit = 0; S.ponziGone = true; await showExtra(e); toast(`你放在金滿堂的 ${wan(lost)} 元，全部拿不回來了……`); sfx('bad'); }
      else { if (e.id === 'ponzi') S.ponziGone = true; await showExtra(e); }
    }
    for (const pe of SEASON.policy.filter(x => x.day === S.day)) { if (!S.seen.includes(pe.id)) S.seen.push(pe.id); await showExtra({ def: EBY[pe.id] }); }
  }
  if (ph === 'post' && MK.path) {
    MK.prices = SEASON.close[S.day].slice(); GAME.dayPath = MK.path; MK.path = null; drawBoard();
    GAME.marginMsgs = settleMargin(); GAME.marginMsgs.forEach(m => toast(m)); if (GAME.marginMsgs.length) sfx('bad');
    if (S.deposit > 0 && (S.day - S.depDay) % 5 === 4 && !S.ponziGone) { const it = Math.round(S.deposit * 0.01); S.cash += it; toast(`金滿堂配息 ${money(it)} 元`); }
    await showSummary(); GAME.marginMsgs = []; checkRank(); saveGame();
  }
  if (ph === 'night') toast('天黑了，月見居酒屋開門了。23:00 前記得回雅房休息');
}
async function endDay() {
  if (GAME.ending) return; GAME.ending = true;
  if (MK.path) { MK.prices = SEASON.close[S.day].slice(); GAME.dayPath = MK.path; MK.path = null; await showSummary(); }
  S.netHist = S.netHist || []; if (S.netHist[S.day - 1] == null) S.netHist[S.day - 1] = Math.round(S.dayStartNet); S.netHist[S.day] = Math.round(netWorth());
  GAME.busy = true; const f = $('fade'); f.textContent = `第 ${S.day} 天結束`; f.style.opacity = 1; await wait(900);
  checkRank();
  if (!S.ended && netWorth() < BROKE_NET) await playEnding('broke');
  else if (!S.ended && S.rank === RANKS.length - 1) await playEnding('tycoon');
  S.day++; GAME.dayPath = null;
  if (S.day > DAYS) { if (!S.ended && S.season >= FINAL_SEASON) await playEnding(endingKind(netWorth())); await seasonEnd(); }
  if (S.day === 1) S.netHist = [];
  TIME.min = 6 * 60; lastPhase = 'pre'; MK.prices = null; S.dayStartNet = netWorth();
  f.textContent = `第 ${S.day} 個交易日`; await wait(700); f.style.opacity = 0; f.textContent = '';
  GAME.busy = false; GAME.ending = false; refreshHUD(); drawBoard(); saveGame(); await dayWeather(); await morningPaper();
}
async function seasonEnd() {
  const nw = netWorth();
  await new Promise(res => {
    $('sumTitle').textContent = '一季結束';
    $('sumBody').innerHTML = `<p style="font-size:16px;line-height:1.7">四十個交易日過去了。你從 ${wan(START_CASH)} 開始，現在總資產 <b class="${cls(nw - START_CASH)}">${money(nw)}</b>，身分是「<b>${RANKS[rankOf(nw)].name}</b>」。</p>
      <p style="line-height:1.7">同一季大盤 ${pct(SEASON.index[DAYS] / SEASON.index[0] - 1)}，你的資產 ${pct(nw / ((S.netHist || [])[0] || START_CASH) - 1)}。</p>
      <p style="line-height:1.7">這一季遇到的大事：${S.seen.map(id => EBY[id].name).join('、') || '（沒有）'}。到「消息本 → 歷史小百科」可以看它們改編自哪一段歷史。</p>
      <p style="line-height:1.7">新的一季會重新洗牌：事件的順序、時間、哪些人消息準，都會不一樣。${S.ended ? '' : S.season + 1 === FINAL_SEASON ? '<b>下一季是最後一季</b>，季末會依總資產迎來結局。' : `還有 ${FINAL_SEASON - S.season} 季迎來結局。`}</p>
      <div style="display:flex;justify-content:flex-end"><button class="btn pri" id="sumOk">開始新的一季</button></div>`;
    $('sum').classList.remove('hide'); $('sumOk').onclick = () => { $('sum').classList.add('hide'); res(); };
  });
  const log = (S.log || []).filter(l => l.s !== S.season).concat([seasonEntry()]);
  const keep = { cash: S.cash + holdValue(SEASON.close[DAYS]) + marginParts(SEASON.close[DAYS]).eq, speed: S.speed, phone: S.phone, seen: S.seen, music: S.music, sfx: S.sfx, season: S.season + 1, won: S.won, eggs: S.eggs, certs: S.certs, bullSeason: S.bullSeason, ended: S.ended, log, rank: S.rank };
  S = Object.assign(S0(), keep); S.dayStartNet = S.cash; genSeason(S.seed);
}
function checkRank() {
  const r = rankOf(netWorth());
  if (r > S.rank) { S.rank = r; sfx('done'); toast(`升級了！你現在是「<b>${RANKS[r].name}</b>」`); if (r === RANKS.length - 1 && !S.won) { S.won = true; setTimeout(() => toast('恭喜成為證券大亨！可以繼續玩，看看能走多遠'), 1500); } }
  if (netWorth() < BROKE_NET * 2 && netWorth() >= BROKE_NET) { toast(`錢快賠光了……總資產跌破 ${BROKE_NET / 1e4} 萬 就會提早結束`); }
  refreshHUD();
}
function skipPhase() {
  if (GAME.busy) return;
  const ph = PHASE(); const to = { pre: TIME.min < 480 ? 480 : 9 * 60, open: 13.5 * 60, post: 18 * 60, night: 23 * 60 }[ph];
  TIME.min = to + 0.01; sfx('blip');
}

/* ---------- 看板、跑馬燈、HUD ---------- */
function drawBoard() {
  if (!BOARD) return;
  const g = BOARD.g, W = 1024, H = 400, p = prices(), pc = prevClose();
  g.fillStyle = '#100c09'; g.fillRect(0, 0, W, H);
  const ix = idxOf(p), ich = ix / SEASON.index[S.day - 1] - 1;
  g.fillStyle = '#ffb000'; g.font = `900 36px ${SIGN_FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('加權指數', 24, 34);
  g.font = '58px VT323, monospace'; g.fillStyle = ich > 0 ? '#ff4d5e' : ich < 0 ? '#38d47f' : '#e8e0c8'; g.fillText(ix.toFixed(2) + '  ' + pct(ich), 210, 36);
  g.fillStyle = '#665a44'; g.fillRect(16, 64, W - 32, 3); g.fillRect(W / 2 - 2, 76, 3, H - 88);
  STOCKS.forEach((s, i) => {
    const col = i < 6 ? 0 : 1, row = i % 6, x0 = 20 + col * 506, y = 98 + row * 50, ch = p[i] / pc[i] - 1, c = ch > 0 ? '#ff4d5e' : ch < 0 ? '#38d47f' : '#e8e0c8';
    g.fillStyle = '#ffd27a'; g.font = `700 28px ${SIGN_FONT}`; g.textAlign = 'left'; g.fillText(s.name, x0, y);
    g.font = '40px VT323, monospace'; g.textAlign = 'right'; g.fillStyle = c; g.fillText(p[i].toFixed(p[i] < 100 ? 2 : 1), x0 + 292, y); g.fillText(pct(ch), x0 + 436, y);
    const [up, dn] = limits(pc[i]); if (p[i] >= up || p[i] <= dn) { g.fillStyle = c; g.fillRect(x0 + 442, y - 15, 50, 30); g.fillStyle = '#100c09'; g.font = `900 18px ${SIGN_FONT}`; g.textAlign = 'center'; g.fillText(p[i] >= up ? '漲停' : '跌停', x0 + 467, y + 1); }
  });
  BOARD.tex.needsUpdate = true;
  $('mqIn').innerHTML = STOCKS.map((s, i) => { const ch = p[i] / pc[i] - 1; return `<span style="color:${ch > 0 ? '#ff6b78' : ch < 0 ? '#4fe08f' : '#ffb000'}">${s.name} ${p[i].toFixed(p[i] < 100 ? 2 : 1)} ${pct(ch)}</span>`; }).join('') + `<span>加權 ${ix.toFixed(2)} ${pct(ich)}</span><span style="color:#9fc3ff">${intlLine(true)}</span>`;
}
function intlLine(plain) {
  const d = S.day, jk = TIME.min >= 480 || PHASE() !== 'pre';
  const t = `美股昨夜：道瓊 ${pct(SEASON.us[d])}、那斯達克 ${pct(SEASON.nas[d])}`, j = jk ? `日經 ${pct(SEASON.jp[d])}、韓股 ${pct(SEASON.kr[d])}` : '日韓 8:00 開盤';
  return plain ? `${t}　${j}` : `<span><b>國際盤</b>　${t}</span><span>${j}</span>`;
}
// 06:00 早報
function morningPaper() {
  return new Promise(res => {
    const key = `${S.season}-${S.day}`; if (GAME.mpDay === key || PHASE() !== 'pre') return res(); GAME.mpDay = key;
    const d = S.day, W = WEATHER[SEASON.weather[d]], ev = SEASON.events.find(e => d >= e.day && d < e.day + e.def.dur);
    GAME.busy = true;
    $('extra').innerHTML = `<div class="mast"><b>早報</b><span>城中日報・第 ${d} 個交易日・06:00</span></div>
      <h2>${SEASON.usHead[d]}</h2>
      <p><b>美股昨夜收盤</b>：道瓊 <span class="${cls(SEASON.us[d])}">${pct(SEASON.us[d])}</span>、那斯達克 <span class="${cls(SEASON.nas[d])}">${pct(SEASON.nas[d])}</span></p>
      <p><b>台股昨日</b>：${d > 1 ? `加權指數收 ${SEASON.index[d - 1].toFixed(0)} 點（<span class="${cls(SEASON.index[d - 1] / SEASON.index[d - 2] - 1)}">${pct(SEASON.index[d - 1] / SEASON.index[d - 2] - 1)}</span>）` : '新的一年第一個交易日'}</p>
      <p><b>今日天氣</b>：${W.name} ${SEASON.temp[d]}°C${W.closed ? '，颱風假休市' : ''}</p>
      ${ev ? `<p><b>焦點新聞</b>：${ev.def.head}</p>` : ''}
      <p class="ref">8:00 日本、韓國股市開盤，可以先看國際盤的方向；9:00 台股開盤，13:30 收盤。</p>
      <div class="row"><button class="btn pri" id="extOk">看完了</button></div>`;
    $('ext').classList.remove('hide'); sfx('tick');
    $('extOk').onclick = () => { $('ext').classList.add('hide'); GAME.busy = false; res(); };
  });
}
function setChip(id, html) { const el = $(id).lastElementChild; if (el.innerHTML !== html) { el.innerHTML = html; $(id).classList.remove('bump'); void $(id).offsetWidth; $(id).classList.add('bump'); } }
function refreshHUD() {
  const nw = netWorth(), dpl = nw - S.dayStartNet;
  setChip('chCash', wan(S.cash)); setChip('chNet', `${wan(nw)} <span class="${cls(dpl)}" style="font-size:11px">${dpl >= 0 ? '+' : ''}${(dpl / Math.max(1, S.dayStartNet) * 100).toFixed(1)}%</span>`); setChip('chDay', `${S.day}/${DAYS}`);
  $('rank').textContent = `${RANKS[S.rank].name}・第 ${S.season}${S.ended ? '' : '/' + FINAL_SEASON} 季`;
}
function updateTicker() {
  const p = prices(), ix = idxOf(p), ich = ix / SEASON.index[S.day - 1] - 1, ph = PHASE();
  $('tkIdx').textContent = ix.toFixed(2); $('tkChg').textContent = pct(ich); $('tkChg').style.color = ich > 0 ? '#ff6b78' : ich < 0 ? '#4fe08f' : '';
  $('tkPh').textContent = ({ pre: '盤前', open: isClosed(S.day) ? '休市' : '盤中', post: '收盤', night: '夜晚' })[ph] + ' ' + fmtTime() + (GAME.paused ? ' ⏸' : '');
  const wx = `${WEATHER[SEASON.weather[Math.min(S.day, DAYS)]].name} ${SEASON.temp[Math.min(S.day, DAYS)]}°C${S.wOver[S.day] ? '・即時' : ''}`; if ($('tkW').textContent !== wx) $('tkW').textContent = wx; $('tkPh').classList.toggle('open', ph === 'open');
}
let mqX = 0;
function updateMarquee(dt) { const el = $('mqIn'); mqX -= dt * 70; const w = el.scrollWidth; if (-mqX > w) mqX = innerWidth; el.style.transform = `translateX(${mqX}px)`; }

/* ---------- 標籤 ---------- */
const LBL = { pool: [], used: 0 }, _pv = new V3();
function lbl(text, cls2, x, y, onclick) {
  let el = LBL.pool[LBL.used]; if (!el) { el = document.createElement('div'); $('labels').appendChild(el); LBL.pool.push(el); } LBL.used++;
  if (el._t !== text) { el.textContent = text; el._t = text; } const c = 'lbl ' + cls2; if (el.className !== c) el.className = c;
  el.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`; el.style.display = ''; el.onclick = onclick || null;
}
let crowdSay = { t: 0, txt: '', n: null };
function updateLabels() {
  LBL.used = 0; const W = innerWidth, H = innerHeight;
  const proj = p => { _pv.copy(p).project(camera); if (_pv.z > 1 || _pv.z < -1) return null; return [(_pv.x + 1) / 2 * W, (1 - _pv.y) / 2 * H]; };
  if (GAME.mode === 'map' && CAM.blend > 0.8) {
    const cd = camera.position.clone().normalize();
    for (const p of PLACES) { if (p.front.dot(cd) < 0.2) continue; const s = proj(p.front.clone().multiplyScalar(R + 3)); if (s) lbl(p.name, 'map', s[0], s[1], () => { toggleMap(); }); }
    const me = proj(PL.dir.clone().multiplyScalar(R + 2)); if (me) lbl('你在這裡', 'me', me[0], me[1]);
  } else if (GAME.mode === 'ground') {
    const cf = new V3(); camera.getWorldDirection(cf);
    for (const n of NPCS) {
      if (!n.ch.root.visible || n.role === 'crowd') continue; const d = angDist(PL.dir, n.dir); if (d > 9) continue;
      const hp = n.dir.clone().multiplyScalar(R + (n.sit ? 1.7 : 2.05) * (n.ch.L.scale || 1)); _pv.copy(hp).sub(camera.position); if (_pv.dot(cf) < 0) continue;
      const p = proj(hp); if (!p) continue;
      const fresh = S.talked[n.id] !== S.day && !['home', 'phone', 'temple', 'ped', 'fortune', 'busker', 'yulan'].includes(n.role);
      lbl((fresh ? '● ' : '') + n.name, fresh ? 'q' : '', p[0], p[1]);
    }
    if (GUIDE && PLACE_BY[GUIDE]) { const pl = PLACE_BY[GUIDE], d = Math.round(angDist(PL.dir, pl.front) * 10), hp = pl.front.clone().multiplyScalar(R + 4.2); _pv.copy(hp).sub(camera.position); if (_pv.dot(cf) > 0) { const p = proj(hp); if (p) lbl(`▼ ${pl.name}・${d} 公尺`, 'goal', p[0], p[1]); } }
    for (const e of EGGS) { const ed = EGG_SPOTS[e.id]; if (!ed || angDist(PL.dir, ed) > 14) continue; const hp = ed.clone().multiplyScalar(R + 4.2); _pv.copy(hp).sub(camera.position); if (_pv.dot(cf) > 0) { const p = proj(hp); if (p) lbl(e.name, S.eggs[e.id] ? '' : 'q', p[0], p[1]); } }
    if (crowdSay.t > 0 && crowdSay.n && angDist(PL.dir, crowdSay.n.dir) < 16) { const p = proj(crowdSay.n.dir.clone().multiplyScalar(R + 2.3)); if (p) lbl(crowdSay.txt, 'q', p[0], p[1] - 22); }
  }
  for (let i = LBL.used; i < LBL.pool.length; i++) if (LBL.pool[i].style.display !== 'none') LBL.pool[i].style.display = 'none';
}

/* ---------- 人物更新 ---------- */
function updateNPCs(dt) {
  const ph = PHASE(), ix = idxOf(prices()), ich = ix / SEASON.index[S.day - 1] - 1;
  crowdSay.t -= dt;
  if (ph === 'open' && crowdSay.t < -4 && Math.random() < 0.02) { const crowd = NPCS.filter(n => n.sit && n.road === 'E'); crowdSay = { t: 3, n: crowd[Math.random() * crowd.length | 0], txt: ich > 0.03 ? '漲停啦！發了發了！' : ich > 0.005 ? '紅通通，好看！' : ich < -0.03 ? '跌停了……我的買菜錢！' : ich < -0.005 ? '唉唷，又綠了' : '怎麼都不動啦' }; if (ich > 0.01) crowdSay.n.ch.wave = 1.2; }
  for (const n of NPCS) {
    const d = angDist(PL.dir, n.dir), vis = GAME.mode !== 'title' && (GAME.mode === 'map' ? false : d < 36);
    n.ch.root.visible = vis; if (!vis) continue;
    if (n.role === 'ponzi') n.ch.root.visible = !S.ponziGone;
    if (n.night && ph !== 'night') n.ch.root.visible = false;
    if (n.day && ph === 'night') n.ch.root.visible = false;
    if (n.dry && WEATHER[SEASON.weather[Math.min(S.day, DAYS)]].thin) n.ch.root.visible = false;
    if (n.walk && ph === 'night' && n.idx % 2) n.ch.root.visible = false;
    if (!n.ch.root.visible) continue;
    let tgt = n.fwd0;
    if ((n.facing || d < 3) && !n.sit) { const t2 = tangentize(PL.dir.clone().sub(n.dir), n.dir); if (isFinite(t2.x)) tgt = t2; }
    n.fwd.lerp(tgt, 1 - Math.exp(-dt * 6)); tangentize(n.fwd, n.dir);
    if (n.walk) {
      const w = n.walk;
      if (!n.facing && d > 2.6 && !GAME.busy) {
        n.wd = n.wd || 1; n.s += n.wd * w.v * dt;
        const lo = Math.min(w.a, w.b), hi = Math.max(w.a, w.b); if (n.s > hi) { n.s = hi; n.wd = -1; } if (n.s < lo) { n.s = lo; n.wd = 1; }
        n.dir = slot(w.road, n.s, w.side, w.off).dir; n.fwd0 = tangentize(roadPoint(w.road, n.s + n.wd).sub(roadPoint(w.road, n.s)), n.dir); n.ch.speed = 0.3;
      } else n.ch.speed = 0;
    }
    placeChar(n.ch, n.dir, n.fwd, 0); n.ch.update(dt, GAME.t);
    const near = d < 11; if (n.lod !== near) { n.lod = near; n.ch.root.traverse(o => { if (o.material === OUTLINE_THIN) o.visible = near; }); }
  }
}

/* ---------- 光線 ---------- */
const CLR = { dayTop: new THREE.Color(0x7fb8d9), dayHor: new THREE.Color(0xf0e2c0), duskTop: new THREE.Color(0x6f6aa8), duskHor: new THREE.Color(0xffb27a), nTop: new THREE.Color(0x0e1530), nHor: new THREE.Color(0x3a2f4a) };
const _c1 = new THREE.Color(), _c2 = new THREE.Color(), _cw = new THREE.Color();
function updateLighting() {
  const h = TIME.min / 60, ang = Math.PI * (h - 5.8) / 13, el = Math.sin(ang);
  const day = GAME.mode === 'title' ? 1 : smooth(-0.1, 0.25, el), dusk = GAME.mode === 'title' ? 0 : Math.exp(-(((el - 0.06) / 0.15) ** 2));
  const mapLike = GAME.mode === 'map' || GAME.mode === 'title';
  const U = mapLike ? camera.position.clone().normalize() : PL.dir.clone();
  const E = tangentize(new V3(1, 0, 0).addScaledVector(new V3(0, 1, 0), 0.3), U), N = new V3().crossVectors(U, E);
  const sd = mapLike ? U.clone().multiplyScalar(0.8).addScaledVector(E, 0.4).addScaledVector(N, 0.4).normalize() : U.clone().multiplyScalar(Math.max(el, 0.25)).addScaledVector(E, Math.cos(ang)).addScaledVector(N, -0.3).normalize();
  const focus = mapLike ? new V3() : PL.dir.clone().multiplyScalar(R);
  sun.position.copy(focus).addScaledVector(sd, 60); sun.target.position.copy(focus);
  sun.intensity = mapLike ? 0.75 : lerp(0.18, 0.75, day); sun.color.setHex(dusk > 0.4 ? 0xffb37a : day > 0.3 ? 0xfff1d8 : 0x8fa4d8);
  hemi.position.copy(U); hemi.intensity = mapLike ? 0.55 : lerp(0.25, 0.5, day);
  _c1.copy(CLR.nTop).lerp(CLR.dayTop, day).lerp(CLR.duskTop, dusk * 0.6); _c2.copy(CLR.nHor).lerp(CLR.dayHor, day).lerp(CLR.duskHor, dusk * 0.7);
  const wf = mapLike || !SEASON ? 0 : ({ sun: 0, cloud: 0.35, rain: 0.6, storm: 0.8, typhoon: 0.9 })[SEASON.weather[Math.min(S.day, DAYS)]] || 0;
  if (wf) { _c1.lerp(_cw.setRGB(0.42, 0.45, 0.5).multiplyScalar(0.4 + day * 0.6), wf * 0.75); _c2.lerp(_cw.setRGB(0.6, 0.62, 0.65).multiplyScalar(0.4 + day * 0.6), wf * 0.6); sun.intensity *= 1 - wf * 0.6; }
  SKY_U.uTop.value.copy(_c1); SKY_U.uHor.value.copy(_c2); SKY_U.uUp.value.copy(mapLike ? camera.up : U); SKY_U.uSun.value.copy(sd); SKY_U.uStar.value = mapLike ? 0 : 1 - day; SKY_U.uSunC.value.setHex(day > 0.2 ? 0xfff2c8 : 0x6677aa);
  scene.fog.color.copy(_c2); scene.fog.near = mapLike ? 1e4 : 30 * (1 - wf * 0.4); scene.fog.far = mapLike ? 2e4 : 95 * (1 - wf * 0.4);
  FOGU.uFogC.value.copy(scene.fog.color); FOGU.uFogN.value = scene.fog.near; FOGU.uFogF.value = scene.fog.far;
  GLOW.color.setRGB(lerp(1.35, 0.45, day), lerp(1.12, 0.55, day), lerp(0.75, 0.62, day));
  SIGN_MAT.color.setScalar(lerp(1.25, 0.92, day));
}
