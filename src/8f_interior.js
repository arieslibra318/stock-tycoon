/* =========================================================
   interior：走到門口進入室內（證券行大廳、住處、居酒屋、銀行）
   室內場景放在星球上方遠處，用固定斜上方的鏡頭看；平面移動、簡單碰撞
   ========================================================= */
const IN_O = new V3(0, 400, 0);
const IN = { id: null, groups: {}, keys: {}, x: 0, z: 0, fx: 0, fz: -1, speed: 0, people: [], spots: [], obs: [], room: null, goal: null, cheerT: 0 };

function txtTex(lines, w, h, bg, fg, size) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((t, i) => { g.font = `900 ${i ? size * 0.55 : size}px ${SIGN_FONT}`; g.fillText(t, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.05); });
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4; return tex;
}
function sign(group, lines, x, y, z, w, h, bg, fg, ry = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: txtTex(lines, 512, Math.round(512 * h / w), bg, fg, 120) }));
  m.position.set(x, y, z); m.rotation.y = ry; group.add(m); return m;
}
// 地板、三面牆、正面矮牆（中間是門），外面一圈深色地面
function shell(gb, w, d, floor, wall) {
  gb.box(60, 0.1, 60, 0x2b2622, 0, -0.3, 0);
  gb.box(w, 0.2, d, floor, 0, -0.1, 0);
  for (let i = -w / 2 + 1; i < w / 2; i += 2) gb.box(0.04, 0.01, d, 0x000000, i, 0.005, 0);
  gb.box(w + 0.6, 4.2, 0.3, wall, 0, 2.1, -d / 2 - 0.15);
  for (const s of [-1, 1]) gb.box(0.3, 4.2, d + 0.6, wall, s * (w / 2 + 0.15), 2.1, 0);
  const seg = (w - 1.8) / 2; for (const s of [-1, 1]) gb.box(seg, 0.7, 0.25, wall, s * (0.9 + seg / 2), 0.35, d / 2 + 0.12);
  gb.box(1.6, 0.03, 0.9, 0x8a3a2e, 0, 0.02, d / 2 - 0.4);
}
function chair(gb, x, z, col, ry = 0) { gb.box(0.5, 0.08, 0.5, col, x, 0.45, z, ry); gb.box(0.5, 0.5, 0.08, col, x - Math.sin(ry) * 0.22, 0.72, z + Math.cos(ry) * 0.22, ry); for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) gb.box(0.05, 0.45, 0.05, 0x555555, x + a, 0.22, z + b); }
function addPerson(room, o) { room.people.push(o); }

