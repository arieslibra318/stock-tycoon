/* =========================================================
   life：時間速度、住宅與生活開銷、定存／黃金／預售屋、道德抉擇、成就與公司圖鑑
   ========================================================= */

/* ---------- 時間速度：盤中、逛街（盤前、盤後、晚上）分開調 ---------- */
const SPEEDS = [[0.6, '慢'], [1, '標準'], [1.6, '快']];
const phaseRate = () => { const ph = PHASE(); return RATE[ph] * (ph === 'open' ? (S.spOpen || 1) : (S.spWalk || 1)); };
const speedName = v => (SPEEDS.find(x => x[0] === v) || [0, '標準'])[1];
const dayMinutes = () => { const o = S.spOpen || 1, w = S.spWalk || 1; return ((180 / (RATE.pre * w)) + (270 / (RATE.open * o)) + (270 / (RATE.post * w)) + (300 / (RATE.night * w))) / 60 | 0 || 1; };

/* ---------- 住宅 ---------- */
const HOUSES = [
  { name: '雅房', place: '阿德的雅房', price: 0, cost: 30000, perk: '頂樓加蓋的小房間，一張床、一張書桌。' },
  { name: '公寓', place: '阿德的公寓', price: 1.5e6, cost: 60000, perk: '兩房一廳，裝了家用電話：在家裡也能打給營業員下單。' },
  { name: '透天厝', place: '阿德的透天厝', price: 4e6, cost: 100000, perk: '鄰居都是做生意的老闆：每隔幾天晚上回家，會聽到一則很準的消息。' },
  { name: '豪宅', place: '阿德的豪宅', price: 1.2e7, cost: 250000, perk: '景觀豪宅：每個月可以辦一次派對，邀大戶、陳董、林襄理來家裡，每人透露一則準消息。' },
];
// 台北房價大約的走勢（1985 年＝1）：1987–1989 年飆漲近三倍，1990 年後持平微跌
const HOUSE_IDX = { 1985: 1, 1986: 1.05, 1987: 1.35, 1988: 1.95, 1989: 2.7, 1990: 2.8, 1991: 2.6, 1992: 2.55, 1993: 2.5, 1994: 2.5, 1995: 2.45, 1996: 2.4, 1997: 2.35 };
// 一年期定存利率（參考當年水準，簡化）
const DEP_RATE = { 1985: 0.0675, 1986: 0.055, 1987: 0.05, 1988: 0.05, 1989: 0.095, 1990: 0.0975, 1991: 0.085, 1992: 0.0775, 1993: 0.075, 1994: 0.0725, 1995: 0.07, 1996: 0.0625 };
// 金價（新台幣／台兩，參考當年國際金價與匯率，簡化）
const GOLD_Y = { 1985: 15400, 1986: 15900, 1987: 17300, 1988: 15500, 1989: 13500, 1990: 12400, 1991: 11700, 1992: 10900, 1993: 11500, 1994: 12400, 1995: 12400, 1996: 12300 };
// 住宅升級與生活開銷先關掉，之後要再開只要改成 true
const HOUSING = false;
const houseTier = () => HOUSING ? (S.house && S.house.tier) || 0 : 0;
const depRate = () => DEP_RATE[yearOf(S.season)] || 0.06;
function houseIdx() { const y = yearOf(S.season), a = HOUSE_IDX[y] || 2.4, b = HOUSE_IDX[y + 1] || a; return a + (b - a) * clamp((Math.min(S.day, DAYS) - 1) / Math.max(1, DAYS - 1), 0, 1); }
const houseValue = () => HOUSES[houseTier()].price * houseIdx();
function goldSeries() {
  if (SEASON.goldP) return SEASON.goldP;
  const r = mulberry32((SEASON.seed * 13 + 5) >>> 0), y = yearOf(S.season), p = [GOLD_Y[y] || 12000], drift = Math.log((GOLD_Y[y + 1] || p[0]) / p[0]) / DAYS;
  for (let d = 1; d <= DAYS; d++) {
    let x = drift + gauss(r) * 0.007;
    for (const e of SEASON.events) { const k = d - e.day; if (k >= 0 && k < 2 && ['crash', 'strait', 'gulf', 'war', 'pandemic', 'asia97'].includes(e.id)) x += 0.012; }
    p.push(Math.round(p[d - 1] * (1 + x)));
  }
  return (SEASON.goldP = p);
}
const goldPrice = () => goldSeries()[Math.min(DAYS, curDay() - 1 + (PHASE() === 'post' || PHASE() === 'night' ? 1 : 0))];
// 預售屋紅單：每張先付 30 萬訂金，跟著一戶 300 萬（1985 年價）的房子漲跌
const PRE_DEP = 3e5, PRE_FULL = 3e6;
const preValue = () => { const p = S.pre; if (!p || !p.units) return 0; return Math.max(0, p.units * (PRE_DEP + PRE_FULL * (houseIdx() - p.idx))); };
function lifeValue() { const h = S.house || {}; return (S.fixed || 0) + (S.gold || 0) * goldPrice() + (HOUSING ? houseValue() - (h.loan || 0) : 0) + preValue(); }

