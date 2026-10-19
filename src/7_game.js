/* =========================================================
   game：狀態、人物、玩家、相機、互動、看盤下單、消息本、一天的流程
   ========================================================= */
const $ = id => document.getElementById(id);
const SAVE_KEY = 'stock-tycoon-v1';
const S0 = () => ({ seed: (Math.random() * 1e9) | 0, day: 1, season: 1, cash: START_CASH, hold: {}, mar: {}, sht: {}, eggs: {}, certs: [], bullSeason: 0, speed: 1, realWx: false, wOver: {}, goalSeen: {}, tradeDay: 0, izDay: 0, notesSeen: false, usedMargin: false, deposit: 0, depDay: 0, ponziGone: false, phone: false, rumors: [], talked: {}, rank: 0, seen: [], dayStartNet: START_CASH, min: 7 * 60, music: false, sfx: false, pos: null, won: false });
let S = S0();
const GAME = { mode: 'title', started: false, busy: false, t: 0, idxTicks: [] };
const MK = { path: null, k: -1, prices: null };
// 不自動存檔：只有玩家自己按的「暫存點」（Q）和 3 個存檔格
const QUICK_KEY = 'stock-tycoon-quick';
function hasSave() { try { return !!localStorage.getItem(QUICK_KEY); } catch (e) { return false; } }
function saveGame() { }
function loadGame() { try { const j = JSON.parse(localStorage.getItem(QUICK_KEY)); const s = j && (j.s || j); if (s && s.seed) { S = Object.assign(S0(), s); return true; } } catch (e) { } return false; }
// 舊版的自動存檔搬進暫存點，避免進度不見
try { const old = localStorage.getItem(SAVE_KEY); if (old && !localStorage.getItem(QUICK_KEY)) localStorage.setItem(QUICK_KEY, old); if (old) localStorage.removeItem(SAVE_KEY); } catch (e) { }

