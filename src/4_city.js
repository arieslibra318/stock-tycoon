/* =========================================================
   city：1980 年代台北街景（騎樓透天厝、直立招牌、鐵窗、頂樓加蓋）
   ========================================================= */
const CITY = new GB(), CITYGL = new GB();
const COLLIDERS = [];
function matFrom(dir, fwd, h = 0) {
  const right = new V3().crossVectors(dir, fwd), m = new THREE.Matrix4();
  m.makeBasis(right, dir, fwd); m.setPosition(dir.clone().multiplyScalar(R + h)); return m;
}
function localToDir(m, x, z) { return new V3(x, 0, z).applyMatrix4(m).normalize(); }
function placeOn(obj, dir, fwd, h = 0) { matFrom(dir, fwd, h).decompose(obj.position, obj.quaternion, _s); }

/* ---------- 招牌圖集：所有招牌畫在同一張畫布，合併成一個 mesh ---------- */
const ATLAS = (() => { const c = document.createElement('canvas'); c.width = 2048; c.height = 4096; return { c, g: c.getContext('2d'), v: 0, h: 0 }; })();
const SIGN_FONT = '"Noto Serif TC","Huninn","PMingLiU",serif';
function signCell(text, bg, fg, vertical, sub) {
  const g = ATLAS.g; let x, y, w, h;
  if (vertical) { const i = ATLAS.v++; x = (i % 16) * 128; y = Math.floor(i / 16) * 512; w = 128; h = 512; if (i >= 80) return null; }
  else { const i = ATLAS.h++; x = (i % 4) * 512; y = 2560 + Math.floor(i / 4) * 128; w = 512; h = 128; if (i >= 48) return null; }
  g.fillStyle = bg; g.fillRect(x, y, w, h);
  g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(x + 8, y + 8, w - 16, h - 16);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  const chars = [...text];
  if (vertical) {
    const fs = Math.min(92, 440 / chars.length);
    g.font = `900 ${fs}px ${SIGN_FONT}`;
    chars.forEach((ch, k) => g.fillText(ch, x + w / 2, y + 256 + (k - (chars.length - 1) / 2) * fs * 1.05));
  } else {
    const fs = Math.min(84, 440 / chars.length * 1.05);
    g.font = `900 ${fs}px ${SIGN_FONT}`; g.fillText(text, x + w / 2, y + (sub ? 52 : 66));
    if (sub) { g.font = `700 28px ${SIGN_FONT}`; g.fillText(sub, x + w / 2, y + 104); }
  }
  return { u0: x / 2048, v0: 1 - (y + h) / 4096, u1: (x + w) / 2048, v1: 1 - y / 4096 };
}
const SIGNS = { pos: [], uv: [] };
function addSignQuad(m, cx, cy, cz, w, h, ry, cell) {
  if (!cell) return;
  const q = new THREE.Matrix4().compose(new V3(cx, cy, cz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new V3(1, 1, 1));
  const M = m.clone().multiply(q);
  const c = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => new V3(x, y, 0).applyMatrix4(M));
  const uv = [[cell.u0, cell.v0], [cell.u1, cell.v0], [cell.u1, cell.v1], [cell.u0, cell.v1]];
  for (const i of [0, 1, 2, 0, 2, 3]) { SIGNS.pos.push(c[i].x, c[i].y, c[i].z); SIGNS.uv.push(...uv[i]); }
}
// 直立招牌：從騎樓伸出來，兩面都看得到
function verticalSign(m, x, y, z, text, bg, fg) {
  const cell = signCell(text, bg, fg, true);
  addSignQuad(m, x, y, z, 0.75, 3.0, Math.PI / 2, cell); addSignQuad(m, x, y, z, 0.75, 3.0, -Math.PI / 2, cell);
  const gb = new GB(); gb.box(0.08, 3.1, 0.1, 0x555555, x, y, z - 0.42); gb.box(0.08, 3.1, 0.1, 0x555555, x, y, z + 0.42);
  CITY.merge(gb, m);
}
const SIGN_MAT = new THREE.MeshBasicMaterial({ transparent: false });