/* ---------- 生活與資產的面板 ---------- */
let LIFE_TAB = 'bank', LIFE_TABS = ['alloc', 'bank', 'house'];
function ensureLifeModal() {
  if ($('life')) return;
  const m = document.createElement('div'); m.id = 'life'; m.className = 'modal hide';
  m.innerHTML = '<div class="box paper"><div class="bh"><h3 id="lfTitle">生活與資產</h3><button class="x" aria-label="關閉">×</button></div><div class="bb" id="lfBody"></div></div>';
  $('app').appendChild(m); m.querySelector('.x').onclick = closeModals;
}
function openLife(tab) {
  ensureLifeModal(); if (GAME.busy && $('life').classList.contains('hide')) return; LIFE_TAB = tab || LIFE_TAB;
  // 在銀行能辦定存、黃金和房屋；在家能看房屋；在外面只能看資產配置
  LIFE_TABS = GAME.mode === 'interior' && IN.id === 'bank' ? ['alloc', 'bank'] : ['alloc']; if (!LIFE_TABS.includes(LIFE_TAB)) LIFE_TAB = LIFE_TABS[0]; GAME.busy = true; $('life').classList.remove('hide'); renderLife(); }
function renderLife(msg) {
  const tabs = [['alloc', '資產配置'], ['bank', '定存・黃金・預售屋']].filter(t => LIFE_TABS.includes(t[0])), h = S.house || {}, gp = goldPrice();
  let o = `<div class="tabs" style="margin-bottom:10px">${tabs.map(([k, t]) => `<button class="tab ${LIFE_TAB === k ? 'on' : ''}" data-lt="${k}">${t}</button>`).join('')}</div>`;
  if (msg) o += `<div class="sum">${msg}</div>`;
  if (LIFE_TAB === 'alloc') { $('lfBody').innerHTML = o + allocHTML(); $('lfTitle').textContent = '資產配置'; $('lfBody').querySelectorAll('[data-lt]').forEach(b => b.onclick = () => { LIFE_TAB = b.dataset.lt; renderLife(); }); return; }
  o += `<div class="sum"><span>現金 <b>${money(S.cash)}</b></span><span>定存 <b>${money(S.fixed || 0)}</b></span><span>黃金 <b>${(S.gold || 0)} 兩</b></span><span>房產淨值 <b>${money(houseValue() - (h.loan || 0))}</b></span><span>預售屋 <b>${money(preValue())}</b></span></div>`;
  if (LIFE_TAB === 'bank') {
    o += `<h4>一年期定存　年利率 ${(depRate() * 100).toFixed(2)}%</h4><p class="note" style="margin-top:0">一個月代表一年，月底依利率發利息，隨時可以解約領回。</p>
      <p>${[[1e5, '存 10 萬'], [1e6, '存 100 萬'], ['all', '現金全部存']].map(([v, t]) => `<button class="btn" data-fx="${v}">${t}</button>`).join(' ')}　${(S.fixed || 0) ? '<button class="btn" data-fx="out">全部解約</button>' : ''}</p>
      <h4>黃金　今日牌價 ${money(gp)} 元／台兩</h4><p class="note" style="margin-top:0">戰爭、股災、疫情時金價常會上漲，可以拿來避險；買賣各收 1% 手續費。${S.gold ? `你的平均成本 ${money(S.goldCost || 0)} 元。` : ''}</p>
      <p>${[[1, '買 1 兩'], [10, '買 10 兩'], [50, '買 50 兩']].map(([v, t]) => `<button class="btn" data-gb="${v}">${t}</button>`).join(' ')}　${S.gold ? '<button class="btn" data-gs="1">全部賣出</button>' : ''}</p>`;
    o += `<h4>預售屋紅單</h4><p class="note" style="margin-top:0">每張先付 ${wan(PRE_DEP)} 訂金，綁一戶 ${wan(PRE_FULL)}（1985 年價）的房子：房價漲，紅單就跟著漲好幾倍；房價跌，訂金可能賠光。可以隨時轉賣（手續費 3%）。</p>
      <p><button class="btn" data-pb="1">買 1 張（${wan(PRE_DEP)}）</button> ${S.pre && S.pre.units ? `<button class="btn" data-ps="1">全部轉賣（約 ${wan(preValue() * 0.97)}）</button>　持有 ${S.pre.units} 張` : ''}</p>`;
  }
  $('lfBody').innerHTML = o; $('lfTitle').textContent = '寶島銀行・定存、黃金、預售屋';
  const q = s => $('lfBody').querySelectorAll(s);
  q('[data-lt]').forEach(b => b.onclick = () => { LIFE_TAB = b.dataset.lt; renderLife(); });
  q('[data-fx]').forEach(b => b.onclick = () => lifeAct('fx', b.dataset.fx)); q('[data-gb]').forEach(b => b.onclick = () => lifeAct('gb', +b.dataset.gb)); q('[data-gs]').forEach(b => b.onclick = () => lifeAct('gs'));
  q('[data-hb]').forEach(b => b.onclick = () => lifeAct('hb', +b.dataset.hb, b.dataset.pay)); q('[data-hs]').forEach(b => b.onclick = () => lifeAct('hs'));
  q('[data-pb]').forEach(b => b.onclick = () => lifeAct('pb')); q('[data-ps]').forEach(b => b.onclick = () => lifeAct('ps'));
}
function lifeAct(k, v, pay) {
  const no = m => { sfx('bad'); renderLife(m); }, ok = m => { sfx('coin'); refreshHUD(); renderLife(m); };
  if (k === 'fx') { if (v === 'out') { S.cash += S.fixed || 0; const a = S.fixed; S.fixed = 0; return ok(`解約定存，領回 ${money(a)} 元`); } const a = v === 'all' ? Math.floor(S.cash) : +v; if (a <= 0 || S.cash < a) return no('現金不夠'); S.cash -= a; S.fixed = (S.fixed || 0) + a; return ok(`存入定存 ${money(a)} 元`); }
  if (k === 'gb') { const cost = v * goldPrice() * 1.01; if (S.cash < cost) return no('現金不夠'); S.goldCost = ((S.goldCost || 0) * (S.gold || 0) + goldPrice() * v) / ((S.gold || 0) + v); S.gold = (S.gold || 0) + v; S.cash -= cost; return ok(`買進黃金 ${v} 兩`); }
  if (k === 'gs') { const g = S.gold || 0, get = g * goldPrice() * 0.99; if (goldPrice() >= (S.goldCost || 0) * 1.1) achieve('gold'); S.cash += get; S.gold = 0; S.goldCost = 0; return ok(`賣出黃金 ${g} 兩，拿回 ${money(get)} 元`); }
  if (k === 'hb') {
    const price = HOUSES[v].price * houseIdx(), h = S.house || (S.house = { tier: 0, loan: 0 }), back = houseValue() * 0.96 - (h.loan || 0);
    const need = pay === 'loan' ? price * 0.32 : price * 1.02;
    if (S.cash + Math.max(0, back) < need) return no(`現金不夠：${pay === 'loan' ? '自備款加手續費' : '房價加手續費'}要 ${wan(need)}`);
    S.cash += back; S.cash -= need; h.loan = pay === 'loan' ? price * 0.7 : 0; h.tier = v; achieve('home'); if (v === 3) achieve('mansion');
    PLACE_BY.home.name = HOUSES[v].place; return ok(`恭喜搬進${HOUSES[v].name}！${HOUSES[v].perk}`);
  }
  if (k === 'hs') { const h = S.house; const back = houseValue() * 0.96 - (h.loan || 0); S.cash += back; h.tier = 0; h.loan = 0; PLACE_BY.home.name = HOUSES[0].place; return ok(`房子賣掉了，拿回 ${money(back)} 元，搬回雅房`); }
  if (k === 'pb') { if (S.cash < PRE_DEP) return no('現金不夠'); const p = S.pre || (S.pre = { units: 0, idx: houseIdx() }); p.idx = (p.idx * p.units + houseIdx()) / (p.units + 1); p.units++; S.cash -= PRE_DEP; return ok('買進預售屋紅單 1 張'); }
  if (k === 'ps') { const get = preValue() * 0.97; S.cash += get; S.pre = null; return ok(`紅單全部轉賣，拿回 ${money(get)} 元`); }
}
// 住處的好處
async function neighborChat() {
  if (houseTier() < 2 || PHASE() !== 'night' || S.day % 3 || S.talked.neighbor === S.day) return;
  S.talked.neighbor = S.day; const n = { id: 'neighbor', idx: 77, role: 'boss', rel: 0.85, name: '鄰居林老闆', look: 'boss' };
  GAME.busy = true; try { const m = makeRumor(n, S.day); if (!m) return; Object.assign(m, { day: S.day, npc: 'neighbor', npcName: n.name }); S.rumors.push(m); $('noteBadge').classList.remove('hide'); await say(n, '阿德，剛好遇到你！跟你說，' + m.text); toast('記進消息本了'); } finally { DLG.hide(); GAME.busy = false; }
}
async function throwParty() {
  if (PHASE() !== 'night') { toast('派對要晚上辦比較有氣氛'); return; }
  if (S.partySeason === S.season) { toast('這個月已經辦過派對了'); return; }
  if (S.cash < 2e5) { toast('辦一場派對要 20 萬'); return; }
  S.cash -= 2e5; S.partySeason = S.season; GAME.busy = true;
  try {
    await say(null, '（香檳、卡拉 OK、滿桌的菜。大戶阿忠、陳董和林襄理都來了。）');
    for (const id of ['whale', 'builder', 'banker']) {
      const n = NPC_BY[id], m = makeRumor(Object.assign(Object.create(n), { rel: 0.88, idx: n.idx + 90 }), S.day); bondUp(n, 2);
      if (m) { Object.assign(m, { day: S.day, npc: n.id, npcName: n.name }); S.rumors.push(m); await say(n, m.text); }
    }
    $('noteBadge').classList.remove('hide'); achieve('party'); toast('派對結束，消息都記進消息本了');
  } finally { DLG.hide(); GAME.busy = false; refreshHUD(); }
}