/* ---------- 人物 ---------- */
const LOOKS = {
  me: { skin: '#f6d2b8', hair: 0x2b1d18, hairStyle: 'short', shirt: '#ffffff', necktie: 0xc8402f, pants: 0x4a4a5a, longPants: true, shoe: 0x3a2a22, iris: 'rgba(110,70,40,.9)' },
  broker: { skin: '#ffe1cc', hair: 0x3a2218, hairStyle: 'perm', shirt: '#ffffff', vest: 0x1f4f9a, pants: 0x1f4f9a, skirt: true, lash: true, collar: 0xc8402f, shoe: 0x222222 },
  oldhand: { skin: '#e8be9c', hair: 0xcccccc, hairStyle: 'bald', shirt: '#e6e2d8', shirt2: '#9a8a6a', pattern: 'check', pants: 0x5a5a4a, longPants: true, glasses: 0x333333, wrinkle: true, stache: '#dddddd', brow: '#cccccc', shoe: 0x222222 },
  auntie1: { skin: '#f0c9a8', hair: 0x2b1d18, hairStyle: 'perm', shirt: '#e8789a', shirt2: '#ffffffaa', pattern: 'flower', pants: 0x4a4a6a, longPants: true, hold: 'basket', lash: true, shoe: 0x6b4a3a },
  auntie2: { skin: '#f6d2b8', hair: 0x4a2a1a, hairStyle: 'perm', shirt: '#7fb3d6', shirt2: '#ffffff99', pattern: 'dots', pants: 0x6b4a3a, skirt: true, glasses: 0xc8402f, shoe: 0x333333 },
  auntie3: { skin: '#e9c3a0', hair: 0x222222, hairStyle: 'perm', shirt: '#f2c14e', shirt2: '#c8402f', pattern: 'flower', pants: 0x3a3a4a, longPants: true, shoe: 0x333333 },
  kiosk: { skin: '#e2b490', hair: 0x333333, hairStyle: 'short', hat: 'cap', hatCol: 0x2b7f86, shirt: '#ffffff', pants: 0x4a4a4a, longPants: true, stache: '#333333', shoe: 0x222222 },
  reporter: { skin: '#f0c9a8', hair: 0x2b1d18, hairStyle: 'short', shirt: '#e6dcc8', vest: 0x6b5a3a, pants: 0x3a3a4a, longPants: true, glasses: 0x2b2622, camera: true, shoe: 0x5a3b2a },
  banker: { skin: '#f0c9a8', hair: 0x222222, hairStyle: 'slick', shirt: '#2b3a55', longSleeve: true, necktie: 0xd7263d, pants: 0x2b3a55, longPants: true, glasses: 0x999999, shoe: 0x111111 },
  engineer: { skin: '#ffe1cc', hair: 0x222222, hairStyle: 'short', shirt: '#9fc4dd', collar: 0xffffff, pants: 0x4a5a7a, longPants: true, glasses: 0x333333, freckle: true, shoe: 0xffffff },
  ponzi: { skin: '#e9c3a0', hair: 0x111111, hairStyle: 'slick', shirt: '#c8a02f', longSleeve: true, necktie: 0xc8402f, pants: 0x2b2622, longPants: true, shades: true, shoe: 0x111111 },
  shipping: { skin: '#d9a47e', hair: 0x2b2b2b, hat: 'captain', shirt: '#ffffff', pants: 0x22374f, longPants: true, stache: '#333333', shoe: 0x111111 },
  builder: { skin: '#e8b892', hair: 0x222222, hairStyle: 'slick', shirt: '#7a2e2a', longSleeve: true, pants: 0x2b2622, longPants: true, beard: '#2b2622', scale: 1.08, shoe: 0x111111 },
  boss: { skin: '#e2b490', hair: 0x222222, hairStyle: 'slick', shirt: '#2b2622', shirt2: '#c8a02f', pattern: 'aloha', pants: 0x2b2622, longPants: true, shades: true, stache: '#111111', shoe: 0x111111 },
  vendor: { skin: '#e9c3a0', hair: 0x2b1d18, hairStyle: 'bun', shirt: '#5f9e6a', apron: 0xffffff, pants: 0x4a4a5a, longPants: true, shoe: 0x5f9e6a },
  monk: { skin: '#e9c3a0', hair: 0x9a9a9a, hairStyle: 'bald', shirt: '#8a6a4a', pants: 0x5a4a3a, longPants: true, glasses: 0x333333, wrinkle: true, shoe: 0x222222, pose: 'pray' },
  taxi: { skin: '#d9a47e', hair: 0x222222, hairStyle: 'short', hat: 'cap', hatCol: 0xf2c14e, shirt: '#ffffff', shirt2: '#2b7f86', pattern: 'stripe', pants: 0x3a3a3a, longPants: true, shoe: 0x222222 },
  phone: { skin: '#ffe1cc', hair: 0x3a2218, hairStyle: 'pony', tie: 0xffb000, shirt: '#2b2622', pants: 0x2b2622, skirt: true, lash: true, shoe: 0x222222 },
  landlady: { skin: '#f6d2b8', hair: 0x555555, hairStyle: 'perm', shirt: '#b98cd6', shirt2: '#ffffff88', pattern: 'flower', pants: 0x4a4a5a, longPants: true, wrinkle: true, happyEyes: true, shoe: 0x6b4a3a },
  whale: { skin: '#e2b490', hair: 0x111111, hairStyle: 'slick', shirt: '#ffffff', shirt2: '#c8a02f', pattern: 'stripe', necktie: 0xc8402f, pants: 0x2b2622, longPants: true, happyEyes: true, scale: 1.1, shoe: 0x111111 },
  mama: { skin: '#ffe1cc', hair: 0x2b1d18, hairStyle: 'bun', shirt: '#3b4f7a', shirt2: '#ffffff88', pattern: 'flower', apron: 0xffffff, pants: 0x3b4f7a, skirt: true, lash: true, longSleeve: true, shoe: 0x6b4a3a },
  fortune: { skin: '#e2b490', hair: 0x222222, hairStyle: 'bald', hat: 'cap', hatCol: 0x2b2622, shirt: '#3b3b6a', longSleeve: true, pants: 0x2b2622, longPants: true, glasses: 0x111111, beard: '#333333', wrinkle: true, shoe: 0x111111 },
  busker: { skin: '#e2b490', hair: 0xcccccc, hairStyle: 'bald', shirt: '#e6e2d8', pants: 0x4a4a4a, longPants: true, stache: '#dddddd', brow: '#cccccc', wrinkle: true, happyEyes: true, shoe: 0x333333 },
  yulan: { skin: '#e9c3a0', hair: 0x888888, hairStyle: 'bun', hat: 'cap', hatCol: 0xe8789a, shirt: '#7fb3d6', shirt2: '#ffffff88', pattern: 'flower', pants: 0x4a4a5a, longPants: true, wrinkle: true, happyEyes: true, shoe: 0x6b4a3a },
  shoe: { skin: '#d9a47e', hair: 0x222222, hairStyle: 'short', hat: 'cap', hatCol: 0x6b4a3a, shirt: '#9a8a6a', pants: 0x3a3a3a, longPants: true, apron: 0x6b4a3a, shoe: 0x222222 },
  ped0: { skin: '#f6d2b8', hair: 0x2b1d18, hairStyle: 'short', shirt: '#ffffff', collar: 0x1f4f9a, pants: 0x1f3a6a, longPants: true, backpack: 0x6b4a3a, shoe: 0x111111 },
  ped1: { skin: '#ffe1cc', hair: 0x3a2218, hairStyle: 'twin', tie: 0xffffff, shirt: '#ffffff', collar: 0x2b3a55, pants: 0x2b3a55, skirt: true, lash: true, backpack: 0x2b7f86, shoe: 0x111111 },
  ped2: { skin: '#e8be9c', hair: 0x222222, hairStyle: 'slick', shirt: '#dfe6ee', longSleeve: true, necktie: 0x2b3a55, pants: 0x4a4a5a, longPants: true, glasses: 0x333333, shoe: 0x111111 },
  ped3: { skin: '#f0c9a8', hair: 0x2b1d18, hairStyle: 'perm', shirt: '#e8789a', shirt2: '#ffffff99', pattern: 'dots', pants: 0x5a4a6a, skirt: true, lash: true, shoe: 0xffffff },
  ped4: { skin: '#e2b490', hair: 0xdddddd, hairStyle: 'bald', hat: 'cap', hatCol: 0x5f9e6a, shirt: '#ffffff', pants: 0x5a5a4a, longPants: true, wrinkle: true, stache: '#dddddd', shoe: 0x333333 },
  ped5: { skin: '#d9a47e', hair: 0x111111, hairStyle: 'spiky', shirt: '#f2c14e', shirt2: '#c8402f', pattern: 'aloha', pants: 0x3a4a6a, longPants: true, shoe: 0xffffff },
  chess: { skin: '#e2b490', hair: 0xdddddd, hairStyle: 'bald', shirt: '#ffffff', pants: 0x5a6a5a, longPants: true, beard: '#eeeeee', wrinkle: true, happyEyes: true, brow: '#dddddd', shoe: 0x333333 },
};
// role：消息來源類型；rel：可信度（玩家看不到，只能從戰績推敲）
const NPCS = [
  { id: 'broker', name: '營業員小美', look: 'broker', road: 'E', s: 11, side: 1, off: 3.7, role: 'broker', rel: 0.5 },
  { id: 'oldhand', name: '老張伯', look: 'oldhand', road: 'E', s: 8.4, side: 1, off: 2.75, role: 'oldhand', rel: 0.62, sit: true },
  { id: 'aunt1', name: '王媽媽', look: 'auntie1', road: 'E', s: 11.4, side: 1, off: 2.75, role: 'auntie', rel: 0.36, sit: true, day: true },
  { id: 'aunt2', name: '林阿姨', look: 'auntie2', road: 'E', s: 12.9, side: 1, off: 2.75, role: 'auntie', rel: 0.4, sit: true, day: true },
  { id: 'aunt3', name: '陳太太', look: 'auntie3', road: 'E', s: 14.4, side: 1, off: 2.75, role: 'crowd', sit: true, day: true, dry: true },
  { id: 'kiosk', name: '報攤老闆', look: 'kiosk', road: 'E', s: 5.5, side: -1, off: 2.0, role: 'kiosk', rel: 0.3 },
  { id: 'reporter', name: '記者小周', look: 'reporter', road: 'E', s: -11, side: -1, off: 2.6, role: 'reporter', rel: 0.75 },
  { id: 'banker', name: '林襄理', look: 'banker', road: 'E', s: -11, side: 1, off: 2.6, role: 'banker', rel: 0.8 },
  { id: 'engineer', name: '工程師阿哲', look: 'engineer', road: 'E', s: -28, side: 1, off: 2.6, role: 'engineer', rel: 0.85, sectors: ['電子'] },
  { id: 'ponzi', name: '金滿堂阿龍', look: 'ponzi', road: 'E', s: -28, side: -1, off: 2.6, role: 'ponzi' },
  { id: 'shipping', name: '航運老謝', look: 'shipping', road: 'E', s: 46, side: 1, off: 2.6, role: 'shipping', rel: 0.8, sectors: ['航運', '塑化'] },
  { id: 'builder', name: '陳董', look: 'builder', road: 'E', s: -46, side: -1, off: 2.6, role: 'builder', rel: 0.7, sectors: ['營建', '紡織'] },
  { id: 'boss', name: '阿財哥', look: 'boss', road: 'E', s: 28, side: 1, off: 2.6, role: 'boss' },
  { id: 'vendor', name: '菜販阿珠', look: 'vendor', road: 'E', s: 28, side: -1, off: 2.6, role: 'auntie', rel: 0.32, day: true },
  { id: 'whale', name: '大戶阿忠', look: 'whale', road: 'E', s: 44.4, side: -1, off: 3.7, role: 'whale', rel: 0.72, night: true },
  { id: 'mama', name: '居酒屋老闆娘', look: 'mama', road: 'E', s: 47.6, side: -1, off: 3.7, role: 'mama', rel: 0.6, night: true },
  { id: 'monk', name: '廟公', look: 'monk', road: 'M', s: 13, side: 1, off: 2.8, role: 'temple' },
  { id: 'taxi', name: '運將阿輝', look: 'taxi', road: 'M', s: 30, side: -1, off: 2.6, role: 'taxi', rel: 0.45 },
  { id: 'phone', name: '通訊行小姐', look: 'phone', road: 'E', s: -62, side: 1, off: 2.6, role: 'phone' },
  { id: 'landlady', name: '房東太太', look: 'landlady', road: 'E', s: 62, side: -1, off: 2.6, role: 'home' },
  { id: 'fortune', name: '算命仙', look: 'fortune', road: 'M', s: -58.5, side: 1, off: 3.2, role: 'fortune', sit: true },
  { id: 'busker', name: '拉二胡的阿伯', look: 'busker', road: 'M', s: 55, side: -1, off: 3.2, role: 'busker', sit: true },
  { id: 'yulan', name: '賣玉蘭花的阿嬤', look: 'yulan', road: 'E', s: 77, side: 1, off: 2.6, role: 'yulan' },
  { id: 'shoe', name: '擦鞋阿南', look: 'shoe', road: 'E', s: -69, side: -1, off: 2.9, role: 'shoeshine', rel: 0.55, sit: true },
  { id: 'chess', name: '下棋阿伯', look: 'chess', road: 'M', s: -13, side: -1, off: 5.6, role: 'oldhand', rel: 0.55, sit: true },
];
// 行人：在比較空的街段來回走，跟他們聊天會聽到小道消息或彩蛋提示
const PED_NAMES = ['上班族小林', '高中生小琪', '公務員老吳', '燙髮的陳小姐', '散步的阿公', '送貨的阿強', '補習班老師', '剛下班的護士', '大學生阿凱', '騎樓下的阿姨', '跑業務的小張', '收報紙的阿伯'];
[['M', 20, 40, 1, 2.6], ['M', 44, 62, 1, 2.5], ['M', 34, 52, -1, 2.6], ['M', 58, 78, -1, 2.5], ['M', -20, -55, 1, 2.6], ['M', -22, -50, -1, 2.5],
 ['M', -55, -78, -1, 2.6], ['E', 50, 74, 1, 2.6], ['E', 65, 80, -1, 2.5], ['E', -32, -58, 1, 2.6], ['E', -50, -65, -1, 2.6], ['E', 16, 25, 1, 2.5]].forEach(([road, a, b, side, off], i) => {
  NPCS.push({ id: 'ped' + i, name: PED_NAMES[i], look: 'ped' + (i % 6), road, s: a, side, off, role: 'ped', walk: { road, a, b, side, off, v: 1.1 + (i % 4) * 0.15 } });
});
const NPC_BY = {};
function buildNPCs() {
  NPCS.forEach((n, i) => {
    n.idx = i + 1;
    const L = Object.assign({}, LOOKS[n.look]); if (L.hold === 'basket') L.hold = mkBasket; else delete L.hold;
    n.ch = new Character(L); scene.add(n.ch.root);
    const sl = slot(n.road, n.s, n.side, n.off); n.dir = sl.dir; n.fwd0 = n.off < 3 ? sl.fwd.clone().negate() : sl.fwd.clone().negate();
    if (n.role === 'crowd' || n.sit) n.fwd0 = tangentize(PLACE_BY.broker ? slot('E', n.s, 1, 6).dir.sub(n.dir) : sl.fwd.clone(), n.dir);
    if (['fortune', 'busker', 'shoe'].includes(n.id)) n.fwd0 = tangentize(slot(n.road, n.s, n.side, 0.5).dir.sub(n.dir), n.dir);
    if (n.walk) n.fwd0 = tangentize(roadPoint(n.road, n.s + 1).sub(roadPoint(n.road, n.s)), n.dir);
    if (n.id === 'chess') n.fwd0 = tangentize(slot('M', -13, -1, 2).dir.sub(n.dir), n.dir);
    n.fwd = n.fwd0.clone(); if (n.sit) n.ch.mode = 'sit';
    NPC_BY[n.id] = n;
  });
}

