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
function goalsFolded() { try { const v = localStorage.getItem(GOALS_KEY); if (v !== null) return v === '1'; } catch (e) { } return NARROW(); }
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
  const items = [['map', '城市地圖', () => toggleMap()], ['snd', '', () => cycleSound()], ['save', '存檔與讀檔', () => openSaves()], ['help', '說明與設定', () => openHelp()]];
  const render = () => { m.innerHTML = items.map(([k, t]) => `<button data-mm="${k}">${k === 'snd' ? `聲音：${S.music || S.sfx ? '開' : '關'}` : t}</button>`).join(''); m.querySelectorAll('[data-mm]').forEach(x => x.onclick = e => { e.stopPropagation(); const it = items.find(i => i[0] === x.dataset.mm); close(); it[2](); }); };
  b.onclick = e => { e.stopPropagation(); if (m.classList.contains('hide')) { render(); m.classList.remove('hide'); b.setAttribute('aria-expanded', 'true'); } else close(); };
  addEventListener('pointerdown', e => { if (!m.contains(e.target) && e.target !== b && !b.contains(e.target)) close(); });
}