/* ---------- 道德抉擇：內線、代客操作、老鼠會 ---------- */
// 道德抉擇（代客操作、老鼠會下線、內線被約談）先關掉，之後要再開只要改成 true
const ETHICS = false;
async function lifeHook(n) {
  if (!ETHICS) return false;
  if (n.id === 'aunt1' && !S.managed && S.offerAunt !== S.season && S.day >= 3 && S.day <= DAYS - 5 && Math.random() < 0.6) {
    S.offerAunt = S.season;
    await say(n, '阿德，阿姨看你最近股票做得很好……我這 50 萬交給你幫我操作好不好？賺了分你兩成！');
    const c = await choose(['好，交給我（月底結算）', '這樣不好，代客操作是違法的']);
    if (c === 0) { S.managed = { amt: 5e5, start: netWorth(), season: S.season }; S.heat = (S.heat || 0) + 1; await say(n, '太好了！月底再跟你算喔，可別讓阿姨賠錢。'); }
    else { bondUp(n, 1); achieve('honest'); await say(n, '唉唷，你這孩子真老實。好啦，那阿姨自己來。'); }
    return true;
  }
  if (n.id === 'ponzi' && !S.ponziGone && !S.downline && S.offerPonzi !== S.season && S.day >= 2) {
    S.offerPonzi = S.season;
    await say(n, '少年仔，你人面這麼廣，要不要當我們金滿堂的下線？拉人進來就有業績獎金，每天至少兩萬！');
    const c = await choose(['好啊，賺錢誰不要', '不要，這聽起來是老鼠會']);
    if (c === 0) { S.downline = { got: 0 }; await say(n, '爽快！從今天收盤開始，每天發你業績獎金。'); }
    else { achieve('noponzi'); await say(n, '嘖，膽子這麼小，怎麼賺大錢？'); }
    return false;
  }
  return false;
}
function driverHeat() { if (!ETHICS) return; S.heat = (S.heat || 0) + 1; S.driverUsed = (S.driverUsed || 0) + 1; }
async function ethicsMorning() {
  if (!ETHICS) return;
  if ((S.heat || 0) >= 2 && Math.random() < 0.05 * S.heat) {
    const fine = Math.round(Math.min(Math.max(1e5, netWorth() * 0.04 * S.heat), Math.max(0, S.cash)));
    GAME.busy = true;
    try { await say(null, '（一大早，兩個穿西裝的人在雅房門口等你。）'); await say(null, `「調查局的。你最近的交易，時間點都抓得太準了。」你被約談了一整天，最後被罰了 ${money(fine)} 元。`); }
    finally { DLG.hide(); GAME.busy = false; }
    S.cash -= fine; S.heat = 0; S.driverBan = S.day + 5; sfx('bad'); buzz([300, 100, 300]);
  }
}
function downlinePay() { if (S.downline && !S.ponziGone) { S.cash += 2e4; S.downline.got += 2e4; toast('金滿堂下線業績獎金 2 萬入帳'); } }
function downlineCollapse() {
  if (!S.downline) return; const fine = Math.min(S.downline.got * 2, Math.max(0, S.cash)); S.cash -= fine;
  for (const n of NPCS) if (n.rel && S.bond && S.bond[n.id]) S.bond[n.id] = Math.max(0, S.bond[n.id] - 2);
  S.heat = (S.heat || 0) + 2; S.downline = null; toast(`金滿堂倒了，檢調查到你是下線：罰款 ${money(fine)} 元，街坊對你的信任也打了折扣`); sfx('bad'); buzz([300, 100, 300]);
}