/* ---------- 玩家 ---------- */
const PL = { dir: new V3(), fwd: new V3(), camF: new V3(), speed: 0, ch: null, camPitch: 0.5, camDist: 7, lastDrag: -9 };
const INPUT = { keys: {}, joy: { x: 0, y: 0, on: false } };
function setPlayerAt(dir, face) { PL.dir.copy(dir).normalize(); const f = face ? face.clone().sub(PL.dir) : roadPoint('E', 1).sub(PL.dir); PL.fwd.copy(tangentize(f, PL.dir)); PL.camF.copy(PL.fwd); }
const _ax = new V3(), _q2 = new THREE.Quaternion();
function pushOut(nd) {
  for (const c of COLLIDERS) { const d = angDist(nd, c.d), r = c.r + 0.3; if (d < r && d > 1e-4) { const away = tangentize(nd.clone().sub(c.d), nd); _ax.crossVectors(nd, away).normalize(); nd.applyAxisAngle(_ax, (r - d) / R); } }
  for (const n of NPCS) { if (!n.ch.root.visible) continue; const d = angDist(nd, n.dir), r = 0.65; if (d < r && d > 1e-4) { const away = tangentize(nd.clone().sub(n.dir), nd); _ax.crossVectors(nd, away).normalize(); nd.applyAxisAngle(_ax, (r - d) / R); } }
  return nd.normalize();
}
function moveInput() {
  const k = INPUT.keys; let x = 0, y = 0;
  if (k.KeyW || k.ArrowUp) y += 1; if (k.KeyS || k.ArrowDown) y -= 1; if (k.KeyA || k.ArrowLeft) x -= 1; if (k.KeyD || k.ArrowRight) x += 1;
  let run = !!(k.ShiftLeft || k.ShiftRight);
  if (INPUT.joy.on) { x = INPUT.joy.x; y = INPUT.joy.y; run = Math.hypot(x, y) > 0.92; }
  return { x, y, run };
}
function movePlayer(dt) {
  const inp = (GAME.busy || GAME.mode !== 'ground') ? { x: 0, y: 0, run: false } : moveInput();
  const up = PL.dir, rt = new V3().crossVectors(PL.camF, up);
  const md = PL.camF.clone().multiplyScalar(inp.y).addScaledVector(rt, inp.x), mag = Math.min(1, md.length());
  const target = mag > 0.05 ? (inp.run ? 8.5 : 5) * mag : 0;
  PL.speed = lerp(PL.speed, target, 1 - Math.exp(-dt * 9));
  if (mag > 0.05) { md.normalize(); PL.fwd.lerp(md, 1 - Math.exp(-dt * 12)); tangentize(PL.fwd, up); }
  if (PL.speed > 0.05) {
    const base = mag > 0.05 ? md : PL.fwd.clone();
    for (const a of [0, 0.7, -0.7, 1.3, -1.3]) {
      const d = base.clone().applyAxisAngle(up, a); _ax.crossVectors(up, d).normalize();
      _q2.setFromAxisAngle(_ax, PL.speed * dt * (a ? 0.7 : 1) / R);
      const nd = pushOut(up.clone().applyQuaternion(_q2));
      if (!walkable(nd)) continue;
      const q = new THREE.Quaternion().setFromUnitVectors(up.clone(), nd);
      PL.dir.copy(nd); PL.fwd.applyQuaternion(q); PL.camF.applyQuaternion(q); tangentize(PL.fwd, PL.dir); tangentize(PL.camF, PL.dir);
      break;
    }
  }
  if (mag > 0.05 && GAME.t - PL.lastDrag > 1.2 && inp.y > -0.3) { const side = PL.fwd.dot(rt); PL.camF.applyAxisAngle(up, -side * dt * 1.2); tangentize(PL.camF, up); }
}
function placeChar(ch, dir, fwd, h = 0) { const right = new V3().crossVectors(dir, fwd); _m.makeBasis(right, dir, fwd); _m.setPosition(dir.clone().multiplyScalar(R + h)); _m.decompose(ch.root.position, ch.root.quaternion, _s); ch.root.scale.setScalar(ch.L.scale || 1); }

