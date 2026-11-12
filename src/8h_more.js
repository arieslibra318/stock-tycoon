/* =========================================================
   more：難度、等級特權、消息戰績標示、空頭教學、對手阿昌、每月挑戰、街頭委託、結局稱號與最佳紀錄
   ========================================================= */
LIFE_KEEP.push('diff', 'rival', 'stat', 'srcHist', 'bearTut', 'bearDone', 'errN', 'chalN', 'recorded');
ACH.push(['chal', '使命必達', '一個月內完成三個挑戰'], ['rival', '新人王', '單月績效贏過阿昌'], ['errand', '好鄰居', '完成 5 件街頭委託']);

/* ---------- 難度 ---------- */
const DIFFS = {
  easy: { name: '輕鬆', rival: 0.003, note: '後半段的空頭比較溫和，大約一半的日子下跌，對手阿昌也比較弱。適合第一次玩。' },
  normal: { name: '標準', rival: 0.0045, note: '後半段行情偏空，大約六成的日子下跌，要學會放空或避險才守得住。' },
  hard: { name: '困難', rival: 0.006, note: '空頭更兇，準的人也沒那麼準，阿昌很強。給想挑戰的老手。' },
};
const diffOf = () => DIFFS[S.diff] ? S.diff : 'normal';

/* ---------- 等級特權：升級後交易成本變低 ---------- */
const PERKS = ['', '手續費 8 折', '手續費 6 折、融資利息減半、融券保證金降到 7 成', '手續費 5 折（融資利息減半、融券保證金 7 成）', '手續費 5 折（融資利息減半、融券保證金 7 成）'];
function applyPerks() {
  const r = S.rank || 0; FEE = FEE0 * [1, 0.8, 0.6, 0.5, 0.5][Math.min(4, r)]; LOAN_DAY = 0.065 / 250 * (r >= 2 ? 0.5 : 1); SHORT_MARGIN = r >= 2 ? 0.7 : 0.9;
  return PERKS[Math.min(4, r)] ? `<br>身分特權：${PERKS[Math.min(4, r)]}` : '';
}

/* ---------- 消息戰績：驗證滿 5 次就標出可信／普通／反指標，跨月累積 ---------- */
function srcStat(id) {
  const h = (S.srcHist || {})[id] || [0, 0]; let ok = h[0], n = h[1];
  for (const m of S.rumors) if (m.npc === id && m.st) { n++; if (m.st === 'ok') ok++; }
  return [ok, n];
}
const srcGrade = (ok, n) => n < 5 ? null : ok / n >= 0.65 ? 'good' : ok / n <= 0.35 ? 'bad' : 'mid';
const GRADE_NAME = { good: '可信', mid: '普通', bad: '反指標' }, GRADE_CLS = { good: 'ok', mid: 'wait', bad: 'no' };
function srcNote(id) { const [ok, n] = srcStat(id); return n ? `・這個人的戰績：${n} 次中 ${ok} 次` : ''; }
function srcTag(id) {
  if (!id) return ''; const [ok, n] = srcStat(id), g = srcGrade(ok, n); if (!n) return '';
  return g ? `<br><span class="st ${GRADE_CLS[g]}">${GRADE_NAME[g]} ${n}中${ok}</span>` : `<br>已驗證 ${n}/5`;
}
function srcMark(id) { const [ok, n] = srcStat(id), g = srcGrade(ok, n); return g === 'good' ? ' ◎' : g === 'bad' ? ' ✕' : ''; }
function srcTableHTML() {
  const names = {}; for (const id in S.srcHist || {}) names[id] = S.srcHist[id][2]; for (const m of S.rumors) if (m.npc) names[m.npc] = m.npcName;
  let h = '<table class="q"><tr><th>消息來源</th><th>應驗</th><th>已驗證</th><th>準確率</th><th>評價</th><th>交情</th></tr>';
  for (const id in names) {
    const [ok, n] = srcStat(id), g = srcGrade(ok, n), x = NPC_BY[id];
    h += `<tr><td>${names[id]}</td><td>${ok}</td><td>${n}</td><td>${n ? Math.round(ok / n * 100) + '%' : '—'}</td><td>${g ? `<span class="st ${GRADE_CLS[g]}">${GRADE_NAME[g]}</span>` : n ? `再 ${5 - n} 次` : '—'}</td><td>${x && x.rel ? ('♥'.repeat(hearts(id)) || '—') : '—'}</td></tr>`;
  }
  return h + '</table>' + (Object.keys(names).length ? '' : '<p>還沒有消息。</p>');
}
function foldSrcHist() {
  S.srcHist = S.srcHist || {};
  for (const m of S.rumors) { if (!m.npc || !m.st) continue; const h = S.srcHist[m.npc] || (S.srcHist[m.npc] = [0, 0, m.npcName]); h[1]++; if (m.st === 'ok') h[0]++; h[2] = m.npcName; }
}