/* ---------- 月底：生活開銷、利息、代客操作結算 ---------- */
function lifeSeasonEnd() {
  const msgs = [], dep = (S.fixed || 0) * depRate();
  S.fixed = (S.fixed || 0) + dep; if (dep) msgs.push(`定存利息 +${money(dep)} 元（已滾入定存）。`);
  if (S.managed && S.managed.season === S.season) {
    const r = netWorth() / S.managed.start - 1, pl = S.managed.amt * r, a = NPC_BY.aunt1;
    if (pl >= 0) { const fee = pl * 0.2; S.cash += fee; bondUp(a, 3); achieve('managed'); msgs.push(`幫王媽媽代客操作賺了 ${money(pl)} 元，她分你兩成 ${money(fee)} 元，逢人就誇你。`); }
    else { S.bond = S.bond || {}; S.bond.aunt1 = 0; for (const id of ['aunt2', 'aunt3', 'vendor']) S.bond[id] = Math.max(0, (S.bond[id] || 0) - 2); msgs.push(`幫王媽媽操作賠了 ${money(-pl)} 元，她氣到不跟你說話，還跟菜市場的姊妹們講你的壞話。`); }
    S.managed = null;
  }
  if (yearOf(S.season) === 1990) { const exp = holdValue(SEASON.close[DAYS]) + marginParts(SEASON.close[DAYS]).mv; if (exp < netWorth() * 0.1 && netWorth() >= (S.netHist || [])[0]) achieve('bubble'); }
  if ((S.fixed || 0) >= 1e6) achieve('saver');
  return msgs;
}
const LIFE_KEEP = ['house', 'fixed', 'gold', 'goldCost', 'pre', 'heat', 'downline', 'ach', 'dex', 'spOpen', 'spWalk', 'partySeason'];

