/* =========================================================
   market：虛構股票、百年事件卡（隨機排列）、行情產生、消息
   ========================================================= */
const STOCKS = [
  { id: 'fin', name: '寶島金融', sector: '金融', st: '價值', p0: 118, beta: 1.2, vol: 0.017, cap: 9 },
  { id: 'tel', name: '島嶼電信', sector: '電信', st: '價值', p0: 88, beta: 0.5, vol: 0.009, cap: 6 },
  { id: 'food', name: '寶島食品', sector: '食品', st: '價值', p0: 33, beta: 0.6, vol: 0.012, cap: 3 },
  { id: 'tex', name: '大稻埕紡織', sector: '紡織', st: '價值', p0: 27.5, beta: 0.9, vol: 0.02, cap: 3 },
  { id: 'pla', name: '淡水塑化', sector: '塑化', st: '循環', p0: 46, beta: 1.0, vol: 0.016, cap: 7 },
  { id: 'stl', name: '南港鋼鐵', sector: '鋼鐵', st: '循環', p0: 25, beta: 1.1, vol: 0.022, cap: 4 },
  { id: 'shp', name: '基港航運', sector: '航運', st: '循環', p0: 22.3, beta: 1.2, vol: 0.027, cap: 3 },
  { id: 'con', name: '城中營造', sector: '營建', st: '循環', p0: 54, beta: 1.25, vol: 0.024, cap: 4 },
  { id: 'ele', name: '新竹微電', sector: '電子', st: '成長', p0: 35.5, beta: 1.2, vol: 0.028, cap: 4 },
  { id: 'fab', name: '福爾摩沙晶圓', sector: '半導體', st: '成長', p0: 58, beta: 1.3, vol: 0.026, cap: 8 },
  { id: 'srv', name: '雲頂電腦', sector: '伺服器', st: '成長', p0: 42, beta: 1.4, vol: 0.032, cap: 3 },
  { id: 'bio', name: '南港生技', sector: '生技', st: '成長', p0: 66, beta: 1.0, vol: 0.035, cap: 2 },
];
const ST_NAME = { 成長: '成長股', 價值: '價值股', 循環: '景氣循環股' };
const SBY = Object.fromEntries(STOCKS.map(s => [s.id, s]));
let DAYS = 40; const LIMIT = 0.07, LOT = 1000, FEE = 0.001425, TAX = 0.003, TICKS = 54;   // 09:00–13:30，每 5 分鐘一跳
// 短篇每季只有一半天數，門檻跟著降低
const RANKS_L = [{ name: '跑單小弟', min: 0 }, { name: '散戶', min: 3e6 }, { name: '中實戶', min: 6e6 }, { name: '大戶', min: 1.5e7 }, { name: '證券大亨', min: 5e7 }];
const RANKS_S = [{ name: '跑單小弟', min: 0 }, { name: '散戶', min: 2.5e6 }, { name: '中實戶', min: 4e6 }, { name: '大戶', min: 8e6 }, { name: '證券大亨', min: 2.5e7 }];
let RANKS = RANKS_L;
const START_CASH = 2000000;
// 每季代表一年，開季指數用當年台股年初的水準（1986–1990 年加權指數年初約 835、1039、2340、5119、9624 點）
const YEAR_OPEN = { 1986: 835, 1987: 1039, 1988: 2340, 1989: 5119, 1990: 9624, 1991: 4530 };
let IDX_BASE = 4500;
const VOL_K = 1.5;   // 80 年代末個股波動大，漲停跌停是家常便飯（只放大個股，不改大盤）
// 融資券（依台股常見規定簡化）：融資成數 6 成、融券保證金 9 成、維持率 130%
const MARGIN_LOAN = 0.6, SHORT_MARGIN = 0.9, MAINT = 1.3, LOAN_DAY = 0.065 / 250, SHORT_FEE = 0.0008, PHONE_PRICE = 60000;