/* ---------- 盤勢提示與空頭教學 ---------- */
const isLate = () => !!(S.total && S.season > S.total / 2);
function trendOf(d) { const n = Math.min(5, d - 1); let dn = 0; for (let k = d - 1; k > d - 1 - n; k--) if (SEASON.index[k] < SEASON.index[k - 1]) dn++; return [dn, n]; }
function trendNote(d) {
  const [dn, n] = trendOf(d); if (n < 4) return '';
  if (dn >= n - 1) return `<p><b>盤勢</b>：最近 ${n} 天有 ${dn} 天下跌，行情偏空。空頭時可以融券放空被看壞的股票，或把錢放到寶島銀行的定存、黃金避一避。</p>`;
  if (dn <= 1) return `<p><b>盤勢</b>：最近 ${n} 天有 ${n - dn} 天上漲，行情偏多，順著做比較輕鬆。</p>`;
  return '';
}
async function bearLesson() {
  if (S.bearTut || S.ended || (S.tut != null && S.tut < TUT.length)) return;
  const [dn, n] = trendOf(S.day); if (!isLate() && !(n >= 4 && dn >= 3 && SEASON.index[S.day - 1] / SEASON.index[Math.max(0, S.day - 5)] - 1 < -0.05)) return;
  S.bearTut = `${S.season}-${S.day}`; GAME.busy = true; const b = NPC_BY.broker;
  try {
    ring();
    await say(b, '（電話）阿德，我是小美。最近盤勢轉弱，跌的日子比漲的多，照以前「聽到明牌就買」的做法會很吃虧。');
    await say(b, '教你三招。第一招是「放空」：看盤畫面切到「融券」，對被看壞的股票按「券賣」，等它跌了再按「回補」，跌越多賺越多。');
    await say(b, '第二招是「避險」：寶島銀行可以買黃金、存定存，戰爭和股災的時候黃金常常會漲。第三招最簡單：沒把握就少買一點，抱著現金等。');
    await say(b, '消息本裡如果有人說某一檔「會跌」，而且他的戰績是「可信」，就是放空的好機會。反指標說會漲的，也可以反過來空。');
  } finally { DLG.hide(); GAME.busy = false; }
  toast('左上角多了一個「空頭練習」，完成有獎勵');
}
const bearGoalDone = () => Object.keys(S.sht).length > 0 || (S.gold || 0) > 0 || (S.fixed || 0) > 0;