/* ---------- 成就 ---------- */
const ACH = [
  ['profit', '開張大吉', '第一次單日獲利'], ['limitup', '漲停板！', '持股鎖上漲停'], ['bounce', '接住落下的刀', '持有前一天跌停的股票，隔天反彈 3% 以上'],
  ['short', '空頭高手', '融券部位帳面獲利超過 10%'], ['ipo', '新股中籤', '抽中新股'], ['saved', '化險為夷', '收到追繳令後補繳成功'],
  ['rank1', '散戶', '升上散戶'], ['rank2', '中實戶', '升上中實戶'], ['rank3', '大戶', '升上大戶'], ['rank4', '證券大亨', '成為證券大亨'],
  ['vip', '大戶室的常客', '進證券行的大戶室喝茶'],
  ['saver', '穩健派', '月底定存超過 100 萬'], ['gold', '黃金避險', '黃金賺 10% 以上賣出'],
  ['bubble', '躲過泡沫破裂', '1990 年那個月，月底持股不到資產一成而且沒有虧損'], ['walker', '日行萬步', '一天走滿一萬步'], ['bestie', '麻吉', '和某個人的交情到滿點'], ['eggs', '城市探險家', '找齊 10 個彩蛋'],
];
function achieve(id) {
  S.ach = S.ach || {}; if (S.ach[id]) return; S.ach[id] = `${S.season}-${S.day}`;
  const a = ACH.find(x => x[0] === id); if (!a) return; setTimeout(() => { toast(`<b>成就解鎖</b>：${a[1]}`); sfx('done'); }, 600);
}
function achHTML() {
  const got = Object.keys(S.ach || {}).length;
  return `<div class="sum">已解鎖 <b>${got}/${ACH.length}</b> 個成就</div>` + ACH.map(([id, n, d]) => { const ok = (S.ach || {})[id]; return `<div class="rumor" style="grid-template-columns:1fr auto"><span><b>${ok ? n : '？？？'}</b><br><small style="color:var(--ink-soft)">${d}</small></span>${ok ? `<span class="st ok">第 ${ok.split('-')[0]} 個月</span>` : '<span class="st wait">未解鎖</span>'}</div>`; }).join('');
}