/* ---------- 相機 ---------- */
const CAM = { look: new V3(), mapPos: new V3(0, 0, 1), mapUp: new V3(0, 1, 0), mapDist: R * 3.4, blend: 0 };
const _cg = { pos: new V3(), look: new V3(), up: new V3() }, _cm = { pos: new V3(), look: new V3(), up: new V3() };
function groundCam(out) {
  const up = PL.dir, base = up.clone().multiplyScalar(R); let d = PL.camDist, p = PL.camPitch;
  for (let it = 0; it < 8; it++) {
    out.pos.copy(base).addScaledVector(up, 1.1 + Math.sin(p) * d).addScaledVector(PL.camF, -Math.cos(p) * d);
    const h = out.pos.length() - R; if (camOpen(out.pos.clone().normalize(), h)) break; d *= 0.8;
  }
  out.look.copy(base).addScaledVector(up, 1.3).addScaledVector(PL.camF, 1.2); out.up.copy(up);
}
function updateCamera(dt) {
  const k = 1 - Math.exp(-dt * 7);
  if (GAME.mode === 'title') { const a = GAME.t * 0.07; const c = new V3(Math.sin(a), 0.35, Math.cos(a)).normalize(); camera.position.copy(c).multiplyScalar(R * 2.9); camera.up.set(0, 1, 0); camera.lookAt(0, R * 0.55, 0); return; }
  const tgt = GAME.mode === 'map' ? 1 : 0; CAM.blend += (tgt - CAM.blend) * (1 - Math.exp(-dt * 3.2)); if (Math.abs(tgt - CAM.blend) < 0.002) CAM.blend = tgt;
  groundCam(_cg); _cm.pos.copy(CAM.mapPos).multiplyScalar(CAM.mapDist); _cm.look.set(0, 0, 0); _cm.up.copy(CAM.mapUp);
  const e = CAM.blend * CAM.blend * (3 - 2 * CAM.blend);
  if (e < 0.001) { camera.position.lerp(_cg.pos, 1 - Math.exp(-dt * 10)); camera.up.lerp(_cg.up, k).normalize(); CAM.look.lerp(_cg.look, 1 - Math.exp(-dt * 14)); }
  else { const r = lerp(_cg.pos.length(), _cm.pos.length(), e); camera.position.copy(_cg.pos.clone().normalize().lerp(_cm.pos.clone().normalize(), e).normalize().multiplyScalar(r)); camera.up.copy(_cg.up.clone().lerp(_cm.up, e).normalize()); CAM.look.copy(_cg.look.clone().lerp(_cm.look, e)); }
  camera.lookAt(CAM.look);
}
function toggleMap() {
  if (GAME.busy) return;
  if (GAME.mode === 'map') { GAME.mode = 'ground'; return; }
  GAME.mode = 'map'; CAM.mapPos.copy(PL.dir); CAM.mapUp.copy(tangentize(new V3(0, 1, 0), PL.dir)); if (!isFinite(CAM.mapUp.x)) CAM.mapUp.set(0, 0, 1);
}
function mapDrag(dx, dy) { const right = new V3().crossVectors(CAM.mapUp, CAM.mapPos).normalize(); CAM.mapPos.applyAxisAngle(CAM.mapUp, -dx * 0.006); CAM.mapPos.applyAxisAngle(right, dy * 0.006); CAM.mapUp.applyAxisAngle(right, dy * 0.006); tangentize(CAM.mapUp, CAM.mapPos.normalize()); }