/* ---------- 對手：同期入行的阿昌，每個月比誰的績效好 ---------- */
function rivalInit() {
  if (!S.rival) { const v = S.season > 1 || S.day > 1 ? Math.max(START_CASH, Math.round(netWorth() * 0.9)) : START_CASH; S.rival = { net: v, m0: v, w: 0, l: 0, s: S.season, d: 0, last: 0 }; }
  if (S.rival.s !== S.season) { S.rival.s = S.season; S.rival.d = 0; }
  return S.rival;
}
function rivalStep(d) {
  const V = rivalInit(); if (d <= V.d || d < 1 || d > DAYS) return V;
  for (let k = V.d + 1; k <= d; k++) {
    const idx = SEASON.index[k] / SEASON.index[k - 1] - 1, g = gauss(mulberry32((SEASON.seed * 17 + k * 911) >>> 0));
    V.last = isClosed(k) ? 0 : clamp(DIFFS[diffOf()].rival + (isLate() ? 0.25 : 0.8) * idx + g * 0.01, -0.06, 0.08); V.net = Math.round(V.net * (1 + V.last));
  }
  V.d = d; return V;
}
function rivalLine(d) {
  const V = rivalStep(d), gap = netWorth() - V.net;
  return `<p style="margin:6px 0;font-size:14px">同期的阿昌今天 <b class="${cls(V.last)}">${pct(V.last)}</b>，總資產 ${wan(V.net)}，你${gap >= 0 ? '領先' : '落後'}他 <b>${wan(Math.abs(gap))}</b>。</p>`;
}
// 當月績效：和月底結算用同一個基準（月初資產）
const myMonth = () => netWorth() / ((S.netHist || [])[0] || (S.ch && S.ch.m0) || START_CASH) - 1;
TALK.rival = async n => {
  const V = rivalInit(), mine = myMonth(), his = V.net / V.m0 - 1, lead = mine >= his;
  await say(n, S.talked.rivalHi ? (lead ? '又是你……這個月先讓你領先一下而已。' : '嘿嘿，這個月我又跑在你前面了。') : '喲，阿德！我是跟你同一天進城中證券的阿昌。我們來比賽，每個月看誰的績效好，贏的人可以拿公司的新人獎金 5 萬！');
  S.talked.rivalHi = 1; S.talked.rival = S.day;
  const c = await choose(['比一比成績', '你最近都買什麼？', '先走了']);
  if (c === 0) await say(n, `我現在總資產 ${wan(V.net)}，這個月 ${pct(his)}；你是 ${wan(netWorth())}，這個月 ${pct(mine)}。${lead ? '……好啦，算你厲害。' : '加油啊，別輸太多。'}目前戰績你 ${V.w} 勝 ${V.l} 敗。`);
  else if (c === 1) {
    const d = Math.min(DAYS, Math.max(1, PHASE() === 'pre' || PHASE() === 'open' ? S.day - 1 : S.day)), secs = {};
    STOCKS.forEach((s, i) => { if (listed(i, d)) (secs[s.sector] = secs[s.sector] || []).push(SEASON.ret[d][i]); });
    const top = Object.entries(secs).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]).sort((a, b) => b[1] - a[1])[0];
    await say(n, d < 1 || !top || S.day === 1 && PHASE() === 'pre' ? '才剛開始，我還在觀察啦。' : `${PHASE() === 'pre' || PHASE() === 'open' ? '昨天' : '今天'}最強的是${top[0]}族群，我當然有跟到。${isLate() ? '不過最近盤不好，我都改做放空了。' : '多頭的時候，膽子大一點就對了。'}`);
  }
};