/* ---------- 建築 ---------- */
const TILES = [0xe9e1d2, 0xd9c8a9, 0xc9d3c4, 0xe6c9b8, 0xd8d2c0, 0xbfc9cc, 0xe8dcc0, 0xcfb79a];
const SHOP_TXT = ['西藥房', '銀樓', '鐘錶眼鏡', '牛肉麵', '自助餐', '冰果室', '照相館', '書局', '唱片行', '錄影帶出租', '電器行', '五金行', '檳榔', '理髮廳', '牙科診所', '補習班', '旅社', '委託行', '茶行', '布莊', '皮鞋', '呼叫器', '麵包店', '當舖', '機車行', '家具行', '文具', '卡拉OK', '漫畫屋', '小吃部', '水電行', '中藥行', '電動玩具', '服飾店', '美容院', '汽車百貨'];
const SIGN_COL = [['#c8402f', '#fff3d6'], ['#1f4f9a', '#ffffff'], ['#f2c14e', '#7a1f12'], ['#ffffff', '#c8402f'], ['#1d6b52', '#fff3d6'], ['#2b2622', '#ffb000'], ['#e8789a', '#ffffff'], ['#ffffff', '#1f4f9a']];
const D = 7, FLH = 2.6, OFF = 3.1;   // 建築深度、樓高、騎樓柱離路中心
function mShop(w, fl, o = {}) {
  const gb = new GB(), gl = new GB(), tile = o.tile || TILES[rnd() * TILES.length | 0];
  gb.box(w, FLH, D - 1.5, 0x7d756b, 0, FLH / 2, -0.75);
  if (o.open === true || (o.open !== false && rnd() < 0.6)) { gl.box(w * 0.82, FLH * 0.72, 0.05, 0xfff0d0, 0, 1.15, D / 2 - 1.48); for (let i = 0; i < 4; i++) gb.box(rr(0.4, 0.8), rr(0.3, 0.9), 0.5, [0xd7263d, 0xf2c14e, 0x2b7f86, 0xffffff][i], -w / 3 + i * w / 5, 0.35, D / 2 - 1.9); }
  else { gb.box(w * 0.86, FLH * 0.86, 0.06, 0xa9adb0, 0, FLH * 0.43, D / 2 - 1.47); for (let k = 0; k < 6; k++) gb.box(w * 0.86, 0.03, 0.08, 0x888c8f, 0, 0.3 + k * 0.32, D / 2 - 1.45); }
  gb.box(w, 0.22, 1.5, tile, 0, FLH - 0.11, D / 2 - 0.75);
  for (const s of [-1, 1]) gb.box(0.42, FLH, 0.42, tile, s * (w / 2 - 0.21), FLH / 2, D / 2 - 0.21);
  gb.box(w, 0.06, 1.5, 0xb85c4a, 0, 0.03, D / 2 - 0.75);   // 騎樓地磚
  for (let f = 1; f < fl; f++) {
    const y0 = f * FLH;
    gb.box(w, FLH, D, tile, 0, y0 + FLH / 2, 0);
    gb.box(w + 0.06, 0.12, D + 0.06, o.trim || 0xf4efe4, 0, y0 + 0.06, 0);
    const nw = w > 5 ? 3 : 2;
    for (let i = 0; i < nw; i++) {
      const x = (i - (nw - 1) / 2) * (w / nw), ww = Math.min(1.3, w / nw - 0.5);
      gl.box(ww, 1.1, 0.04, WINGLOW, x, y0 + 1.35, D / 2 + 0.02);
      if (rnd() < 0.7) { gb.box(ww + 0.16, 1.26, 0.06, 0x3a3f42, x, y0 + 1.35, D / 2 + 0.32); gb.box(ww + 0.16, 0.06, 0.34, 0x3a3f42, x, y0 + 0.72, D / 2 + 0.17); gb.box(ww + 0.16, 0.06, 0.34, 0x3a3f42, x, y0 + 1.98, D / 2 + 0.17); for (let b = 0; b < 4; b++) gb.box(0.03, 1.2, 0.03, 0x3a3f42, x - ww / 2 + (b + 0.5) * ww / 4, y0 + 1.35, D / 2 + 0.33); }
      if (rnd() < 0.35) gb.box(0.7, 0.45, 0.45, 0xe9ecec, x + 0.15, y0 + 0.45, D / 2 + 0.25);
    }
  }
  const top = fl * FLH;
  for (const [x, z, sw, sd] of [[0, D / 2 - 0.06, w, 0.12], [0, -D / 2 + 0.06, w, 0.12], [w / 2 - 0.06, 0, 0.12, D], [-w / 2 + 0.06, 0, 0.12, D]]) gb.box(sw, 0.5, sd, tile, x, top + 0.25, z);
  if (rnd() < 0.6) { gb.cyl(0.45, 0.45, 0.9, rnd() < 0.5 ? 0xd9dcde : 0x3b7fc4, rr(-w / 4, w / 4), top + 0.75, -D / 2 + 1.2, 12); gb.box(0.9, 0.3, 0.9, 0x666666, 0, top + 0.15, -D / 2 + 1.2); }
  if (rnd() < 0.45) { const c = [0x4f86b8, 0x5f9e6a, 0xa8553e, 0x8a9aa0][rnd() * 4 | 0]; gb.box(w - 0.4, 1.8, D * 0.55, 0xbcbcb4, 0, top + 0.9, -D * 0.15); for (let k = 0; k < 7; k++) gb.box(w - 0.2, 0.06, D * 0.6, c, 0, top + 1.85 + (k % 2) * 0.05, -D * 0.15 - D * 0.27 + k * D * 0.09, 0, 0.12); }
  return { gb, gl, top };
}
function placeBuilding(road, s, side, w, fl, o = {}) {
  const sl = slot(road, s, side, OFF + D / 2);
  const m = matFrom(sl.dir, sl.fwd, 0);
  const b = o.custom ? o.custom(w, fl) : mShop(w, fl, o);
  CITY.merge(b.gb, m); if (b.gl) CITYGL.merge(b.gl, m);
  // 招牌
  const sc = o.signCol || SIGN_COL[rnd() * SIGN_COL.length | 0];
  if (o.hsign) addSignQuad(m, 0, FLH + 0.42, D / 2 + 0.08, Math.min(w * 0.92, 7.6), Math.min(w * 0.92, 7.6) / 4, 0, signCell(o.hsign, sc[0], sc[1], false, o.hsub));
  if (o.vsign !== false && fl >= 3) verticalSign(m, (rnd() < 0.5 ? -1 : 1) * (w / 2 - 0.3), FLH + 1.75, D / 2 + 0.5, o.vsign || SHOP_TXT[rnd() * SHOP_TXT.length | 0], sc[0], sc[1]);
  for (const sx of [-1, 1]) COLLIDERS.push({ d: localToDir(m, sx * (w / 2 - 0.21), D / 2 - 0.21), r: 0.32 });
  return { m, sl, b };
}