/* ---------- 房間定義 ---------- */
const ROOMS = {
  broker: {
    name: '城中證券', w: 12, d: 9, place: 'broker',
    closed: () => PHASE() === 'night' ? '證券行已經打烊了（6:00–18:00 營業）' : null,
    build(g, room) {
      const gb = new GB(), gl = new GB(); shell(gb, room.w, room.d, 0xd9d2c3, 0xe9e1d2);
      // 報價大看板（和門口的看板同一張畫布）
      const bm = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 3.2), new THREE.MeshBasicMaterial({ map: BOARD.tex })); bm.position.set(0, 2.3, -room.d / 2 + 0.13); g.add(bm);
      gb.box(8.6, 3.5, 0.15, 0x2b2622, 0, 2.3, -room.d / 2 + 0.02);
      // 一排排塑膠椅
      const cols = [0xd7263d, 0x2b7f86, 0xf2c14e];
      for (let r = 0; r < 3; r++) for (const x of [-4.2, -3.2, -2.2, -1.2, 1.2, 2.2, 3.2]) chair(gb, x, -1.6 + r * 1.5, cols[(r + (x > 0)) % 3], Math.PI);
      for (let r = 0; r < 3; r++) room.obs.push({ x: -2.7, z: -1.6 + r * 1.5, w: 3.6, d: 0.6 }, { x: 2.2, z: -1.6 + r * 1.5, w: 2.6, d: 0.6 });
      // 營業員櫃檯
      gb.box(1.0, 1.1, 3.6, 0x8f6b48, 4.9, 0.55, -1.2); gb.box(1.1, 0.06, 3.7, 0xf4efe4, 4.9, 1.12, -1.2); room.obs.push({ x: 4.9, z: -1.2, w: 1.2, d: 3.8 });
      for (let k = 0; k < 3; k++) gb.box(0.35, 0.25, 0.3, 0x2b2622, 4.9, 1.28, -2.4 + k * 1.2);
      // 大戶室的門
      gb.box(1.1, 2.5, 0.1, 0x6b4a3a, -5.2, 1.25, -room.d / 2 + 0.06); gb.cyl(0.06, 0.06, 0.05, 0xf2c14e, -4.8, 1.25, -room.d / 2 + 0.12, 8, Math.PI / 2);
      for (const x of [-4.5, 4.5]) gl.box(1.6, 0.08, 0.6, 0xfff6d0, x, 4.1, 0);
      g.add(gb.mesh(true)); g.add(new THREE.Mesh(gl.geometry(), GLOW));
      sign(g, ['城中證券', '營業大廳'], -room.w / 2 + 0.02, 3.1, 0.5, 3.2, 0.6, '#c8402f', '#ffe8a8', Math.PI / 2);
      sign(g, ['大戶室'], -5.2, 2.75, -room.d / 2 + 0.13, 1.0, 0.32, '#2b2622', '#ffd27a');
      sign(g, ['營業櫃檯'], 4.9, 2.2, 0.75, 1.4, 0.4, '#1f4f9a', '#ffffff', -Math.PI / 2);
      // 坐著盯盤的人（裝飾，會跟著行情歡呼或嘆氣）
      const looks = ['auntie1', 'auntie2', 'auntie3', 'oldhand', 'chess', 'ped4', 'ped2', 'landlady', 'kiosk'];
      [[-4.2, 0], [-2.2, 0], [1.2, 0], [3.2, 0], [-3.2, 1], [2.2, 1], [-1.2, 2], [1.2, 2], [3.2, 2]].forEach(([x, r], k) => addPerson(room, { look: looks[k], x, z: -1.6 + r * 1.5 - 0.05, face: Math.PI, sit: true, crowd: true }));
      addPerson(room, { npc: 'broker', x: 5.55, z: -1.2, face: -Math.PI / 2 });
      room.spots.push({ x: 4.15, z: -1.2, r: 1.2, verb: '和營業員小美說話（下單）', label: '營業櫃檯', act: () => talkTo(NPC_BY.broker) });
      room.spots.push({ x: 0, z: -3.6, r: 1.3, verb: '看報價看板', label: '報價看板', act: () => openTrade(true) });
      room.spots.push({ x: -5.1, z: -3.7, r: 1.0, verb: '進大戶室', label: '大戶室', act: vipRoom });
    },
  },
  home: {
    name: '住處', place: 'home', get w() { return [6, 8, 10, 13][houseTier()]; }, get d() { return [5, 6, 7, 9][houseTier()]; },
    key: () => houseTier(),
    build(g, room) {
      const t = houseTier(), w = room.w, d = room.d, gb = new GB(), gl = new GB();
      shell(gb, w, d, [0xb99b74, 0xc9b28c, 0xd6c3a0, 0xe9e1d2][t], [0xd8cdb4, 0xe6dcc8, 0xf0e8d6, 0xf6f1e6][t]);
      // 床、書桌、牆上的戰績板
      gb.box(1.6, 0.45, 2.2, 0x6b4a3a, -w / 2 + 1.1, 0.22, -d / 2 + 1.3); gb.box(1.5, 0.15, 2.1, 0xf4efe4, -w / 2 + 1.1, 0.52, -d / 2 + 1.3); gb.box(1.5, 0.18, 0.5, 0x7fb3d6, -w / 2 + 1.1, 0.66, -d / 2 + 0.45);
      room.obs.push({ x: -w / 2 + 1.1, z: -d / 2 + 1.3, w: 1.8, d: 2.4 });
      gb.box(1.4, 0.75, 0.7, 0x8f6b48, w / 2 - 1.1, 0.38, -d / 2 + 0.55); gb.box(0.35, 0.3, 0.3, 0x2b2622, w / 2 - 1.3, 0.9, -d / 2 + 0.5); room.obs.push({ x: w / 2 - 1.1, z: -d / 2 + 0.55, w: 1.6, d: 0.9 });
      gb.box(1.6, 1.0, 0.06, 0x2b2622, 0, 2.2, -d / 2 + 0.03); gb.box(1.45, 0.85, 0.07, 0xf3e7cc, 0, 2.2, -d / 2 + 0.04);
      if (t >= 1) { gb.box(0.25, 0.12, 0.2, 0xd7263d, w / 2 - 0.8, 0.82, -d / 2 + 0.55); }                                   // 家用電話
      if (t >= 2) { gb.box(2.2, 0.5, 0.9, 0x5a3b2a, 0, 0.25, 0.6); gb.box(2.2, 0.5, 0.2, 0x5a3b2a, 0, 0.6, 1.0); room.obs.push({ x: 0, z: 0.7, w: 2.4, d: 1.1 }); } // 沙發
      if (t >= 3) { gb.box(1.6, 1.1, 0.6, 0x111111, -w / 2 + 1.2, 0.55, d / 2 - 1.6); room.obs.push({ x: -w / 2 + 1.2, z: d / 2 - 1.6, w: 1.8, d: 0.8 }); gl.sph(0.5, 0xfff2b0, 0, 3.6, 0, 1.4, 0.6, 1.4, 8); gb.cyl(0.03, 0.03, 0.6, 0xc8a02f, 0, 3.95, 0); } // 鋼琴、水晶燈
      for (let k = 0; k < [1, 1, 2, 3][t]; k++) gb.box(1.2, 1.2, 0.05, 0x9fd6e8, -w / 2 + 2.8 + k * 2.4, 2.2, -d / 2 + 0.03);  // 窗
      g.add(gb.mesh(true)); g.add(new THREE.Mesh(gl.geometry(), GLOW));
      sign(g, ['我的戰績', '成就・公司圖鑑'], 0, 2.2, -d / 2 + 0.12, 1.4, 0.8, '#f3e7cc', '#2b2622');
      room.spots.push({ x: -w / 2 + 1.1, z: -d / 2 + 2.8, r: 1.2, verb: '睡覺（跳到明天）', label: '床', act: sleepNow });
      room.spots.push({ x: w / 2 - 1.1, z: -d / 2 + 1.4, r: 1.1, verb: t >= 1 ? '打電話給營業員（下單）' : '存檔與讀檔', label: t >= 1 ? '電話・書桌' : '書桌', act: () => t >= 1 ? homeDesk() : openSaves() });
      room.spots.push({ x: 0, z: -d / 2 + 1.2, r: 1.1, verb: '看成就與公司圖鑑', label: '戰績板', act: () => { noteTab = 'ach'; openNotes(); } });
    },
  },
  izakaya: {
    name: '月見居酒屋', w: 9, d: 7, place: 'izakaya',
    closed: () => PHASE() !== 'night' ? '居酒屋還在準備中，晚上 6 點才開門' : null,
    build(g, room) {
      const gb = new GB(), gl = new GB(); shell(gb, room.w, room.d, 0x6b4a3a, 0x8f6b48);
      gb.box(6, 1.05, 0.8, 0x5a3b2a, 0, 0.52, -1.8); gb.box(6.2, 0.06, 0.95, 0xc9a26b, 0, 1.08, -1.8); room.obs.push({ x: 0, z: -1.8, w: 6.2, d: 1.0 });
      for (let k = 0; k < 6; k++) { gb.cyl(0.22, 0.22, 0.08, 0xd7263d, -2.5 + k, 0.7, -1.0, 10); gb.cyl(0.04, 0.04, 0.7, 0x333333, -2.5 + k, 0.35, -1.0, 6); }
      for (let k = 0; k < 8; k++) gb.box(0.18, 0.5, 0.18, [0x2b7f86, 0xf4efe4, 0x5f9e6a][k % 3], -3 + k * 0.85, 1.6, -room.d / 2 + 0.25);
      gb.box(1.4, 0.75, 1.4, 0x5a3b2a, 2.6, 0.38, 1.6); room.obs.push({ x: 2.6, z: 1.6, w: 1.6, d: 1.6 });
      for (const x of [-3, -1, 1, 3]) gl.sph(0.28, 0xff4a2a, x, 3.2, 0, 1, 1.3, 1, 8);
      g.add(gb.mesh(true)); g.add(new THREE.Mesh(gl.geometry(), GLOW));
      sign(g, ['月見'], 0, 3.0, -room.d / 2 + 0.05, 1.6, 0.6, '#2b2622', '#ffd27a');
      addPerson(room, { npc: 'mama', x: 0, z: -2.7, face: 0 });
      addPerson(room, { npc: 'whale', x: 2.6, z: 2.5, face: Math.PI, sit: true });
      addPerson(room, { look: 'ped2', x: -1.5, z: -1.0, face: Math.PI, sit: true, crowd: true }); addPerson(room, { look: 'builder', x: -2.5, z: -1.0, face: Math.PI, sit: true, crowd: true });
    },
  },
  bank: {
    name: '寶島銀行', w: 11, d: 8, place: 'bank',
    closed: () => TIME.min < 9 * 60 || TIME.min >= 15.5 * 60 ? '銀行營業時間是 9:00–15:30' : null,
    build(g, room) {
      const gb = new GB(), gl = new GB(); shell(gb, room.w, room.d, 0xc9c6bf, 0xe8e4da);
      gb.box(8, 1.15, 0.8, 0x6b6a66, 0, 0.58, -2.2); gb.box(8.2, 0.06, 0.95, 0xe8e4da, 0, 1.18, -2.2); room.obs.push({ x: 0, z: -2.2, w: 8.4, d: 1.0 });
      for (let k = 0; k < 4; k++) gb.box(0.05, 0.9, 0.9, 0x9fd6e8, -3 + k * 2, 1.65, -2.2);
      for (const x of [-4, 4]) { gb.cyl(0.35, 0.4, 4, 0xf4efe4, x, 2, 1.5, 12); room.obs.push({ x, z: 1.5, w: 0.8, d: 0.8 }); }
      gb.box(1.6, 0.5, 0.5, 0x5a3b2a, 0, 0.25, 1.2); room.obs.push({ x: 0, z: 1.2, w: 1.7, d: 0.6 });
      for (const x of [-3, 3]) gl.box(2, 0.08, 0.6, 0xfff6d0, x, 4.1, 0);
      g.add(gb.mesh(true)); g.add(new THREE.Mesh(gl.geometry(), GLOW));
      sign(g, ['寶島銀行'], 0, 3.4, -room.d / 2 + 0.05, 2.6, 0.55, '#1f4f9a', '#ffffff');
      sign(g, ['定存・黃金・房貸'], 0, 2.4, -room.d / 2 + 0.05, 2.6, 0.4, '#f4efe4', '#1f4f9a');
      [-3, -1, 1, 3].forEach((x, k) => addPerson(room, { look: k % 2 ? 'phone' : 'banker', x, z: -2.95, face: 0, teller: true }));
      room.spots.push({ x: -1, z: -1.4, r: 1.6, verb: '辦理定存、黃金、房貸', label: '服務櫃檯', act: () => openLife('bank') });
    },
  },
};