/* ---------- 每月挑戰：每個月抽 3 個，完成一個 2 萬，三個全完成再加 5 萬 ---------- */
const CHAL_PAY = 2e4, CHAL_ALL = 5e4;
const CHALS = {
  short: { t: '放空獲利一次（融券回補時有賺）', p: c => c.shortWin || 0, n: 1 },
  wins: { t: '賣出獲利 5 次', p: c => c.wins || 0, n: 5 },
  big: { t: '單日獲利達到月初資產的 5%', p: c => c.big || 0, n: 1 },
  hold: { t: '同一檔股票抱滿 5 個交易日', p: c => c.hold || 0, n: 5 },
  streak: { t: '連續 3 天獲利', p: c => c.best || 0, n: 3 },
  spread: { t: '收盤時同時持有 3 個不同族群的股票', p: c => c.spread || 0, n: 3 },
  haven: { t: '收盤時在寶島銀行有定存或黃金', p: c => c.haven || 0, n: 1 },
  heard: { t: '這個月打聽 30 則消息', p: () => S.rumors.length, n: 30 },
  hit: { t: '聽到的消息應驗 10 則', p: () => S.rumors.filter(m => m.st === 'ok').length, n: 10 },
  bond: { t: '和 3 個人的交情到 ♥♥ 以上', p: () => NPCS.filter(n => n.rel && hearts(n.id) >= 2).length, n: 3 },
  walk: { t: '一天走滿 6,000 步', p: c => Math.max(c.walk || 0, Math.floor(S.stepsDay || 0)), n: 6000 },
  beat: { t: '月底績效贏過大盤', p: c => c.beat || 0, n: 1, end: true },
};
function chalInit() {
  if (S.ch && S.ch.s === S.season) return S.ch;
  const r = mulberry32((S.seed ^ 0x51ed270b) >>> 0), pool = Object.keys(CHALS).filter(k => k !== 'short');
  for (let i = pool.length - 1; i > 0; i--) { const j = r() * (i + 1) | 0;[pool[i], pool[j]] = [pool[j], pool[i]]; }
  // 行情偏空的月份一定有「放空獲利」，其他月份有三成機會
  const ids = isLate() || r() < 0.3 ? ['short'].concat(pool.slice(0, 2)) : pool.slice(0, 3);
  return S.ch = { s: S.season, ids, done: {}, c: {}, m0: Math.round(S.day === 1 ? S.dayStartNet : netWorth()), all: false };
}
function chalCheck(atEnd) {
  if (!GAME.started) return; const C = chalInit();
  for (const id of C.ids) {
    const def = CHALS[id]; if (C.done[id] || (def.end && !atEnd) || def.p(C.c) < def.n) continue;
    C.done[id] = 1; S.cash += CHAL_PAY; S.chalN = (S.chalN || 0) + 1; sfx('done'); toast(`<b>挑戰完成</b>：${def.t}・獎金 ${wan(CHAL_PAY)}`);
  }
  if (!C.all && C.ids.every(id => C.done[id])) { C.all = true; S.cash += CHAL_ALL; achieve('chal'); toast(`本月三個挑戰全部完成！城中證券加碼 ${wan(CHAL_ALL)}`); }
}
function chalDay(d, dpl) {
  const C = chalInit(), c = C.c;
  if (dpl >= C.m0 * 0.05) c.big = 1;
  c.streak = dpl > 0 ? (c.streak || 0) + 1 : 0; c.best = Math.max(c.best || 0, c.streak);
  const secs = new Set(), st = S.stat = S.stat || {};
  for (const k of ['hold', 'mar', 'sht']) for (const id in S[k]) { const rec = S[k][id]; if (k !== 'sht') secs.add(SBY[id].sector); if (rec.since != null) { const held = d - rec.since + 1; c.hold = Math.max(c.hold || 0, held); st.maxHold = Math.max(st.maxHold || 0, held); } }
  c.spread = Math.max(c.spread || 0, secs.size); if ((S.fixed || 0) > 0 || (S.gold || 0) > 0) c.haven = 1;
  c.walk = Math.max(c.walk || 0, Math.floor(S.stepsDay || 0));
  chalCheck();
}
const _dayChecks = dayChecks; dayChecks = function (d, dpl) { _dayChecks(d, dpl); chalDay(d, dpl); };
function chalGoalText() {
  const C = chalInit(), left = C.ids.filter(id => !C.done[id]); if (!left.length) return '';
  const def = CHALS[left[0]], p = Math.min(def.n, def.p(C.c));
  return `本月挑戰（已完成 ${C.ids.length - left.length}/3）：${def.t}${def.n > 1 ? `（${p.toLocaleString('zh-TW')}/${def.n.toLocaleString('zh-TW')}）` : ''}`;
}
function chalHTML() {
  const C = chalInit(), V = rivalInit(), mine = myMonth(), his = V.net / V.m0 - 1, e = errandToday(), est = errandState();
  let h = `<div class="sum"><span>本月挑戰 <b>${C.ids.filter(id => C.done[id]).length}/3</b></span><span>每完成一個 <b>${wan(CHAL_PAY)}</b></span><span>三個全完成再加 <b>${wan(CHAL_ALL)}</b></span></div>`;
  for (const id of C.ids) { const def = CHALS[id], p = Math.min(def.n, def.p(C.c)); h += `<div class="rumor" style="grid-template-columns:1fr auto"><span><b>${def.t}</b>${def.n > 1 ? `<br><small style="color:var(--ink-soft)">進度 ${p.toLocaleString('zh-TW')}/${def.n.toLocaleString('zh-TW')}</small>` : def.end ? '<br><small style="color:var(--ink-soft)">月底結算</small>' : ''}</span>${C.done[id] ? '<span class="st ok">完成</span>' : '<span class="st wait">進行中</span>'}</div>`; }
  h += `<h4 style="margin:16px 0 6px">對手：同期的阿昌</h4><div class="sum"><span>阿昌總資產 <b>${wan(V.net)}</b></span><span>他這個月 <b class="${cls(his)}">${pct(his)}</b></span><span>你這個月 <b class="${cls(mine)}">${pct(mine)}</b></span><span>戰績 <b>${V.w} 勝 ${V.l} 敗</b></span></div>
    <p class="note">每個月底比當月績效，贏了可以拿城中證券的新人獎金 5 萬。阿昌白天站在證券行對面的騎樓下，可以去找他聊聊。</p>`;
  h += `<h4 style="margin:16px 0 6px">街頭委託</h4><p style="font-size:14px;margin:4px 0">${!e ? '今天沒有人需要幫忙。' : est === 0 ? `今天${NPC_BY[e.from].name}好像有事想拜託你（頭上有「！」）。` : est === 1 ? `進行中：把${e.item}送給${NPC_BY[e.to].name}（${nearPlace(NPC_BY[e.to]).name}附近）。` : est === 2 ? '今天的委託已經完成。' : '今天的委託你沒有接。'}　累積完成 <b>${S.errN || 0}</b> 件。</p>
    <p class="note">幫忙跑腿可以大幅增加交情，對方還會回送一則很可靠的消息。</p>`;
  h += `<h4 style="margin:16px 0 6px">身分特權</h4><p style="font-size:14px;margin:4px 0">${RANKS.slice(1, 4).map((r, i) => `<b>${r.name}</b>：${PERKS[i + 1]}`).join('<br>')}</p><p class="note">目前手續費 ${+(FEE * 100).toFixed(4)}%。</p>`;
  return h;
}