/* ---------- 地面與道路 ---------- */
function canvasTex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; }
const ASPHALT = canvasTex(128, 256, (g, w, h) => { g.fillStyle = '#5b5a58'; g.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${rr(0.04, 0.12)})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } g.fillStyle = '#f1f0ea'; g.fillRect(6, 0, 4, h); g.fillRect(w - 10, 0, 4, h); g.fillStyle = '#f2c14e'; g.fillRect(w / 2 - 5, 0, 3, h); g.fillRect(w / 2 + 2, 0, 3, h); });
const BRICK = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#9c4a3a'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) for (let x = (y / 16 % 2) * 16; x < w + 32; x += 32) { g.fillStyle = ['#b5584a', '#a9503f', '#be6352'][(x + y) / 16 % 3 | 0]; g.fillRect(x - 15, y + 1, 30, 14); } });
function ringStrip(road, w0, w1, h, tex, rep) {
  const r = ROADS[road], N = 260, pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const a = i / N * Math.PI * 2, c = r.u.clone().multiplyScalar(Math.cos(a)).addScaledVector(r.v, Math.sin(a));
    for (const [k, w] of [[0, w0], [1, w1]]) {
      const p = c.clone().addScaledVector(r.n, w / R).normalize().multiplyScalar(R + h);
      pos.push(p.x, p.y, p.z); uv.push(k, a * R / rep);
    }
    if (i < N) { const b = i * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 - h * 20, polygonOffsetUnits: -1 })); m.receiveShadow = true; scene.add(m); return m;
}
function buildGround() {
  const g = new THREE.SphereGeometry(R, 96, 64), col = [], p = g.attributes.position;
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const v = new V3(p.getX(i), p.getY(i), p.getZ(i)).normalize(); const d = roadDist(v); c.set(d < 12 ? 0xbdb4a4 : 0x9aa482).offsetHSL(0, 0, (rnd() - 0.5) * 0.04); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); m.receiveShadow = true; scene.add(m);
  for (const rd of ['E', 'M']) { ringStrip(rd, -WALK_W - 0.4, -ROAD_W, 0.02, BRICK, 4); ringStrip(rd, ROAD_W, WALK_W + 0.4, 0.02, BRICK, 4); }
  ringStrip('E', -ROAD_W, ROAD_W, 0.04, ASPHALT, 6); ringStrip('M', -ROAD_W, ROAD_W, 0.05, ASPHALT, 6);
  // 斑馬線
  for (const rd of ['E', 'M']) for (const s of [-5.6, 5.6, Math.PI * R - 5.6, Math.PI * R + 5.6]) {
    const sl = slot(rd, s, 1, 0), m2 = matFrom(sl.dir, new V3().crossVectors(sl.dir, sl.fwd).normalize(), 0.07), gb = new GB();
    for (let k = -3; k <= 3; k++) gb.box(0.9, 0.02, 0.4, 0xf4f2ea, 0, 0, k * 0.5);
    CITY.merge(gb, m2);
  }
}