/* ---------- 進出 ---------- */
function roomDoorDir(id) { const p = PLACE_BY[ROOMS[id].place]; return p && slot(p.road, p.s, p.side, 3.9).dir; }
function doorNear(best) {
  if (GAME.mode !== 'ground') return best;
  const bd = best ? angDist(PL.dir, best.dir) : 99;
  for (const id in ROOMS) { const d = roomDoorDir(id); if (!d) continue; const dd = angDist(PL.dir, d); if (dd < 1.25 && dd < bd) return { door: id, verb: `進入${ROOMS[id].place === 'home' ? HOUSES[houseTier()].place : ROOMS[id].name}`, act: () => enterInterior(id) }; }
  return best;
}
function buildRoom(id) {
  const R0 = ROOMS[id], key = R0.key ? R0.key() : 0, old = IN.groups[id];
  if (old && old.userData.key === key) return old;
  if (old) { scene.remove(old); old.userData.people.forEach(p => p.ch && scene.remove(p.ch.root)); }
  const g = new THREE.Group(); g.position.copy(IN_O); g.userData.key = key;
  const room = { w: R0.w, d: R0.d, people: [], spots: [], obs: [] }; R0.build(g, room);
  for (const p of room.people) {
    const L = Object.assign({}, p.npc ? LOOKS[NPC_BY[p.npc].look] : LOOKS[p.look]); delete L.hold;
    p.ch = new Character(L); if (p.sit) p.ch.mode = 'sit'; g.add(p.ch.root); p.ch.root.position.set(p.x, 0, p.z); p.ch.root.rotation.y = p.face;
  }
  g.userData.room = room; g.userData.people = room.people; scene.add(g); IN.groups[id] = g; return g;
}
async function enterInterior(id) {
  const R0 = ROOMS[id]; if (!R0 || GAME.busy) return; const why = R0.closed && R0.closed(); if (why) { toast(why); return; }
  GAME.busy = true; $('fade').style.opacity = 1; await wait(320);
  const g = buildRoom(id); for (const k in IN.groups) IN.groups[k].visible = k === id;
  const room = g.userData.room; Object.assign(IN, { id, room, people: room.people, spots: room.spots, obs: room.obs, x: 0, z: room.d / 2 - 0.9, fx: 0, fz: -1, speed: 0, goal: null });
  GAME.mode = 'interior'; interiorCamera(1, true); refreshNear();
  $('fade').style.opacity = 0; GAME.busy = false; sfx('blip'); if (R0.onEnter) R0.onEnter();
}
function exitInterior(quick) {
  if (GAME.mode !== 'interior') return; const id = IN.id, d = roomDoorDir(id), p = PLACE_BY[ROOMS[id].place];
  if (IN.groups[id]) IN.groups[id].visible = false; IN.id = null; GAME.mode = 'ground';
  if (d && p) { const out = slot(p.road, p.s, p.side, 2.6).dir; setPlayerAt(out, slot(p.road, p.s, p.side, 0).dir); groundCam(_cg); camera.position.copy(_cg.pos); CAM.look.copy(_cg.look); camera.up.copy(_cg.up); }
  if (!quick) sfx('blip');
}
const refreshNear = () => { NEAR = interiorNear(); };