/* ---------- 街頭委託：幫忙跑腿，換交情和一則可靠的消息 ---------- */
const ERR_ITEMS = [['便當', '幫我把這個便當拿給{to}好嗎？他忙到沒時間吃飯。'], ['會錢', '這包會錢幫我交給{to}，我走不開。'], ['報紙', '{to}託我留的報紙，可以幫我拿過去嗎？'], ['藥包', '{to}的藥忘在我這裡，可以幫我送去嗎？'], ['名片', '這張名片幫我轉交給{to}，就說是我介紹的。'], ['水果', '親戚送的水果太多了，幫我分一袋給{to}。']];
const ERR_FROM = ['oldhand', 'aunt1', 'aunt2', 'kiosk', 'reporter', 'banker', 'engineer', 'shipping', 'builder', 'vendor', 'taxi', 'shoe', 'chess'];
const ERR_TO = ['oldhand', 'kiosk', 'reporter', 'banker', 'engineer', 'shipping', 'builder', 'taxi', 'shoe', 'monk', 'landlady', 'phone', 'chess'];
let ERR_CACHE = { key: '', e: null };
const errKey = () => `${S.season}-${S.day}`;
function errandToday() {
  const key = S.seed + ':' + errKey(); if (ERR_CACHE.key === key) return ERR_CACHE.e;
  let e = null; const r = mulberry32((S.seed * 53 + S.day * 7919) >>> 0);
  if (S.day >= 2 && S.day < DAYS && !(S.tut != null && S.tut < TUT.length) && r() < 0.55) {
    const from = pickR(r, ERR_FROM), tos = ERR_TO.filter(id => id !== from && angDist(NPC_BY[id].dir, NPC_BY[from].dir) > 8), it = pickR(r, ERR_ITEMS);
    if (tos.length) e = { from, to: pickR(r, tos), item: it[0], ask: it[1] };
  }
  ERR_CACHE = { key, e }; return e;
}
const errandState = () => S.err && S.err.key === errKey() ? S.err.st : 0;
function nearPlace(n) { let best = PLACES[0], bd = 9; for (const p of PLACES) { const d = angDist(p.front, n.dir); if (d < bd) { bd = d; best = p; } } return best; }
function npcMark(n) {
  if (!GAME.started) return ''; const e = errandToday(); if (!e) return ''; const st = errandState();
  return st === 0 && n.id === e.from && PHASE() !== 'night' ? '！ ' : st === 1 && n.id === e.to ? '★ ' : '';
}
async function moreHook(n) {
  const e = errandToday(); if (!e) return false; const st = errandState();
  if (st === 0 && n.id === e.from && PHASE() !== 'night') {
    const to = NPC_BY[e.to];
    await say(n, '阿德，你來得正好！' + e.ask.replace('{to}', to.name));
    const c = await choose(['好，我幫你送', '現在不方便']);
    S.err = { key: errKey(), st: c === 0 ? 1 : -1 };
    if (c === 0) { await say(n, `太感謝了！${to.name}在${nearPlace(to).name}附近，今天之內送到就好。`); toast(`接下委託：把${e.item}送給${to.name}（頭上有「★」）`); sfx('tick'); }
    else await say(n, '沒關係，我再找別人。');
    return false;
  }
  if (st === 1 && n.id === e.to) {
    const from = NPC_BY[e.from]; S.err.st = 2; S.errN = (S.errN || 0) + 1; if (S.errN >= 5) achieve('errand');
    await say(n, `啊，是${from.name}託你拿來的${e.item}？謝謝你特地跑這一趟！`);
    bondUp(from, 2); if (n.rel) bondUp(n, 1); sfx('done');
    const d2 = S.day + 1, nx = d2 <= DAYS && !isClosed(d2) ? SEASON.ret[d2] : null; let i = -1;
    if (nx) nx.forEach((x, k) => { if (listed(k, d2) && Math.abs(x) > 0.02 && (i < 0 || Math.abs(x) > Math.abs(nx[i]))) i = k; });
    if (i >= 0) {
      const s = STOCKS[i], dir = nx[i] > 0 ? 1 : -1, text = `${s.name}明天會${dir > 0 ? '漲' : '跌，可以放空'}，這個消息很可靠。`;
      S.rumors.push({ kind: 'tip', stock: s.id, dir, text: `${from.name}的謝禮：${text}`, resolve: d2, day: S.day, npc: 'errand', npcName: '委託的謝禮' }); dexSeen(s.id); $('noteBadge').classList.remove('hide');
      await say(n, `對了，${from.name}要我轉告你：「${text}」`); toast('委託完成！謝禮記進消息本了');
    } else { S.cash += 5000; await say(n, `${from.name}還託我拿 5,000 元的走路工給你，收下吧。`); toast('委託完成！拿到走路工 5,000 元'); }
    return false;
  }
  return false;
}