/* ---------- 場所 ---------- */
const PLACES = [];
function place(id, name, road, s, side, w, fl, o) { const r = placeBuilding(road, s, side, w, fl, o); const p = Object.assign({ id, name, road, s, side, w, front: slot(road, s, side, 2.2).dir, m: r.m }, o.meta || {}); PLACES.push(p); return p; }
const PLACE_BY = {};
const EGG_SPOTS = {}, EGG_CERT_POS = [];
function mBull() {
  const gb = new GB(), au = 0xd4a437, au2 = 0xb98a26;
  gb.box(2.8, 0.8, 1.8, 0x8e8a80, 0, 0.4, 0); gb.box(3.0, 0.1, 2.0, 0x6e6a62, 0, 0.82, 0);
  gb.sph(0.8, au, 0, 1.75, -0.1, 0.62, 0.66, 1.25, 12); gb.sph(0.62, au, 0, 1.95, -0.6, 0.66, 0.7, 0.8, 12);
  gb.sph(0.42, au, 0, 2.05, 0.95, 0.8, 0.82, 1.05, 12); gb.sph(0.22, au2, 0, 1.92, 1.32, 1, 0.8, 0.8, 10);
  for (const s of [-1, 1]) { gb.add(cylGeo(0.02, 0.08, 0.55, 8), au2, s * 0.38, 2.38, 0.92, 0.5, 0, s * -1.1); gb.sph(0.08, au2, s * 0.32, 2.2, 0.86, 1.3, 0.6, 1, 8); }
  for (const [x, z] of [[-0.3, 0.6], [0.3, 0.75], [-0.3, -0.75], [0.3, -0.6]]) gb.cyl(0.11, 0.09, 0.85, au2, x, 1.2, z, 8);
  gb.add(cylGeo(0.03, 0.05, 0.9, 6), au2, 0, 1.95, -1.25, -0.9, 0, 0);
  return gb;
}
function mBear() {
  const gb = new GB(), fur = 0x3a2b22, fur2 = 0x5a4434;
  gb.box(2.6, 0.8, 1.8, 0x8e8a80, 0, 0.4, 0); gb.box(2.8, 0.1, 2.0, 0x6e6a62, 0, 0.82, 0);
  gb.sph(0.85, fur, 0, 1.85, -0.1, 0.95, 1.05, 0.85, 12); gb.sph(0.55, fur, 0, 2.95, 0.05, 1, 0.92, 0.95, 12);
  gb.sph(0.22, fur2, 0, 2.85, 0.52, 1.1, 0.8, 0.9, 10); gb.sph(0.07, 0x111111, 0, 2.9, 0.72, 1.2, 0.9, 0.8, 8);
  for (const s of [-1, 1]) { gb.sph(0.17, fur, s * 0.38, 3.4, 0, 1, 1, 0.6, 8); gb.sph(0.28, fur, s * 0.55, 1.5, 0.45, 0.9, 0.7, 1.2, 10); gb.sph(0.3, fur, s * 0.75, 2.05, 0.15, 0.7, 1.2, 0.7, 10); }
  gb.box(0.9, 0.12, 0.05, 0xf0e8d0, 0, 2.3, 0.73);
  return gb;
}
let BOARD = null;
function buildCity() {
  buildGround();
  const used = [];
  const P = (id, name, road, s, side, w, fl, o) => { used.push({ road, side, a: s - w / 2 - 0.3, b: s + w / 2 + 0.3 }); const p = place(id, name, road, s, side, w, fl, o); PLACE_BY[id] = p; return p; };
  // ---- 主要場所 ----
  const hz = P('broker', '城中證券', 'E', 11, 1, 9, 5, { hsign: '城中證券', hsub: '股票・期貨・代客操作', signCol: ['#c8402f', '#ffe8a8'], vsign: '證券', tile: 0xe9e1d2, open: true });
  P('bank', '寶島銀行', 'E', -11, 1, 8, 4, { hsign: '寶島銀行', signCol: ['#1f4f9a', '#ffffff'], vsign: false, tile: 0xb9b6ae, open: true, custom: (w, fl) => { const b = mShop(w, fl, { tile: 0xb9b6ae, open: true }); for (let i = 0; i < 4; i++) b.gb.cyl(0.32, 0.36, FLH * 2, 0xe8e4da, -w / 2 + 0.9 + i * (w - 1.8) / 3, FLH, D / 2 + 0.3, 12); return b; } });
  P('paper', '城中日報社', 'E', -11, -1, 7, 4, { hsign: '城中日報', hsub: '每日新聞・號外', signCol: ['#ffffff', '#2b2622'], vsign: '日報', tile: 0xd8d2c0 });
  P('tea', '清香茶藝館', 'E', 28, 1, 5, 3, { hsign: '清香茶藝館', signCol: ['#5a3b22', '#f2d9a0'], vsign: '茶藝', tile: 0x8f6b48 });
  P('market', '城中市場', 'E', 28, -1, 10, 2, { hsign: '城中市場', signCol: ['#1d6b52', '#fff3d6'], vsign: false, open: true });
  P('tech', '新竹微電 台北辦事處', 'E', -28, 1, 6, 5, { hsign: '新竹微電', hsub: '台北辦事處', signCol: ['#ffffff', '#1f4f9a'], vsign: false, tile: 0x7fa8c4 });
  P('ponzi', '金滿堂投資顧問', 'E', -28, -1, 5, 4, { hsign: '金滿堂投資', hsub: '月月配息・保證獲利', signCol: ['#c8a02f', '#7a1f12'], vsign: '投資', tile: 0xe6c9b8 });
  P('ship', '基港航運', 'E', 46, 1, 6, 4, { hsign: '基港航運', signCol: ['#1f4f9a', '#ffffff'], vsign: '航運' });
  P('build', '城中營造 預售屋接待中心', 'E', -46, -1, 8, 2, { hsign: '預售屋 熱賣中', hsub: '城中營造・景觀豪宅', signCol: ['#c8402f', '#ffffff'], vsign: false, open: true });
  const iz = P('izakaya', '月見居酒屋', 'E', 46, -1, 6, 3, { hsign: '月見居酒屋', hsub: '燒鳥・清酒・宵夜', signCol: ['#2b2622', '#ffd27a'], vsign: '居酒屋', tile: 0x8f6b48, open: true });
  { const gl = new GB(); for (const x of [-2.2, -0.75, 0.75, 2.2]) gl.sph(0.24, 0xff4a2a, x, 2.15, D / 2 - 0.25, 1, 1.3, 1, 8); CITYGL.merge(gl, iz.m); const gb = new GB(); for (let k = 0; k < 5; k++) gb.box(0.85, 0.75, 0.04, 0x2b3a55, -1.7 + k * 0.85, 2.05, D / 2 - 1.46); CITY.merge(gb, iz.m); }
  P('home', '阿德的雅房', 'E', 62, -1, 5, 4, { hsign: '雅房出租', signCol: ['#ffffff', '#2b2622'], vsign: '套房' });
  P('phone', '大哥大通訊行', 'E', -62, 1, 5, 3, { hsign: '大哥大・呼叫器', signCol: ['#2b2622', '#ffb000'], vsign: '大哥大' });
  P('station', '城中車站', 'M', 70, 1, 12, 3, { hsign: '城中車站', signCol: ['#2b7f86', '#ffffff'], vsign: false, tile: 0xd9c8a9, open: true });
  P('taxi', '計程車招呼站', 'M', 30, -1, 5, 3, { hsign: '計程車行', signCol: ['#f2c14e', '#2b2622'], vsign: '車行' });
  // 福德宮（廟）、公園：放在館前街兩側
  { const sl = slot('M', 13, 1, OFF + 4), m = matFrom(sl.dir, sl.fwd, 0), t = mTemple(0.9); CITY.merge(t.gb, m); CITYGL.merge(t.gl, m); used.push({ road: 'M', side: 1, a: 8, b: 18 }); OPEN.push({ d: slot('M', 13, 1, 3.5).dir, r: 3.2 }); const p = { id: 'temple', name: '福德宮', road: 'M', s: 13, side: 1, front: slot('M', 13, 1, 2.6).dir }; PLACES.push(p); PLACE_BY.temple = p; for (const sx of [-1.8, 1.8]) COLLIDERS.push({ d: localToDir(m, sx, -0.2), r: 1.6 }); }
  { const sl = slot('M', -13, -1, OFF + 4), m = matFrom(sl.dir, sl.fwd, 0), gb = new GB(), gl = new GB(); used.push({ road: 'M', side: -1, a: -19, b: -7 }); OPEN.push({ d: sl.dir, r: 5.2 });
    gb.cyl(0.5, 0.8, 2.4, 0x6e5a48, 0, 1.2, -1, 10); for (let i = 0; i < 10; i++) { const a = rnd() * 6.28, r2 = rr(0, 2.4); gb.sph(rr(1.3, 1.8), [0x3f7a45, 0x5e9a52, 0x4e8a4a][i % 3], Math.cos(a) * r2, rr(3.0, 3.7), -1 + Math.sin(a) * r2, 1.1, 0.6, 1.1, 8); }
    for (const [x, z, ry] of [[-2.8, 1.5, 0.4], [2.8, 1.5, -0.4], [0, 3.2, 0]]) { gb.box(1.8, 0.12, 0.5, 0x9b6a45, x, 0.5, z, ry); gb.box(0.1, 0.5, 0.4, 0x555555, x - 0.7, 0.25, z, ry); gb.box(0.1, 0.5, 0.4, 0x555555, x + 0.7, 0.25, z, ry); }
    gb.merge(mLamp(gl), new THREE.Matrix4().makeTranslation(3.6, 0, -1)); gb.merge(mLamp(gl), new THREE.Matrix4().makeTranslation(-3.6, 0, -1));
    CITY.merge(gb, m); CITYGL.merge(gl, m); COLLIDERS.push({ d: localToDir(m, 0, -1), r: 0.9 });
    const p = { id: 'park', name: '城中公園', road: 'M', s: -13, side: -1, front: sl.dir }; PLACES.push(p); PLACE_BY.park = p; }
  // 證券行的報價看板
  BOARD = makeBoard(); { const m = hz.m.clone().multiply(new THREE.Matrix4().makeTranslation(0, FLH * 2 + 0.95, D / 2 + 0.5)); m.decompose(BOARD.mesh.position, BOARD.mesh.quaternion, _s); scene.add(BOARD.mesh); }
  // 證券行前的板凳
  for (let i = 0; i < 6; i++) { const sl = slot('E', 7.6 + i * 1.5, 1, 2.6), gb = new GB(); gb.cyl(0.22, 0.24, 0.42, [0xd7263d, 0x2b7f86, 0xf2c14e][i % 3], 0, 0.21, 0, 10); CITY.merge(gb, matFrom(sl.dir, sl.fwd, 0)); }
  // 報攤
  { const sl = slot('E', 5.5, -1, 3.0), m = matFrom(sl.dir, sl.fwd, 0), gb = new GB(); gb.box(2.2, 1.0, 1.2, 0x2b7f86, 0, 0.5, 0); gb.box(2.4, 0.08, 1.6, 0xc8402f, 0, 2.2, 0.15); gb.box(0.08, 1.2, 0.08, 0x555555, -1.1, 1.6, 0.8); gb.box(0.08, 1.2, 0.08, 0x555555, 1.1, 1.6, 0.8); for (let k = 0; k < 8; k++) gb.box(0.4, 0.04, 0.3, [0xffffff, 0xf2e6c8, 0xe8789a][k % 3], -0.85 + k * 0.24, 1.03, 0.2 - (k % 2) * 0.2); CITY.merge(gb, m); COLLIDERS.push({ d: sl.dir, r: 1.0 }); addSignQuad(m, 0, 1.75, 0.62, 2.2, 0.55, 0, signCell('書報攤', '#2b2622', '#ffb000', false)); const p = { id: 'kiosk', name: '書報攤', road: 'E', s: 5.5, side: -1, front: slot('E', 5.5, -1, 1.9).dir }; PLACES.push(p); PLACE_BY.kiosk = p; }
  // 檳榔攤
  { const sl = slot('E', 16.5, -1, 3.2), m = matFrom(sl.dir, sl.fwd, 0), gb = new GB(), gl = new GB(); gb.box(1.6, 1.0, 1.2, 0xf4efe4, 0, 0.5, 0); gb.box(1.8, 0.1, 1.5, 0x5f9e6a, 0, 2.1, 0.1); gl.box(1.5, 0.3, 0.05, 0xff5ab0, 0, 1.75, 0.62); CITY.merge(gb, m); CITYGL.merge(gl, m); COLLIDERS.push({ d: sl.dir, r: 0.9 }); }
  // ---- 彩蛋：北極的城中金牛、南極的城中黑熊 ----
  const PS = Math.PI * R / 2;
  for (const [id, sgn] of [['bull', 1], ['bear', -1]]) {
    const sl = slot('M', sgn * PS, sgn, 5.4), m = matFrom(sl.dir, sl.fwd, 0);
    used.push({ road: 'M', side: sgn, a: sgn * PS - 5, b: sgn * PS + 5 }); OPEN.push({ d: sl.dir, r: 3.8 });
    CITY.merge(id === 'bull' ? mBull() : mBear(), m); COLLIDERS.push({ d: sl.dir, r: 1.25 });
    addSignQuad(m, 0, 0.42, 1.06, 1.6, 0.4, 0, signCell(id === 'bull' ? '城中金牛' : '城中黑熊', '#2b2622', id === 'bull' ? '#ffd27a' : '#e8e0c8', false));
    EGG_SPOTS[id] = slot('M', sgn * PS, sgn, 3.2).dir;
  }
  // 街頭小攤：算命、二胡、玉蘭花、擦鞋
  { const sl = slot('M', -58.5, 1, 2.3), m = matFrom(sl.dir, sl.fwd, 0), gb = new GB(); gb.box(1.3, 0.75, 0.7, 0x9b6a45, 0, 0.375, 0.2); gb.box(1.36, 0.06, 0.76, 0xc8402f, 0, 0.78, 0.2); gb.cyl(0.03, 0.03, 2.2, 0x555555, 0.75, 1.1, 0.4, 6); CITY.merge(gb, m); addSignQuad(m, 0.75, 2.0, 0.42, 0.9, 0.9, 0, signCell('鐵口直斷', '#c8402f', '#fff3d6', false, '算命・卜卦')); COLLIDERS.push({ d: sl.dir, r: 0.6 }); }
  { const sl = slot('E', 75.5, 1, 1.9), m = matFrom(sl.dir, sl.fwd, 0), gb = new GB(); gb.box(0.9, 0.6, 0.6, 0x9b6a45, 0, 0.5, 0); for (let k = 0; k < 9; k++) gb.sph(0.07, 0xfffbe8, -0.3 + (k % 3) * 0.3, 0.86, -0.15 + Math.floor(k / 3) * 0.15, 1, 1.4, 1, 6); for (const x of [-0.35, 0.35]) gb.cyl(0.18, 0.18, 0.05, 0x333333, x, 0.18, 0.32, 10, 0, 0, Math.PI / 2); CITY.merge(gb, m); COLLIDERS.push({ d: sl.dir, r: 0.5 }); }
  { const sl = slot('E', -69, -1, 2.0), m = matFrom(sl.dir, sl.fwd, 0), gb = new GB(); gb.box(0.6, 0.35, 0.45, 0x6b4a3a, 0, 0.18, 0.55); gb.box(0.3, 0.1, 0.2, 0x2b2622, 0, 0.4, 0.55); CITY.merge(gb, m); }
  // 散落各處的「紙本股票憑證」
  for (const [rd, s0, sd, off] of [['M', 77, 1, 2.4], ['M', -11, -1, 9.0], ['M', 15, 1, 4.6], ['M', PS + 2.6, 1, 6.2], ['E', 79, -1, 3.9]]) EGG_CERT_POS.push(slot(rd, s0, sd, off).dir);
  // ---- 填滿其餘的透天厝 ----
  for (const road of ['E', 'M']) for (const side of [-1, 1]) {
    let s = -Math.PI * R + 8.5;
    const end = Math.PI * R - 8.5;
    while (s < end) {
      const w = rr(4, 5.2);
      const a = s, b = s + w;
      const blocked = Math.abs(a + w / 2) < 8 || used.some(u => u.road === road && u.side === side && b > u.a && a < u.b);
      if (!blocked) placeBuilding(road, s + w / 2, side, w, 2 + (rnd() * 4 | 0), { hsign: rnd() < 0.35 ? SHOP_TXT[rnd() * SHOP_TXT.length | 0] : null });
      s += blocked ? 0.6 : w;
    }
  }
  // ---- 後面的街廓（遠景大樓） ----
  const fill = [];
  for (let i = 0; i < 2500 && fill.length < 90; i++) {
    const d = new V3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize();
    const rd = roadDist(d); if (rd < 15 || fill.some(f => angDist(f, d) < 6.5)) continue;
    fill.push(d);
    const f = new V3(rr(-1, 1), rr(-1, 1), rr(-1, 1)); tangentize(f, d);
    const gb = new GB(), gl = new GB(), w = rr(4, 6.5), dd = rr(4, 6.5), h = rr(6, 18) * (rd > 22 ? 1.2 : 1);
    const col = [0xd8d2c0, 0xc9c2b2, 0xbfc9cc, 0xe0d6c2, 0xb7aa96][rnd() * 5 | 0];
    gb.box(w, h, dd, col, 0, h / 2, 0);
    for (let y = 2; y < h - 1; y += 2.6) for (const s2 of [-1, 1]) gl.box(w * 0.8, 0.7, 0.04, WINGLOW, 0, y, s2 * (dd / 2 + 0.02));
    gb.box(w * 0.4, 1.2, dd * 0.4, 0xd9dcde, 0, h + 0.6, 0);
    const m = matFrom(d, f, 0); CITY.merge(gb, m); CITYGL.merge(gl, m);
  }
  // ---- 路燈與行道樹 ----
  for (const road of ['E', 'M']) for (const side of [-1, 1]) for (let s = -Math.PI * R + 9; s < Math.PI * R - 9; s += 9) {
    if (Math.abs(s) < 8) continue;
    const sl = slot(road, s, side, 2.0), gl = new GB(), gb = mLamp(gl); CITY.merge(gb, matFrom(sl.dir, tangentize(roadPoint(road, s + 0.1).sub(roadPoint(road, s)), sl.dir).applyAxisAngle(sl.dir, side * Math.PI / 2), 0)); CITYGL.merge(gl, matFrom(sl.dir, tangentize(roadPoint(road, s + 0.1).sub(roadPoint(road, s)), sl.dir).applyAxisAngle(sl.dir, side * Math.PI / 2), 0));
    COLLIDERS.push({ d: sl.dir, r: 0.25 });
  }
  // ---- 合併 ----
  const cm = CITY.mesh(true); scene.add(cm); const gm = new THREE.Mesh(CITYGL.geometry(), GLOW); scene.add(gm);
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(SIGNS.pos, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(SIGNS.uv, 2)); sg.computeVertexNormals();
  const at = new THREE.CanvasTexture(ATLAS.c); at.anisotropy = 4; SIGN_MAT.map = at; scene.add(new THREE.Mesh(sg, SIGN_MAT));
}