/* ---------- 室內每一幀 ---------- */
function interiorNear() {
  if (GAME.mode !== 'interior' || GAME.busy) return null; let best = null, bd = 9;
  for (const s of IN.spots) { const d = Math.hypot(IN.x - s.x, IN.z - s.z); if (d < s.r && d < bd) { bd = d; best = s; } }
  for (const p of IN.people) { if (!p.npc || !p.ch.root.visible) continue; const d = Math.hypot(IN.x - p.x, IN.z - p.z); if (d < 1.5 && d < bd) { const n = NPC_BY[p.npc]; bd = d; best = { verb: `和${n.name}說話`, act: () => talkTo(n) }; } }
  if (Math.abs(IN.x) < 0.9 && IN.z > IN.room.d / 2 - 1.1 && !best) best = { verb: '離開', act: () => exitInterior() };
  return best;
}
function interiorUpdate(dt) {
  let inp = GAME.busy ? { x: 0, y: 0, run: false } : moveInput();
  if (IN.goal && !GAME.busy) { if (Math.hypot(inp.x, inp.y) > 0.05) IN.goal = null; else { const dx = IN.goal.x - IN.x, dz = IN.goal.z - IN.z, d = Math.hypot(dx, dz); if (d < 1.0) { const g = IN.goal; IN.goal = null; setTimeout(g.done, 0); } else inp = { x: dx / d, y: -dz / d, run: false }; } }
  const mag = Math.min(1, Math.hypot(inp.x, inp.y)), tgt = mag > 0.05 ? (inp.run ? 5 : 3.2) * mag : 0;
  IN.speed = lerp(IN.speed, tgt, 1 - Math.exp(-dt * 10));
  if (mag > 0.05) { const fx = inp.x / Math.max(mag, 1e-6), fz = -inp.y / Math.max(mag, 1e-6), k = 1 - Math.exp(-dt * 12); IN.fx += (fx - IN.fx) * k; IN.fz += (fz - IN.fz) * k; const l = Math.hypot(IN.fx, IN.fz) || 1; IN.fx /= l; IN.fz /= l; }
  if (IN.speed > 0.05) {
    const r = IN.room; let nx = IN.x + IN.fx * IN.speed * dt, nz = IN.z + IN.fz * IN.speed * dt;
    if (nz > r.d / 2 - 0.15 && Math.abs(nx) < 0.9) { exitInterior(); return; }
    nx = clamp(nx, -r.w / 2 + 0.35, r.w / 2 - 0.35); nz = clamp(nz, -r.d / 2 + 0.35, r.d / 2 - 0.3);
    for (const o of IN.obs) { const hx = o.w / 2 + 0.3, hz = o.d / 2 + 0.3, ox = nx - o.x, oz = nz - o.z; if (Math.abs(ox) < hx && Math.abs(oz) < hz) { if (hx - Math.abs(ox) < hz - Math.abs(oz)) nx = o.x + Math.sign(ox || 1) * hx; else nz = o.z + Math.sign(oz || 1) * hz; } }
    IN.x = nx; IN.z = nz;
  }
  PL.ch.root.position.set(IN_O.x + IN.x, IN_O.y, IN_O.z + IN.z); PL.ch.root.rotation.set(0, Math.atan2(IN.fx, IN.fz), 0); PL.ch.root.scale.setScalar(1);
  PL.ch.speed = IN.speed / 5; PL.ch.update(dt, GAME.t);
  // 盯盤的人跟著行情反應
  IN.cheerT -= dt; const mood = marketMood();
  for (const p of IN.people) {
    if (p.npc) { const n = NPC_BY[p.npc]; p.ch.root.visible = !(n.night && PHASE() !== 'night'); p.ch.say(DLG.active && DLG.who === n); }
    if (p.crowd && IN.cheerT < 0 && PHASE() === 'open' && Math.random() < 0.3) { if (mood > 0.015) p.ch.wave = 1.8; }
    p.ch.update(dt, GAME.t);
  }
  if (IN.cheerT < 0) { IN.cheerT = 4; if (IN.id === 'broker' && PHASE() === 'open') { const c = IN.people.filter(p => p.crowd); const p = c[Math.random() * c.length | 0]; if (p) IN.bubble = { p, t: 3, txt: mood > 0.02 ? '漲停啦！發了發了！' : mood > 0.004 ? '紅通通，好看！' : mood < -0.02 ? '跌停了……我的買菜錢！' : mood < -0.004 ? '唉，又綠了。' : '今天怎麼這麼悶？' }; } }
  if (IN.bubble) IN.bubble.t -= dt;
}
function interiorCamera(dt, snap) {
  // 鏡頭在房間前上方，往裡面看；人往後走時鏡頭跟著往後，後牆的看板一直在畫面上方
  const r = IN.room, zc = clamp(IN.z, -r.d / 2 + 2, r.d / 2), tp = new V3(IN_O.x + IN.x * 0.45, IN_O.y + 6.2 + r.d * 0.24, IN_O.z + zc + 8 + r.d * 0.5), tl = new V3(IN_O.x + IN.x * 0.6, IN_O.y + 1.6, IN_O.z + zc - 3);
  if (snap) { camera.position.copy(tp); CAM.look.copy(tl); } else { camera.position.lerp(tp, 1 - Math.exp(-dt * 6)); CAM.look.lerp(tl, 1 - Math.exp(-dt * 8)); }
  camera.up.set(0, 1, 0); camera.lookAt(CAM.look);
}
function interiorLighting() {
  sun.position.set(IN_O.x + 4, IN_O.y + 12, IN_O.z + 7); sun.target.position.copy(IN_O); sun.intensity = 0.7; sun.color.setHex(0xfff1d8);
  hemi.position.set(0, 1, 0); hemi.intensity = 0.6;
}
function interiorLabels(proj) {
  const lab = (pos, text, cls2, click) => { const p = proj(pos); if (p) lbl(text, cls2, p[0], p[1], click); };
  for (const p of IN.people) {
    if (!p.npc || !p.ch.root.visible) continue; const n = NPC_BY[p.npc], fresh = n.rel && S.talked[n.id] !== S.day;
    lab(new V3(IN_O.x + p.x, IN_O.y + (p.sit ? 1.7 : 2.1), IN_O.z + p.z), (fresh ? '● ' : '') + n.name + (n.rel && hearts(n.id) ? ' ' + '♥'.repeat(hearts(n.id)) : ''), fresh ? 'q tap' : 'tap', () => goTo(p.x, p.z + (p.face === 0 ? 1.1 : 0), () => talkTo(n)));
  }
  for (const s of IN.spots) if (Math.hypot(IN.x - s.x, IN.z - s.z) < 5) lab(new V3(IN_O.x + s.x, IN_O.y + 1.4, IN_O.z + s.z), s.label, 'goal tap', () => goTo(s.x, s.z, s.act));
  if (IN.bubble && IN.bubble.t > 0) lab(new V3(IN_O.x + IN.bubble.p.x, IN_O.y + 1.9, IN_O.z + IN.bubble.p.z), IN.bubble.txt, 'q');
  lab(new V3(IN_O.x, IN_O.y + 0.9, IN_O.z + IN.room.d / 2 - 0.2), '出口', 'tap', () => goTo(0, IN.room.d / 2 - 0.5, () => exitInterior()));
}
function goTo(x, z, done) { if (GAME.busy) return; if (Math.hypot(IN.x - x, IN.z - z) < 1.1) return done(); IN.goal = { x, z, done }; }