/* ---------- 掛進原本的流程 ---------- */
function moreOnOrder(id, mode, buy, win) {
  const st = S.stat = S.stat || {}, c = chalInit().c; st.tr = (st.tr || 0) + 1;
  if (buy) { st.buy = (st.buy || 0) + 1; if (mode === 'mar') st.mar = (st.mar || 0) + 1; if (mode === 'sht') st.sht = (st.sht || 0) + 1; const rec = S[mode === 'cash' ? 'hold' : mode][id]; if (rec && rec.since == null) rec.since = S.day; }
  else if (win === true) { st.win = (st.win || 0) + 1; c.wins = (c.wins || 0) + 1; if (mode === 'sht') { st.shortWin = (st.shortWin || 0) + 1; c.shortWin = 1; } }
  else if (win === false) st.lose = (st.lose || 0) + 1;
  chalCheck();
}
function moreDayEnd() {
  rivalStep(Math.min(S.day, DAYS)); const st = S.stat = S.stat || {}; st.days = (st.days || 0) + 1; st.heard = (st.heard || 0) + S.rumors.filter(m => m.day === S.day).length;
  const c = chalInit().c; c.walk = Math.max(c.walk || 0, Math.floor(S.stepsDay || 0)); chalCheck();
}
async function morningExtras() {
  chalInit(); rivalInit();
  if (S.day === 1 && !S.ended) { const C = S.ch; toast(`本月挑戰：${C.ids.map(id => CHALS[id].t.replace(/（.*?）/g, '')).join('、')}`); }
  await bearLesson();
}
function moreSeasonEnd() {
  const msgs = [], C = chalInit(), V = rivalStep(DAYS), mine = myMonth();
  if (SEASON.index[DAYS] && mine > SEASON.index[DAYS] / SEASON.index[0] - 1) C.c.beat = 1;
  const before = S.cash; chalCheck(true); const n = C.ids.filter(id => C.done[id]).length;
  msgs.push(`本月挑戰完成 ${n}/3${S.cash > before ? `，月底結算再拿到 ${wan(S.cash - before)}` : ''}。`);
  const his = V.net / V.m0 - 1;
  if (mine > his) { V.w++; S.cash += 5e4; achieve('rival'); msgs.push(`同期的阿昌這個月 ${pct(his)}，你 ${pct(mine)}——<b>你贏了！</b>城中證券頒給你新人獎金 5 萬。阿昌：「可惡，下個月再比！」`); }
  else { V.l++; msgs.push(`同期的阿昌這個月 ${pct(his)}，你 ${pct(mine)}——這個月輸給他了。阿昌：「嘿嘿，新人獎金我就不客氣收下囉。」`); }
  V.m0 = V.net; foldSrcHist();
  return msgs;
}
GOALS.splice(1, 0,
  { id: 'errand', daily: true, text: () => { const e = errandToday(); return e ? `委託：把${e.item}送給${NPC_BY[e.to].name}（頭上有「★」）` : ''; }, done: () => errandState() === 2, when: () => errandState() === 1 || errandState() === 2, get at() { const e = errandToday(); return e && errandState() === 1 ? nearPlace(NPC_BY[e.to]).id : undefined; } },
  { id: 'bear', text: () => '空頭練習：用融券放空一檔股票，或到寶島銀行買黃金、存定存', done: () => { if (!bearGoalDone()) return false; S.bearDone = 1; S.cash += 1e4; setTimeout(() => toast('小美幫你申請了避險練習獎勵 1 萬元'), 900); return true; }, when: () => !!S.bearTut && !S.bearDone },
  { id: 'chal', daily: true, text: chalGoalText, done: () => { chalCheck(); return false; }, when: () => GAME.started && !!chalGoalText() });

