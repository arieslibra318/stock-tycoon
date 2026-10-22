/* =========================================================
   mobile：窄螢幕的看盤卡片、任務提示收合、上方按鈕收進「更多」選單
   ========================================================= */
const NARROW = () => innerWidth <= 640;
let chOpen = false;
// 窄螢幕把表格改成卡片時，每一格前面要有標題
function labelCells(html, mode) {
  const L = { cash: ['持有', '均價', '損益'], mar: ['融資', '均價', '損益', '維持率'], sht: ['融券', '均價', '損益', '維持率'] }[mode]; let k = 0;
  return html.replace(/<td/g, () => `<td data-l="${L[k++] || ''}"`);
}

/* ---------- 任務提示：可以收合（手機預設收起，只露出第一項） ---------- */
const GOALS_KEY = 'stock-tycoon-goals-fold';
function goalsFolded() { try { const v = localStorage.getItem(GOALS_KEY); if (v !== null) return v === '1'; } catch (e) { } return NARROW() || innerHeight <= 500; }
function toggleGoals() { const f = !goalsFolded(); try { localStorage.setItem(GOALS_KEY, f ? '1' : '0'); } catch (e) { } }
function goalsHead(list) { const f = goalsFolded(); return `<button class="gHead" data-gh aria-expanded="${!f}" title="${f ? '展開' : '收起'}任務提示"><b>任務提示</b><span class="gCnt">${list.length}</span><span class="gArr">${f ? '▸' : '▾'}</span></button>`; }
function goalsPeek(list) { return list[0] ? `<div class="gPeek">${list[0].text().replace(/<[^>]+>/g, '')}</div>` : ''; }

/* ---------- 上方按鈕：手機只留常用的，其他收進「更多」 ---------- */
function buildMore() {
  const b = document.createElement('button'); b.className = 'ib'; b.id = 'bMore'; b.title = '更多'; b.setAttribute('aria-label', '更多功能'); b.setAttribute('aria-expanded', 'false');
  b.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2.2" fill="#2b2622"/><circle cx="12" cy="12" r="2.2" fill="#2b2622"/><circle cx="19" cy="12" r="2.2" fill="#2b2622"/></svg>';
  $('tr').appendChild(b);
  const m = document.createElement('div'); m.id = 'moreMenu'; m.className = 'paper hide'; $('hud').appendChild(m);
  const close = () => { m.classList.add('hide'); b.setAttribute('aria-expanded', 'false'); };
  const items = [['alloc', '資產配置', () => openLife('alloc')], ['map', '城市地圖', () => toggleMap()], ['snd', '', () => cycleSound()], ['save', '存檔與讀檔', () => openSaves()], ['help', '說明與設定', () => openHelp()], ['pow', '', () => setPower(!POWER)], ['full', '', () => toggleFull()]];
  const label = k => k === 'snd' ? `聲音：${S.music || S.sfx ? '開' : '關'}` : k === 'pow' ? `省電模式：${POWER ? '開' : '關'}` : k === 'full' ? (document.fullscreenElement ? '離開全螢幕' : '全螢幕') : items.find(i => i[0] === k)[1];
  const render = () => { m.innerHTML = `<div class="mmInfo">今日步數 ${Math.floor(S.stepsDay || 0).toLocaleString('zh-TW')} 步</div>` + items.filter(([k]) => k !== 'full' || document.fullscreenEnabled).map(([k]) => `<button data-mm="${k}">${label(k)}</button>`).join(''); m.querySelectorAll('[data-mm]').forEach(x => x.onclick = e => { e.stopPropagation(); const it = items.find(i => i[0] === x.dataset.mm); close(); it[2](); }); };
  b.onclick = e => { e.stopPropagation(); if (m.classList.contains('hide')) { render(); m.classList.remove('hide'); b.setAttribute('aria-expanded', 'true'); } else close(); };
  addEventListener('pointerdown', e => { if (!m.contains(e.target) && e.target !== b && !b.contains(e.target)) close(); });
}

/* ---------- 點名字標籤：自動走過去說話 ---------- */
let AUTO = null;
function autoGo(t) { AUTO = Object.assign({ best: Infinity, last: performance.now() }, t); }
function tapTalk(n) {
  if (GAME.busy || GAME.mode !== 'ground') return;
  if (angDist(PL.dir, n.dir) < 2.3) return talkTo(n);
  autoGo({ n, reach: 2.0, done: () => { if (!GAME.busy && n.ch.root.visible) talkTo(n); } }); toast(`走過去找${n.name}（推搖桿可以取消）`);
}
function tapEgg(e) {
  if (GAME.busy || GAME.mode !== 'ground') return;
  autoGo({ dir: EGG_SPOTS[e.id], reach: 2.3, done: () => { if (!GAME.busy) eggAct(e.id); } });
}
// 有玩家自己的輸入就取消；走不動超過 2.5 秒也取消
function autoInput(manual) {
  if (!AUTO) return null;
  if (manual || GAME.busy || GAME.mode !== 'ground') { AUTO = null; return null; }
  const dir = AUTO.n ? AUTO.n.dir : AUTO.dir, d = angDist(PL.dir, dir), now = performance.now();
  if (d < AUTO.reach) { const t = AUTO; AUTO = null; setTimeout(() => t.done(), 0); return { x: 0, y: 0, run: false }; }
  if (d < AUTO.best - 0.25) { AUTO.best = d; AUTO.last = now; } else if (now - AUTO.last > 2500) { AUTO = null; toast('前面被擋住了，用搖桿走過去吧'); return null; }
  const up = PL.dir, t = tangentize(dir.clone().sub(up), up), rt = new V3().crossVectors(PL.camF, up);
  return { x: t.dot(rt), y: t.dot(PL.camF), run: d > 6 };
}

/* ---------- 省電模式（手機預設開）：降低解析度、隔一幀畫一次、遠處的人不畫 ---------- */
const POWER_KEY = 'stock-tycoon-power';
let POWER = (() => { try { const v = localStorage.getItem(POWER_KEY); if (v !== null) return v === '1'; } catch (e) { } return IS_TOUCH; })();
function applyPower() { renderer.setPixelRatio(POWER ? 1 : Math.min(devicePixelRatio || 1, IS_TOUCH ? 1.6 : 2)); if (typeof resize === 'function') resize(); }
function setPower(on) { POWER = on; try { localStorage.setItem(POWER_KEY, on ? '1' : '0'); } catch (e) { } applyPower(); toast(on ? '省電模式開啟：畫面解析度降低、比較不燙' : '省電模式關閉：畫面比較細緻'); }

/* ---------- 震動回饋（支援的手機才有） ---------- */
const VIB_KEY = 'stock-tycoon-vib';
let VIB = (() => { try { const v = localStorage.getItem(VIB_KEY); if (v !== null) return v === '1'; } catch (e) { } return true; })();
function buzz(p) { if (VIB && IS_TOUCH && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { } }
function setVib(on) { VIB = on; try { localStorage.setItem(VIB_KEY, on ? '1' : '0'); } catch (e) { } if (on) buzz(60); toast(`震動${on ? '開' : '關'}`); }

/* ---------- 全螢幕 ---------- */
function toggleFull() {
  try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen({ navigationUI: 'hide' }); }
  catch (e) { toast('這個瀏覽器不支援全螢幕，可以改用「加入主畫面」'); }
}