/* ---------- 房間裡的動作 ---------- */
async function vipRoom() {
  if (S.rank < 3) { toast('大戶室：總資產 1,000 萬以上（大戶）才能進去喝茶'); sfx('bad'); return; }
  GAME.busy = true;
  try {
    const w = NPC_BY.whale;
    await say(null, '（大戶室裡有沙發、冷氣和泡好的老人茶，阿忠正翹著腳看報價。）');
    if (S.talked['vip'] === S.day) { await say(w, '今天聊夠了，晚上居酒屋見。'); return; }
    S.talked['vip'] = S.day; await rumorTalk(w, '喔，你也上來了！大戶室的消息比樓下準多了，聽好——');
    achieve('vip');
  } finally { DLG.hide(); GAME.busy = false; }
}
async function sleepNow() {
  if (PHASE() === 'pre' || PHASE() === 'open') { toast('還沒收盤，先去證券行看看吧'); return; }
  GAME.busy = true; await say(null, '（你躺上床，很快就睡著了。）'); DLG.hide(); GAME.busy = false; await endDay();
}
function homeDesk() { openTrade(true); }

/* ---------- 門口的橘色框：在外面就看得出哪裡可以進去（打烊時變灰） ---------- */
const DOORS = [];
function buildDoorFrames() {
  for (const id in ROOMS) {
    const p = PLACE_BY[ROOMS[id].place]; if (!p) continue;
    const sl = slot(p.road, p.s, p.side, 4.42), m = matFrom(sl.dir, sl.fwd, 0), g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: 0xff8a1f });
    for (const [w, h, x, y] of [[1.95, 0.14, 0, 2.45], [0.14, 2.45, -0.9, 1.22], [0.14, 2.45, 0.9, 1.22]]) { const b = new THREE.Mesh(GEO.box, mat); b.scale.set(w, h, 0.12); b.position.set(x, y, 0); g.add(b); }
    const mt = new THREE.Mesh(GEO.box, new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0.45 })); mt.scale.set(1.7, 0.02, 0.9); mt.position.set(0, 0.04, 0.55); g.add(mt);
    m.decompose(g.position, g.quaternion, _s); scene.add(g); DOORS.push({ id, g, mat, mt, dir: sl.dir });
  }
}
function updateDoorFrames() {
  const pulse = 0.78 + 0.22 * Math.sin(GAME.t * 4);
  for (const d of DOORS) { const shut = !!(ROOMS[d.id].closed && ROOMS[d.id].closed()); d.g.visible = GAME.mode === 'ground' || GAME.mode === 'title'; d.mat.color.setHex(shut ? 0x8a8070 : 0xff8a1f); if (!shut) d.mat.color.multiplyScalar(pulse); d.mt.visible = !shut; }
}
function doorLabels(proj) {
  for (const d of DOORS) {
    if (angDist(PL.dir, d.dir) > 10) continue; const R0 = ROOMS[d.id], shut = R0.closed && R0.closed();
    const p = proj(d.dir.clone().multiplyScalar(R + 2.9)); if (!p) continue;
    const name = R0.place === 'home' ? HOUSES[houseTier()].place : R0.name;
    lbl(shut ? `${name}（${d.id === 'izakaya' ? '晚上營業' : d.id === 'bank' ? '已打烊' : '打烊'}）` : `▶ 可進入${name}`, shut ? '' : 'door tap', p[0], p[1], shut ? null : () => { if (angDist(PL.dir, roomDoorDir(d.id)) < 1.25) enterInterior(d.id); else autoGo({ dir: roomDoorDir(d.id), reach: 1.0, done: () => enterInterior(d.id) }); });
  }
}