/* ---------- 結局：投資風格稱號、歷次最佳紀錄 ---------- */
function styleOf() {
  const t = S.stat || {}, days = Math.max(1, t.days || 1), per = (t.tr || 0) / days, wl = (t.win || 0) + (t.lose || 0);
  if (wl >= 15 && t.win / wl >= 0.7) return ['神準操盤手', `賣出 ${wl} 次，有 ${t.win} 次是賺錢的。看得準，也收得快。`];
  if ((t.shortWin || 0) >= 5) return ['空頭殺手', `放空賺了 ${t.shortWin} 次。別人恐慌的時候，你在數錢。`];
  if ((t.buy || 0) >= 10 && (t.mar || 0) / t.buy >= 0.5) return ['融資敢死隊', '一半以上的單都是借錢買的。膽子很大，記得留條退路。'];
  if ((t.maxHold || 0) >= 10 && per < 1.5) return ['存股達人', `最久的一檔抱了 ${t.maxHold} 天。買了就放著，時間是你的朋友。`];
  if (per >= 4) return ['短線快手', `平均一天下單 ${per.toFixed(1)} 次。手腳很快，手續費也繳了不少。`];
  if ((t.heard || 0) / days >= 4) return ['街頭包打聽', `平均一天打聽 ${((t.heard || 0) / days).toFixed(1)} 則消息。城裡沒有你不知道的事。`];
  if ((S.errN || 0) >= 6) return ['熱心好鄰居', `幫街坊跑腿 ${S.errN} 次。錢賺多少不一定，人緣一定最好。`];
  return ['穩健的散戶', '不躁進、不亂借錢，一步一步走到今天。'];
}
const REC_KEY = 'stock-tycoon-records';
function loadRecords() { try { const a = JSON.parse(localStorage.getItem(REC_KEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function bestRecord(total, diff, list) { return (list || loadRecords()).filter(x => x.total === total && x.diff === diff).sort((a, b) => b.net - a.net)[0]; }
function recordsLine() {
  const b = bestRecord(NEWOPT.total, NEWOPT.diff); return b ? `<p class="nbNote">你的最佳紀錄（${NEWOPT.total} 個月・${DIFFS[NEWOPT.diff].name}）：<b>${wan(b.net)}</b>・${b.style}</p>` : '';
}
function endingExtraHTML(kind, nw) {
  const [name, desc] = styleOf(), total = S.total || FINAL_SEASON, diff = diffOf(), V = rivalInit();
  let list = loadRecords(); const prev = bestRecord(total, diff, list); let isNew = false;
  if (!S.recorded) {
    S.recorded = 1; isNew = !prev || nw > prev.net;
    list.push({ at: Date.now(), total, diff, net: Math.round(nw), kind, style: name }); list = list.sort((a, b) => b.net - a.net).slice(0, 30);
    try { localStorage.setItem(REC_KEY, JSON.stringify(list)); } catch (e) { }
  }
  const best = bestRecord(total, diff, list);
  return `<div class="sum" style="margin:8px 0"><span>投資風格 <b>${name}</b></span><span>對阿昌 <b>${V.w} 勝 ${V.l} 敗</b></span><span>完成挑戰 <b>${S.chalN || 0}</b> 個</span><span>街頭委託 <b>${S.errN || 0}</b> 件</span></div>
      <p style="margin:6px 0;font-size:14px">${desc}</p>
      <p style="margin:6px 0;font-size:14px">${total} 個月・${DIFFS[diff].name}難度的最佳紀錄：<b>${best ? wan(best.net) : wan(nw)}</b>${isNew ? '　<b class="up">這次是新紀錄！</b>' : ''}</p>`;
}