/* ---------- 公司圖鑑 ---------- */
const PROFILE = {
  fin: '老牌金控，股本最大，金融股狂潮時是龍頭。', bnk: '城中路上的老銀行，散戶最愛的高股息股。', ins: '做產險起家，颱風、大災難時常被拿出來講。',
  tel: '公營改民營的電信公司，股價最穩，像定存。', gas: '北城的瓦斯公司，業績穩定、波動很小。', food: '泡麵、罐頭都做，景氣不好時反而撐得住。',
  sug: '老糖廠轉型，地很多，常被當成資產股。', milk: '小乳品廠，財務體質不好，傳言多。', tex: '大稻埕老紡織廠，工廠用地比本業還值錢。',
  gar: '代工成衣廠，訂單一直被東南亞搶走。', pla: '塑化龍頭，跟著油價和景氣大起大落。', chm: '港都的化工廠，產品報價一漲股價就飆。',
  stl: '南港的鋼鐵廠，景氣循環的代表。', cem: '水泥廠，公共建設和房市熱的時候最好。', shp: '貨櫃航運，運價一動就漲停跌停。',
  sea: '散裝航運，體質比較弱，是投機客的最愛。', con: '營建大廠，預售屋賣得好壞決定一切。', est: '東區新興建商，擴張很快、借錢很多。',
  dept: '西門町的百貨公司，週年慶和觀光客決定業績。', ele: '新竹科學園區的電子廠，接單消息一來就飆。', pcb: '做電路板的板橋工廠，跟著電子業景氣走。',
  mot: '中和的小電機廠，傳產轉型不太順利。', fab: '晶圓代工，技術領先，外資和法人最愛。', pkg: '竹科的封裝測試廠，跟著晶圓廠接單。',
  srv: '做伺服器的電腦公司，AI 浪潮的主角。', net: '內湖的網通設備廠，成長快、股價也跳得兇。', bio: '新藥研發公司，有夢最美，消息面最多。',
  med: '北投的老藥廠，學名藥為主，經營保守。', ipo1: '新上市的電腦公司，主打伺服器組裝。', ipo2: '竹北的光電新貴，做面板零件。',
  ipo3: '汐止的半導體設計公司，掛牌前就很熱門。', ipo4: '林口的生醫公司，帶著新藥題材上市。', ipo5: '新成立的航空貨運公司。', ipo6: '專投科技新創的創投公司。',
};
function dexSeen(id, traded) { S.dex = S.dex || {}; const e = S.dex[id] || (S.dex[id] = { t: 0 }); if (traded) e.t++; }
function dexHTML() {
  const seen = Object.keys(S.dex || {}).length; let h = `<div class="sum">已認識 <b>${seen}/${STOCKS.length}</b> 家公司（聽過明牌或買賣過就會收錄）</div>`;
  const secs = [...new Set(STOCKS.map(s => s.sector))];
  for (const sec of secs) {
    h += `<h4 style="margin:10px 0 4px">${sec}</h4>`;
    for (const s of STOCKS.filter(x => x.sector === sec)) { const e = (S.dex || {})[s.id], gone = (S.gone || []).includes(s.id); h += `<div class="rumor" style="grid-template-columns:1fr auto"><span><b>${e ? s.name : '？？？'}</b>${e ? `<br><small style="color:var(--ink-soft)">${ST_NAME[s.st]}・${PROFILE[s.id] || ''}</small>` : ''}</span><span class="st ${gone ? 'no' : e ? 'ok' : 'wait'}">${gone ? '已下市' : e ? `交易 ${e.t} 次` : '未收錄'}</span></div>`; }
  }
  return h;
}