/* ---------- 證券行報價看板（每跳一次就重畫） ---------- */
function makeBoard() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 400; const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 2.9), new THREE.MeshBasicMaterial({ map: tex }));
  const frame = new GB(); frame.box(7.8, 3.3, 0.2, 0x2b2622, 0, 0, -0.12); const fm = frame.mesh(true); mesh.add(fm);
  return { c, g: c.getContext('2d'), tex, mesh };
}

/* ---------- 車流 ---------- */
const CARS = [];
const RIGHT = { E: -1, M: 1 };
function mCar(kind) {
  const gb = new GB(), gl = new GB();
  if (kind === 'bus') {
    gb.box(1.5, 1.5, 5.2, 0x3f8f5a, 0, 1.0, 0); gb.box(1.52, 0.5, 5.22, 0xf4efe4, 0, 1.55, 0); gl.box(1.54, 0.45, 4.4, WINGLOW, 0, 1.4, -0.2); gb.box(1.3, 0.5, 0.05, 0x2b2622, 0, 1.35, 2.61);
    for (const z of [-1.7, 1.7]) for (const x of [-0.75, 0.75]) gb.cyl(0.3, 0.3, 0.2, 0x222222, x, 0.3, z, 10, 0, 0, Math.PI / 2);
  } else {
    const col = kind === 'taxi' ? 0xf2c14e : [0xf4f4f0, 0x3b5f8a, 0xb03a2e, 0x2b2622, 0x9aa0a0][rnd() * 5 | 0];
    gb.box(1.3, 0.55, 2.8, col, 0, 0.55, 0); gb.box(1.15, 0.5, 1.5, col, 0, 1.05, -0.15); gl.box(1.17, 0.36, 1.3, 0xbfd8e6, 0, 1.05, -0.15);
    if (kind === 'taxi') gb.box(0.5, 0.18, 0.25, 0xffffff, 0, 1.38, -0.15);
    gb.box(0.25, 0.12, 0.05, 0xfff2c0, -0.45, 0.6, 1.41); gb.box(0.25, 0.12, 0.05, 0xfff2c0, 0.45, 0.6, 1.41);
    for (const z of [-0.9, 0.9]) for (const x of [-0.62, 0.62]) gb.cyl(0.27, 0.27, 0.16, 0x222222, x, 0.27, z, 10, 0, 0, Math.PI / 2);
  }
  const g = new THREE.Group(); g.add(gb.mesh(true)); g.add(new THREE.Mesh(gl.geometry(), GLOW)); return g;
}
function buildCars() {
  const kinds = ['taxi', 'car', 'bus', 'car', 'taxi', 'car', 'car', 'taxi'];
  kinds.forEach((k, i) => {
    const road = i % 2 ? 'M' : 'E', dirn = i % 4 < 2 ? 1 : -1;
    const g = mCar(k); scene.add(g);
    CARS.push({ g, road, dirn, s: rr(-80, 80), v: k === 'bus' ? 5 : rr(6, 9), sp: 0, len: k === 'bus' ? 5.2 : 2.8 });
  });
}
function updateCars(dt, plDir) {
  const L = Math.PI * 2 * R;
  for (const c of CARS) {
    const side = RIGHT[c.road] * c.dirn;
    let want = c.v;
    const ahead = roadPoint(c.road, c.s + c.dirn * (c.len / 2 + 2.2));
    const lane = slot(c.road, c.s + c.dirn * (c.len / 2 + 1.6), side, 0.9).dir;
    const forced = (c.force = Math.max(0, (c.force || 0) - dt)) > 0, byPlayer = angDist(lane, plDir) < 1.6;
    // 擋在車子前面：停下來按喇叭，不會穿過玩家
    if (byPlayer) { want = 0; c.honk = (c.honk || 0) + dt; if (c.honk > 2 && c.honk - dt <= 2 && angDist(lane, plDir) < 1.6 && typeof sfx === 'function') sfx('horn'); } else c.honk = 0;
    for (const o of CARS) if (o !== c && o.road === c.road && o.dirn === c.dirn) { let ds = (o.s - c.s) * c.dirn; ds = ((ds % L) + L) % L; if (ds < c.len / 2 + o.len / 2 + 1.5) want = 0; }
    // 路口：已經在路口裡的車先走；兩邊同時要進路口時，城中路優先，避免互等卡死
    if (!forced) for (const X of [PT_A, PT_B]) {
      const dNow = angDist(roadPoint(c.road, c.s), X), dAhead = angDist(ahead, X); if (dNow < 4.5 || !(dAhead < 5 && dAhead < dNow)) continue;
      for (const o of CARS) { if (o.road === c.road) continue; const od = angDist(roadPoint(o.road, o.s), X); if (od < 4.5 || (od < dNow && c.road === 'M' && od < 6.5 && o.sp > 0.5)) want = 0; }
    }
    // 保險：停太久就硬開過去
    c.wait = want === 0 && c.sp < 0.3 && !byPlayer ? (c.wait || 0) + dt : 0; if (c.wait > 4) { c.force = 1.5; c.wait = 0; }
    c.sp = lerp(c.sp, want, 1 - Math.exp(-dt * (want < c.sp ? 6 : 1.5)));
    c.s += c.sp * c.dirn * dt; if (c.s > L / 2) c.s -= L; if (c.s < -L / 2) c.s += L;
    const sl = slot(c.road, c.s, side, 0.9), fwd = tangentize(roadPoint(c.road, c.s + c.dirn * 0.1).sub(roadPoint(c.road, c.s)), sl.dir);
    placeOn(c.g, sl.dir, fwd, 0.04);
  }
}