/* 事件卡：前兆（消息）→ 爆發 → 餘波。ref 是改編的真實歷史。 */
const EVENTS = [
  { id: 'crash', name: '全球股災', pre: 3, dur: 5, eff: k => k < 3 ? { idx: -0.075 } : { idx: 0.035 },
    head: '國際股市崩盤　台股開盤全面跌停', body: '外電傳來華爾街單日重挫的消息，證券行裡一片死寂，所有股票都掛跌停賣不掉。',
    ref: '改編自 1987 年 10 月 19 日「黑色星期一」：美國道瓊指數單日下跌約 22.6%，全球股市跟著重挫，台股也連續大跌。',
    hints: [['reporter', '外電說美國利率一直升、美元很弱，華爾街那邊氣氛很怪……'], ['banker', '國外的同業打電話來，說他們那邊的基金在大量贖回。'], ['oldhand', '股市漲太久了，我這把老骨頭總覺得要出大事。']] },
  { id: 'tax', name: '證所稅風暴', pre: 3, dur: 7, eff: k => k < 5 ? { idx: -0.055, vol: 0.4, thin: true } : { idx: 0.04 },
    head: '財政部宣布復徵證所稅　股市連日無量重挫', body: '消息一出，大戶全部縮手，成交量少得可憐，指數一天比一天低。',
    ref: '改編自 1988 年 9 月 24 日財政部宣布復徵證券交易所得稅，台股隨後連續十九個交易日下跌，被稱為「無量下跌」。',
    hints: [['reporter', '報社內部消息：財政部好像要開始課股票的交易所得稅。'], ['banker', '聽說上面在研議對股票獲利課稅，大戶都在準備把錢抽出來。']] },
  { id: 'finbubble', name: '金融股狂潮', pre: 3, dur: 5, eff: k => k < 4 ? { idx: 0.02, sec: { '金融': 0.065 } } : { idx: -0.01, sec: { '金融': -0.06 } },
    head: '金融股連日漲停　證券行擠爆菜籃族', body: '大家都說銀行股閉著眼睛買都會賺，證券行門口排起了長龍。',
    ref: '改編自 1989～1990 年台股泡沫：金融股股價飆到上千元，大批「菜籃族」湧進證券行，最後泡沫破裂。',
    hints: [['auntie', '菜市場大家都在買銀行股，說閉著眼睛買都會賺！'], ['taxi', '我載的客人十個有八個在講金融股。'], ['banker', '銀行開放民營的消息傳很久了，金融股可能要飛。']] },
  { id: 'ponzi', name: '地下投資公司倒閉', always: true, pre: 3, dur: 3, eff: k => ({ idx: k === 0 ? -0.025 : -0.008 }),
    head: '地下投資公司爆發擠兌　大量資金撤出股市', body: '標榜月息四分的投資公司一夕倒閉，投資人圍在門口討錢，許多人拋售股票救急。',
    ref: '改編自 1980 年代末台灣地下投資公司以高利吸金，1989 年修法取締後，1990 年前後接連倒閉，許多投資人血本無歸。',
    hints: [['oldhand', '那種月息四分的投資公司，錢是從哪裡來的？你想過嗎？'], ['reporter', '聽說法務部要修法取締地下投資公司了。'], ['banker', '最近好幾家投資公司的支票跳票，同業都在傳。']] },
  { id: 'gulf', name: '中東戰火、油價飆漲', pre: 2, dur: 5, eff: k => k < 3 ? { idx: -0.04, sec: { '塑化': -0.03, '航運': -0.035 } } : { idx: 0.015 },
    head: '中東爆發戰爭　油價飆漲　塑化航運重挫', body: '油價一夜之間翻倍，原料和運費都變貴，塑化和航運股首當其衝。',
    ref: '改編自 1990 年 8 月伊拉克入侵科威特：油價飆漲，台股從同年 2 月的 12682 點一路跌到 10 月約 2485 點。',
    hints: [['shipping', '中東那邊的航線好像要停了，船東都在講戰爭。'], ['reporter', '外電：伊拉克在邊境集結大批軍隊。']] },
  { id: 'chips', name: '科學園區接大單', pre: 2, dur: 4, eff: k => ({ idx: 0.01, sec: { '電子': 0.055 } }),
    head: '電子新廠訂單滿載　電子股強勢領漲', body: '國外大廠的訂單湧進園區，工廠三班制趕工，電子股成了市場新寵。',
    ref: '改編自 1980 年新竹科學園區設立後，電子業逐漸成為台灣出口與股市的主角。',
    hints: [['engineer', '我們園區的廠訂單接不完，老闆說要加蓋新廠房！'], ['taxi', '最近常載到新竹來的工程師，看起來都很忙。']] },
  { id: 'land', name: '資產股題材', pre: 2, dur: 4, eff: k => ({ idx: 0.012, sec: { '紡織': 0.055, '營建': 0.05 } }),
    head: '地價飆漲　資產股、營建股全面走揚', body: '預售屋一開賣就秒殺，擁有大片土地的老牌公司身價跟著水漲船高。',
    ref: '改編自 1980 年代末台灣房地產大漲，擁有土地的老牌紡織、食品公司被稱為「資產股」而受到追捧。',
    hints: [['builder', '預售屋開盤就賣光，地價一天比一天貴。'], ['oldhand', '那些老紡織廠的土地，現在比工廠還值錢。']] },
  { id: 'easing', name: '資金寬鬆行情', pre: 2, dur: 5, eff: k => ({ idx: 0.03 }),
    head: '熱錢湧入　股市量價齊揚', body: '外匯存底年年創新高，銀行的錢多到借不出去，大家都把錢丟進股市。',
    ref: '改編自 1980 年代台灣長期貿易順差、新台幣大幅升值，大量資金湧入股市與房地產。',
    hints: [['banker', '外匯存底又創新高，熱錢多到銀行都放不出去。'], ['reporter', '央行可能要降息，經濟版明天會登。']] },
  { id: 'typhoon', name: '強颱來襲', pre: 1, dur: 1, eff: k => ({ idx: -0.015, sec: { '營建': -0.02 } }),
    head: '強颱過境　股市小跌', body: '風雨交加，證券行裡人潮稀稀落落，股價小幅走低。',
    ref: '台灣夏秋常有颱風，颱風假會休市，或讓股市出現短暫利空。',
    hints: [['taxi', '氣象局說有個強颱要來，明天記得把機車牽好。']] },
  { id: 'volcker', name: '聯準會暴力升息', pre: 3, dur: 5, eff: k => k < 4 ? { idx: -0.025, sec: { '營建': -0.02, '金融': 0.012 }, st: { 成長: -0.02 } } : { idx: 0.01 },
    us: k => k === 0 ? -0.035 : k < 4 ? -0.01 : 0.005, usHead: k => k === 0 ? '聯準會大幅升息對抗通膨　美國公債價格重挫' : k < 4 ? '美債殖利率續創新高　成長股承壓' : null,
    head: '美國利率飆升　成長股、營建股重挫', body: '美國把利率拉到兩位數對抗通膨，債券價格崩跌，資金從高本夢比的成長股撤出。',
    ref: '改編自 1979–1981 年美國聯準會主席伏克爾（Paul Volcker）大幅升息對抗通膨，聯邦基金利率一度接近 20%，美國公債價格重挫，俗稱「伏克爾震撼」。',
    hints: [['banker', '美國那邊利率一直往上衝，債券價格跌得很慘。'], ['reporter', '外電說聯準會要下重手打通膨，利率可能上看兩成。']] },
  { id: 'strait', name: '台海飛彈危機', pre: 3, dur: 6, eff: k => k < 3 ? { idx: -0.05 } : { idx: 0.03 },
    us: k => k === 0 ? -0.006 : 0, usHead: k => k === 0 ? '台海情勢緊張　美國派出航空母艦' : null,
    head: '對岸試射飛彈　台股恐慌重挫', body: '飛彈落在台灣附近海域，許多人急著換美金、賣股票；幾天後局勢穩定，股市跟著反彈。',
    ref: '改編自 1995–1996 年台海飛彈危機：中國在台灣附近海域試射飛彈，台股一度重挫，美國派出兩個航空母艦戰鬥群到附近海域，局勢之後趨於穩定。',
    hints: [['reporter', '聽說對岸要在附近海域演習，報社今晚全員加班。'], ['taxi', '收音機一直在講飛彈的事，客人都在問哪裡可以換美金。']] },
  { id: 'asia97', name: '亞洲金融風暴', pre: 3, dur: 5, eff: k => k < 4 ? { idx: -0.03, sec: { '航運': -0.015 }, st: { 成長: -0.01 } } : { idx: 0.015 },
    us: k => k === 1 ? -0.022 : 0, usHead: k => k === 1 ? '亞洲金融風暴延燒　美股也跟著下跌' : null,
    head: '亞洲貨幣接連崩跌　台股跟著重挫', body: '泰國撐不住匯率，危機一路延燒到東南亞和韓國，外資大舉撤出亞洲。',
    ref: '改編自 1997 年亞洲金融風暴：泰銖崩跌後危機擴散到東南亞與韓國，各國貨幣與股市重挫；台灣相對抗跌，但股市與新台幣仍受波及。',
    hints: [['banker', '泰國那邊的匯率好像撐不住了，同業都在調整部位。'], ['shipping', '東南亞的客戶都在延後付款，怪怪的。']] },
  { id: 'ai', name: 'AI 浪潮', pre: 3, dur: 5, eff: k => k < 4 ? { idx: 0.012, sec: { '半導體': 0.055, '伺服器': 0.06 }, st: { 成長: 0.008 } } : { idx: -0.005, sec: { '伺服器': -0.04 } },
    us: k => k === 0 ? 0.025 : k < 4 ? 0.008 : -0.01, usHead: k => k === 0 ? '晶片大廠財報驚豔　那斯達克大漲' : k < 4 ? 'AI 題材發燒　科技股再創新高' : '投資人擔心 AI 過熱，科技股回檔',
    head: 'AI 伺服器訂單爆量　晶圓、伺服器股連日大漲', body: '全世界都在搶 AI 晶片和伺服器，供應鏈訂單滿到明年，相關股票一路往上衝。',
    ref: '改編自 2023–2024 年生成式 AI 熱潮：AI 伺服器與晶片需求暴增，台灣的晶圓代工與伺服器供應鏈股價大漲。',
    hints: [['engineer', '我們接到好多 AI 伺服器的單，產線全滿了！'], ['reporter', '美國那邊的晶片公司財報又超乎預期。']] },
  // 政策事件：不在卡池裡，依盤勢機率觸發
  { id: 'limitdown', name: '跌幅縮小、禁止放空', policy: true, pre: 0, dur: 0, eff: () => ({}),
    head: '主管機關出手：跌幅限制縮小為 3.5%　平盤以下禁止放空', body: '連續重挫之後，主管機關宣布接下來幾天跌幅限制縮小一半，並暫停平盤以下融券放空。',
    ref: '改編自 2008 年金融海嘯期間，台灣主管機關曾暫時把跌幅限制由 7% 縮小為 3.5%，並限制平盤以下融券放空；2020 年疫情期間也曾限制平盤以下放空。', hints: [] },
  { id: 'reform10', name: '漲跌幅放寬為 10%', policy: true, pre: 0, dur: 0, eff: () => ({}),
    head: '制度改革：漲跌幅限制即日起放寬為 10%', body: '主管機關宣布漲跌幅限制由 7% 放寬為 10%，股價一天可以動得更多，賺賠都會放大。',
    ref: '改編自 2015 年 6 月 1 日台股漲跌幅限制由 7% 放寬為 10%。', hints: [] },
];
const US_UP = ['美國就業數據優於預期　美股走高', '科技股財報亮眼　那斯達克上漲', '聯準會暗示暫停升息　華爾街歡呼', '油價回落　美股鬆一口氣'];
const US_DN = ['聯準會官員發表鷹派言論　美股走低', '美債殖利率攀升　科技股承壓', '美國通膨數據高於預期　美股下跌', '中東局勢緊張、油價上漲　美股收黑'];
const US_FLAT = ['美股漲跌互見　投資人觀望', '美國假期前夕　成交清淡'];
const EBY = Object.fromEntries(EVENTS.map(e => [e.id, e]));