/* ---------- 每日檢查 ---------- */
function dayChecks(d, dpl) {
  if (dpl > 0) achieve('profit');
  STOCKS.forEach((s, i) => {
    const long = ((S.hold[s.id] || {}).q || 0) + ((S.mar[s.id] || {}).q || 0);
    if (long && d > 1) { const [, dn] = limits(SEASON.close[d - 2][i], d - 1); if (SEASON.close[d - 1][i] <= dn && SEASON.ret[d][i] >= 0.03) achieve('bounce'); }
    const t = S.sht[s.id]; if (t && (t.cost - SEASON.close[d][i]) / t.cost >= 0.1) achieve('short');
  });
  if (NPCS.some(n => n.rel && hearts(n.id) >= 5)) achieve('bestie');
}

/* ---------- 資產配置：現在的錢放在哪裡 ---------- */
function allocHTML() {
  const p = prices(), mp = marginParts(p), h = S.house || {}, gp = goldPrice(), stock = holdValue(p);
  const rows = [['現金', S.cash, '#8a7a62'], ['現股', stock, '#d7263d'], ['融資（扣掉借款）', mp.mv - mp.loan, '#e8742b'], ['融券（保證金扣掉回補成本）', mp.coll - mp.sv, '#14965a'],
    ['新股申購中', subFrozen(), '#b98cd6'], ['定存', S.fixed || 0, '#1f4f9a'], ['黃金', (S.gold || 0) * gp, '#f2c14e'], ['房產（扣掉房貸）', houseValue() - (h.loan || 0), '#5f9e6a'],
    ['預售屋紅單', preValue(), '#2b7f86'], ['金滿堂存款', S.deposit || 0, '#6b5d4a']].filter(r => Math.abs(r[1]) >= 1);
  const total = netWorth(), pos = rows.filter(r => r[1] > 0), sum = pos.reduce((a, r) => a + r[1], 0) || 1;
  let o = `<div class="sum"><span>總資產 <b>${money(total)}</b></span>${h.loan ? `<span>房貸 <b class="down">${money(h.loan)}</b></span>` : ''}${mp.loan ? `<span>融資借款 <b class="down">${money(mp.loan)}</b></span>` : ''}</div>`;
  o += `<div class="alBar" role="img" aria-label="資產配置比例">${pos.map(r => `<span style="flex:${r[1]};background:${r[2]}" title="${r[0]} ${(r[1] / sum * 100).toFixed(1)}%"></span>`).join('')}</div>`;
  o += `<table class="q alTab"><tr><th style="text-align:left">項目</th><th>金額</th><th>比例</th></tr>${rows.map(r => `<tr><td style="text-align:left"><i class="alDot" style="background:${r[2]}"></i>${r[0]}</td><td class="${r[1] < 0 ? 'down' : ''}">${money(r[1])}</td><td>${r[1] > 0 ? (r[1] / sum * 100).toFixed(1) + '%' : '—'}</td></tr>`).join('')}</table>`;
  // 股票部位依族群
  const sec = {}; let ex = 0;
  STOCKS.forEach((s, i) => { const v = ((S.hold[s.id] || {}).q || 0) * LOT * p[i] + ((S.mar[s.id] || {}).q || 0) * LOT * p[i]; if (v > 0) { sec[s.sector] = (sec[s.sector] || 0) + v; ex += v; } });
  if (ex > 0) o += `<h4 style="margin:12px 0 4px">做多的股票依族群</h4>` + Object.entries(sec).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="alSec"><span>${k}</span><span class="alTrack"><span style="width:${(v / ex * 100).toFixed(1)}%"></span></span><b>${(v / ex * 100).toFixed(0)}%</b></div>`).join('');
  // 簡單的提醒（不是投資建議）
  const share = k => rows.filter(r => k.includes(r[0])).reduce((a, r) => a + Math.max(0, r[1]), 0) / sum;
  const st = share(['現股', '融資（扣掉借款）']), cash = share(['現金']), top = ex ? Math.max(...Object.values(sec)) / ex : 0, tips = [];
  if (st > 0.8) tips.push('股票占了八成以上，大盤一跌，總資產會跟著大跌。');
  if (mp.loan > total * 0.5) tips.push('融資借款超過總資產一半，遇到連續跌停很容易被追繳。');
  if (top > 0.6 && Object.keys(sec).length >= 1 && ex > total * 0.3) tips.push('股票集中在同一個族群，那個族群出事時會很痛。');
  if (cash > 0.7 && total > START_CASH * 0.8) tips.push('現金放了七成以上，比較安全，但也沒在幫你賺錢。');
  if (!tips.length) tips.push('配置看起來還算平均。');
  return o + `<p class="note">${tips.join('')}（遊戲裡的提醒，不構成投資建議）</p>`;
}