/* ---------- 輸入 ---------- */
function anyModal() { return ['trade', 'notes', 'help', 'sum', 'ext', 'saves', 'ending'].some(id => !$(id).classList.contains('hide')); }
function closeModals() { ['trade', 'notes', 'help', 'saves'].forEach(id => $(id).classList.add('hide')); GAME.busy = false; }
function bindInput() {
  addEventListener('keydown', e => {
    if (GAME.mode === 'title') return;
    if (e.repeat && ['KeyE', 'Enter', 'Space'].includes(e.code)) return;
    INPUT.keys[e.code] = true;
    if (DLG.active) { if (['KeyE', 'Enter', 'Space'].includes(e.code)) { e.preventDefault(); DLG.advance(); } if (DLG.choices) DLG.key(e.code); return; }
    if (!$('ext').classList.contains('hide')) { if (['Enter', 'Space', 'KeyE', 'Escape'].includes(e.code)) { e.preventDefault(); $('extOk').click(); } return; }
    if (!$('sum').classList.contains('hide')) { if (['Enter', 'Space', 'KeyE', 'Escape'].includes(e.code)) { e.preventDefault(); $('sumOk').click(); } return; }
    if (anyModal()) { if (e.code === 'Escape' || (e.code === 'KeyK' && !$('trade').classList.contains('hide')) || (e.code === 'KeyN' && !$('notes').classList.contains('hide'))) closeModals(); return; }
    if (GAME.busy) return;
    if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); interact(); }
    if (e.code === 'KeyP') togglePause();
    if (e.code === 'KeyO') openSaves();
    if (e.code === 'KeyQ') quickSave();
    if (e.code === 'KeyK') openTrade(); if (e.code === 'KeyN') openNotes(); if (e.code === 'KeyT') skipPhase(); if (e.code === 'KeyM') toggleMap(); if (e.code === 'KeyH') openHelp();
    if (e.code === 'Escape' && GAME.mode === 'map') toggleMap();
  });
  addEventListener('keyup', e => { INPUT.keys[e.code] = false; }); addEventListener('blur', () => INPUT.keys = {});
  const ptrs = new Map(); let pinch0 = 0;
  canvas.addEventListener('pointerdown', e => { try { canvas.setPointerCapture(e.pointerId); } catch (er) { } ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); } });
  canvas.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); zoom((pinch0 - d) * 0.02); pinch0 = d; return; }
    if (GAME.mode === 'map') mapDrag(dx, dy); else if (GAME.mode === 'ground') { PL.camF.applyAxisAngle(PL.dir, -dx * 0.006); tangentize(PL.camF, PL.dir); PL.camPitch = clamp(PL.camPitch + dy * 0.004, 0.1, 1.3); PL.lastDrag = GAME.t; }
  });
  const up = e => ptrs.delete(e.pointerId); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY * 0.004); }, { passive: false });
  const joy = $('joy'), knob = $('joyK'); let jid = null, jc = null;
  const jmove = e => { if (e.pointerId !== jid) return; let dx = e.clientX - jc.x, dy = e.clientY - jc.y; const l = Math.hypot(dx, dy), m = 50; if (l > m) { dx *= m / l; dy *= m / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; INPUT.joy.x = dx / m; INPUT.joy.y = -dy / m; };
  joy.addEventListener('pointerdown', e => { jid = e.pointerId; try { joy.setPointerCapture(jid); } catch (er) { } const r = joy.getBoundingClientRect(); jc = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; INPUT.joy.on = true; jmove(e); });
  joy.addEventListener('pointermove', jmove);
  const jend = e => { if (e.pointerId !== jid) return; jid = null; INPUT.joy.on = false; INPUT.joy.x = INPUT.joy.y = 0; knob.style.transform = ''; };
  joy.addEventListener('pointerup', jend); joy.addEventListener('pointercancel', jend);
  const tap = (id, fn) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); });
  tap('tAct', () => { if (DLG.active) DLG.advance(); else interact(); }); tap('tTrade', openTrade);
  $('bMap').onclick = toggleMap; $('bSkip').onclick = skipPhase; $('bPause').onclick = togglePause; $('bNote').onclick = openNotes; $('bTrade').onclick = openTrade; $('bMenu').onclick = openHelp; $('bSave').onclick = openSaves; $('bSound').onclick = cycleSound;
  $('prompt').onclick = interact;
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModals);
  $('dialog').addEventListener('click', e => { if (e.target.closest('#dlgCh')) return; DLG.advance(); });
}
function zoom(d) { if (GAME.mode === 'map') CAM.mapDist = clamp(CAM.mapDist + d * 10, R * 1.6, R * 5); else PL.camDist = clamp(PL.camDist + d * 2, 3.5, 13); }