/* ---------- 一整季的行情（由種子決定，存檔只要存種子） ---------- */
let SEASON = null;
function gauss(r) { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function tick(p) { return p < 10 ? 0.01 : p < 50 ? 0.05 : p < 100 ? 0.1 : p < 500 ? 0.5 : 1; }
function roundTick(p) { const t = tick(p); return Math.round(p / t) * t; }
function genSeason(seed) {
  const r = mulberry32(seed), SS = typeof S !== 'undefined' && S ? S : null;
  DAYS = (SS && SS.len) || 40; RANKS = DAYS === 20 ? RANKS_S : RANKS_L; const season = (SS && SS.season) || 1;
  IDX_BASE = YEAR_OPEN[1985 + season] || 4500;
  const bubble = season === (typeof FINAL_SEASON !== 'undefined' ? FINAL_SEASON : 5), kb = 40 / DAYS;
  const pool = EVENTS.filter(e => !e.always && !e.policy).map(e => e.id);
  for (let i = pool.length - 1; i > 0; i--) { const j = r() * (i + 1) | 0;[pool[i], pool[j]] = [pool[j], pool[i]]; }
  // 每季兩個利多、兩個利空，順序隨機
  const POS = ['finbubble', 'chips', 'land', 'easing', 'ai'];
  const pos = pool.filter(id => POS.includes(id)).slice(0, 2), neg = pool.filter(id => !POS.includes(id)).slice(0, 2);
  const deck = [pos[0], neg[0], pos[1], neg[1]]; for (let i = 3; i > 0; i--) { const j = r() * (i + 1) | 0;[deck[i], deck[j]] = [deck[j], deck[i]]; }
  deck.splice(1 + (r() * 3 | 0), 0, 'ponzi');
  const events = []; let day = 5 + (r() * 3 | 0);
  for (const id of deck) { if (day > DAYS - 3) break; events.push({ id, day, def: EBY[id] }); day += EBY[id].dur + 2 + (r() * 4 | 0); }
  // 主力拉抬：每季三次，拉三天、倒兩天
  const pumps = [];
  for (let k = 0; k < 3; k++) { for (let t = 0; t < 30; t++) { const d = 4 + (r() * (DAYS - 10) | 0); if (events.some(e => Math.abs(e.day - d) < 4) || pumps.some(p => Math.abs(p.day - d) < 6)) continue; pumps.push({ day: d, stock: STOCKS[r() * STOCKS.length | 0].id }); break; } }
  // 先算「不含天氣」的原始報酬，再套上天氣（天氣之後可能被即時天氣覆蓋）
  const raw = [STOCKS.map(() => 0)], thin = [false], weather = ['sun'], temp = [28], us = [0], nas = [0], jp = [0], kr = [0], usHead = [''];
  let regime = 1; const MU = [0.01, 0.002, -0.005];   // 多頭、盤整、空頭的每日平均漲跌（1987–89 年台股平均約每兩個月 +12%）
  for (let d = 1; d <= DAYS; d++) {
    if (r() > 0.88) regime = r() < 0.45 ? 0 : r() < 0.6 ? 1 : 2;
    let idx = 0, sec = {}, sty = {}, vol = 1, th = false, storm = false, evUs = 0, head = null;
    // 1990 年：前段衝向萬點，央行緊縮後泡沫破裂
    if (bubble) { const f = d / DAYS; idx += (f <= 0.42 ? 0.011 : f <= 0.52 ? 0 : -0.028) * kb; if (f > 0.42 && f <= 0.62) vol *= 1.3; }
    for (const e of events) { const k = d - e.day; if (k >= 0 && k < e.def.dur) { const f = e.def.eff(k); idx += f.idx || 0; vol *= f.vol || 1; if (f.thin) th = true; if (e.id === 'typhoon') storm = true; for (const s in f.sec || {}) sec[s] = (sec[s] || 0) + f.sec[s]; for (const s in f.st || {}) sty[s] = (sty[s] || 0) + f.st[s]; if (e.def.us) evUs += e.def.us(k); if (e.def.usHead && e.def.usHead(k)) head = e.def.usHead(k); if (e.id === 'crash' && k === 0) { evUs += -0.2; head = '華爾街大崩盤　道瓊單日重挫逾兩成'; } if (e.id === 'gulf' && k === 0) { evUs += -0.025; head = '伊拉克入侵科威特　油價飆漲、美股下跌'; } } }
    const u = gauss(r) * 0.009 + evUs; us.push(u); nas.push(u * 1.25 + gauss(r) * 0.004);
    usHead.push(head || (u > 0.004 ? pickR(r, US_UP) : u < -0.004 ? pickR(r, US_DN) : pickR(r, US_FLAT)));
    const jk = (MU[regime] + idx) * 0.8 + 0.45 * Math.max(-0.08, u); jp.push(jk * 0.7 + gauss(r) * 0.004); kr.push(jk * 0.75 + gauss(r) * 0.005);
    raw.push(STOCKS.map((s, i) => {
      let x = s.beta * (MU[regime] + idx + 0.45 * Math.max(-0.08, u)) + (sec[s.sector] || 0) + (sty[s.st] || 0) + gauss(r) * s.vol * VOL_K * (Math.abs(idx) > 0.04 ? 0.35 : 1) * vol;
      for (const p of pumps) if (p.stock === s.id) { const k = d - p.day; if (k >= 0 && k <= 2) x += 0.06; if (k === 3 || k === 4) x -= 0.05; }
      return x;
    }));
    thin.push(th);
    const w = r(), prevW = weather[d - 1];
    weather.push(storm ? 'storm' : (w < 0.03 && prevW !== 'typhoon' && events.every(e => d < e.day || d >= e.day + e.def.dur)) ? 'typhoon' : w < 0.45 ? 'sun' : w < 0.75 ? 'cloud' : 'rain');
    temp.push(Math.round(24 + r() * 9));
  }
  SEASON = { seed, events, pumps, raw, thin, weather, temp, us, nas, jp, kr, usHead, real: {} };
  rebuildSeason();
  return SEASON;
}
// 天氣：晴天心情好、下雨人潮少；颱風假休市（影響幅度刻意做得很小）
const WEATHER = {
  sun: { name: '晴', mood: 0.0015 }, cloud: { name: '陰', mood: 0 }, rain: { name: '雨', mood: -0.002, thin: true },
  storm: { name: '豪雨', mood: -0.004, thin: true }, typhoon: { name: '颱風', closed: true },
};
const isClosed = d => !!(WEATHER[SEASON.weather[d]] || {}).closed;
function rebuildSeason() {
  const S2 = SEASON, close = [STOCKS.map(s => s.p0)], ret = [STOCKS.map(() => 0)], limit = [{ up: LIMIT, dn: LIMIT, ns: false }], policy = [];
  const base0 = STOCKS.reduce((a, s) => a + s.cap * s.p0, 0), idx = [IDX_BASE];
  let base = LIMIT, emUntil = 0, reformed = false;
  for (let d = 1; d <= DAYS; d++) {
    const rp = mulberry32(S2.seed * 31 + d * 7);
    if (!reformed && d > 4 && rp() < 0.012) { reformed = true; base = 0.10; policy.push({ day: d, id: 'reform10' }); }
    if (d >= 3 && d > emUntil && idx[d - 1] / idx[d - 3] - 1 < -0.11 && rp() < 0.45) { emUntil = d + 4; policy.push({ day: d, id: 'limitdown' }); }
    const L = { up: base, dn: d <= emUntil ? 0.035 : base, ns: d <= emUntil }; limit.push(L);
    const W = WEATHER[S2.weather[d]], prev = close[d - 1];
    if (W.closed) { close.push(prev.slice()); ret.push(STOCKS.map(() => 0)); }
    else {
      close.push(prev.map((p, i) => { const [up, dn] = limitsL(p, L); return clamp(roundTick(p * (1 + clamp(S2.raw[d][i] + STOCKS[i].beta * W.mood, -L.dn, L.up))), dn, up); }));
      ret.push(close[d].map((p, i) => p / prev[i] - 1));
    }
    idx.push(IDX_BASE * close[d].reduce((a, p, i) => a + STOCKS[i].cap * p, 0) / base0);
  }
  S2.close = close; S2.ret = ret; S2.index = idx; S2.limit = limit; S2.policy = policy;
}
function limitOf(d) { return (SEASON && SEASON.limit && SEASON.limit[d]) || { up: LIMIT, dn: LIMIT, ns: false }; }
function limitsL(p, L) { let up = roundTick(p * (1 + L.up)), dn = roundTick(p * (1 - L.dn)); if (up > p * (1 + L.up) + 1e-9) up -= tick(p); if (dn < p * (1 - L.dn) - 1e-9) dn += tick(p); return [up, dn]; }
// 即時天氣（Open-Meteo，台北）。Claude 的預覽頁面會擋外部連線，失敗時就沿用模擬天氣。
function wmoToWeather(code, wind) {
  if (wind >= 62) return 'typhoon';
  if (code >= 95 || (code >= 65 && code <= 67) || code === 82) return 'storm';
  if ((code >= 51 && code <= 64) || (code >= 80 && code <= 81)) return 'rain';
  if (code >= 2) return 'cloud';
  return 'sun';
}
async function fetchRealWeather() {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=25.05&longitude=121.52&current=temperature_2m,weather_code,wind_speed_10m&timezone=Asia%2FTaipei';
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 6000);
  try { const r = await fetch(url, { signal: ctl.signal }); const j = await r.json(); const c = j.current; return { w: wmoToWeather(c.weather_code, c.wind_speed_10m), t: Math.round(c.temperature_2m) }; }
  catch (e) { return null; } finally { clearTimeout(tm); }
}
function limits(p, d) { return limitsL(p, limitOf(d === undefined ? (typeof S !== 'undefined' && S ? S.day : 1) : d)); }
// 盤中走勢：從開盤走到收盤的布朗橋，漲跌停時常常一開盤就鎖住
function genIntraday(d) {
  const r = mulberry32(SEASON.seed * 7 + d * 131);
  return STOCKS.map((s, i) => {
    const prev = SEASON.close[d - 1][i], cl = SEASON.close[d][i], [up, dn] = limits(prev, d);
    const locked = (cl >= up || cl <= dn) && r() < 0.65;
    const open = locked ? cl : clamp(roundTick(prev + (cl - prev) * (0.2 + r() * 0.4) + gauss(r) * prev * 0.004), dn, up);
    const path = []; let w = 0; const steps = [];
    for (let k = 0; k < TICKS; k++) { w += gauss(r); steps.push(w); }
    for (let k = 0; k <= TICKS; k++) {
      const t = k / TICKS, b = k === 0 ? 0 : (steps[k - 1] - t * steps[TICKS - 1]) * prev * s.vol * 0.12;
      path.push(k === TICKS ? cl : clamp(roundTick(open + (cl - open) * t + b), dn, up));
    }
    return path;
  });
}
const idxOf = prices => IDX_BASE * prices.reduce((a, p, i) => a + STOCKS[i].cap * p, 0) / STOCKS.reduce((a, s) => a + s.cap * s.p0, 0);

/* ---------- 消息 ---------- */
const TIP_UP = ['{n}有人在偷偷吃貨，明天應該會漲。', '我有朋友在{n}上班，說接到大訂單，明天會漲啦！', '{n}的線型很漂亮，明天要攻上去了。', '聽說有人要拉{n}，明天買就對了。'];
const TIP_DN = ['{n}的大股東在倒貨，明天小心。', '{n}好像出了狀況，明天恐怕會跌。', '我看{n}漲不動了，明天要回檔。', '聽說{n}的訂單被砍，明天會跌喔。'];
function pickR(r, a) { return a[r() * a.length | 0]; }
// 明牌多半講的是「有動靜的股票」：隔天漲跌越大，越容易被人拿出來講
function pickTip(r, pool, d) {
  const nx = SEASON.ret[d + 1], w = pool.map(s => 0.0015 + Math.abs(nx[STOCKS.indexOf(s)]));
  let t = r() * w.reduce((a, b) => a + b, 0);
  for (let k = 0; k < pool.length; k++) { t -= w[k]; if (t <= 0) return pool[k]; }
  return pool[pool.length - 1];
}
function makeRumor(npc, d) {
  const r = mulberry32(SEASON.seed * 1000 + d * 37 + npc.idx * 101);
  for (const e of SEASON.events) {
    if (d >= e.day - e.def.pre && d < e.day) {
      const h = e.def.hints.filter(x => x[0] === npc.role);
      if (h.length && r() < npc.rel + 0.1) return { kind: 'event', ev: e.id, text: pickR(r, h)[1], truth: true, resolve: e.day };
    }
  }
  if (r() < (1 - npc.rel) * 0.35) {
    const soon = SEASON.events.filter(e => e.day >= d && e.day <= d + 6).map(e => e.id);
    const fake = EVENTS.filter(e => !soon.includes(e.id) && e.hints.some(h => h[0] === npc.role || npc.role === 'auntie' || npc.role === 'taxi'));
    if (fake.length) { const e = pickR(r, fake); return { kind: 'event', ev: null, evName: e.name, text: pickR(r, e.hints)[1], truth: false, resolve: Math.min(DAYS, d + 3) }; }
  }
  if (d + 1 > DAYS) return null;
  const pool = npc.sectors ? STOCKS.filter(s => npc.sectors.includes(s.sector)) : STOCKS;
  const s = pickTip(r, pool, d), i = STOCKS.indexOf(s), act = SEASON.ret[d + 1][i] >= 0 ? 1 : -1;
  const dir = r() < npc.rel ? act : -act;
  return { kind: 'tip', stock: s.id, dir, text: pickR(r, dir > 0 ? TIP_UP : TIP_DN).replace('{n}', s.name), resolve: d + 1 };
}
function resolveRumors(d) {
  let ok = 0, no = 0;
  for (const m of S.rumors) {
    if (m.st || m.resolve !== d) continue;
    if (m.kind === 'tip') { const i = STOCKS.findIndex(s => s.id === m.stock); const real = SEASON.ret[d][i]; m.st = real === 0 ? 'no' : (real > 0 ? 1 : -1) === m.dir ? 'ok' : 'no'; }
    else m.st = m.truth ? 'ok' : 'no';
    m.st === 'ok' ? ok++ : no++;
  }
  return [ok, no];
}