/* ---------- 互動 ---------- */
let NEAR = null;
const EGGS = [{ id: 'bull', name: '城中金牛', verb: '摸摸城中金牛' }, { id: 'bear', name: '城中黑熊', verb: '拍拍城中黑熊' }];
function findNear() {
  if (GAME.mode !== 'ground' || GAME.busy) return null;
  for (const e of EGGS) if (EGG_SPOTS[e.id] && angDist(PL.dir, EGG_SPOTS[e.id]) < 2.6) return Object.assign({ egg: true }, e);
  let best = null, bd = 2.4;
  for (const n of NPCS) { if (!n.ch.root.visible || n.role === 'crowd') continue; const d = angDist(PL.dir, n.dir); if (d < bd) { bd = d; best = n; } }
  return best;
}
function interact() { if (GAME.busy || !NEAR) return; if (NEAR.egg) return eggAct(NEAR.id); talkTo(NEAR); }
async function talkTo(n) {
  GAME.busy = true; n.facing = true; sfx('blip');
  try { await (TALK[n.role] || TALK.rumor)(n); }
  finally { DLG.hide(); n.facing = false; GAME.busy = false; saveGame(); refreshHUD(); }
}
function toast(html) { const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = html; $('toasts').appendChild(el); while ($('toasts').children.length > 3) $('toasts').firstChild.remove(); setTimeout(() => el.remove(), 3300); }
