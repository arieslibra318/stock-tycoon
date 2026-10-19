const K = {
  white: 0xf7f2e6, cream: 0xefe2c4, coral1: 0xb9a78a, coral2: 0xa69477, coral3: 0xcab99b,
  roof: 0xc65a40, roof2: 0xb04a35, tRoof: 0xe8943a, tGreen: 0x3f9a7c, tRed: 0xc63c2e, gold: 0xf2c14e,
  bas: 0x4b5155, basT: 0x737872, wood: 0x9b6a45, woodD: 0x6e4a31, teal: 0x2f9ea0, pink: 0xe8789a,
  navy: 0x2f4f6f, glass: 0x9fd7dd, win: 0x56707a, leaf: 0x5e9a52, leafD: 0x3f7a45, leafL: 0x8fbf6a,
  cactus: 0x5f9e5a, sand: 0xf3e3bb, rock: 0x8d8174, rockD: 0x6b6158, grey: 0x9aa0a0, conc: 0xd9d6cc,
};
const WINGLOW = 0xfff4dc;
// 窗戶：白天是深色玻璃、夜晚發光（放進 glow 合併器）
function windowAt(glow, w, h, x, y, z, ry = 0) { glow.box(w, h, 0.04, WINGLOW, x, y, z, ry); }

function mTemple(s = 1) {
  const gb = new GB(), gl = new GB();
  gb.box(5 * s, 0.35, 4 * s, K.conc, 0, 0.17, 0);
  gb.box(4.2 * s, 2.0 * s, 3 * s, K.tRed, 0, 0.35 + s, 0);
  gb.box(1.3 * s, 1.5 * s, 0.1, K.woodD, 0, 0.35 + 0.75 * s, 1.5 * s + 0.02);
  for (const x of [-1.7, -0.75, 0.75, 1.7]) gb.cyl(0.13 * s, 0.13 * s, 2 * s, K.tRed, x * s, 0.35 + s, 1.72 * s, 10);
  const ry = 0.35 + 2 * s;
  gb.box(5 * s, 0.18, 3.9 * s, K.tGreen, 0, ry + 0.06, 0);
  gb.box(4.8 * s, 0.6 * s, 3.4 * s, K.tRoof, 0, ry + 0.4 * s, 0);
  gb.box(3.8 * s, 0.5 * s, 2.4 * s, K.tRoof, 0, ry + 0.9 * s, 0);
  gb.box(4.6 * s, 0.16 * s, 0.3 * s, K.tGreen, 0, ry + 1.2 * s, 0);
  for (const sx of [-1, 1]) {   // 燕尾翹脊
    gb.cyl(0.1 * s, 0.14 * s, 1.0 * s, K.tGreen, sx * 2.55 * s, ry + 1.45 * s, 0, 6, 0, 0, sx * -0.9);
    gb.sph(0.18 * s, K.gold, sx * 2.95 * s, ry + 1.8 * s, 0, 1, 1, 1, 8);
  }
  gb.sph(0.32 * s, K.gold, 0, ry + 1.45 * s, 0, 1, 1, 1, 12);                  // 寶珠
  gb.cyl(0.26 * s, 0.3 * s, 0.1, K.gold, 0, ry + 1.25 * s, 0, 10);
  for (const x of [-1.2, 1.2]) { gl.sph(0.22 * s, 0xff5a3c, x * s, ry - 0.25 * s, 1.85 * s, 1, 1.2, 1, 8); }  // 燈籠
  gb.cyl(0.42 * s, 0.32 * s, 0.6 * s, K.gold, 0, 0.65, 3.2 * s, 10);           // 香爐
  gb.cyl(0.5 * s, 0.5 * s, 0.1, K.gold, 0, 0.98, 3.2 * s, 10);
  return { gb, gl };
}
function mStall(roof = 0xe8789a) {   // 小吃攤
  const gb = new GB(), gl = new GB();
  gb.box(1.8, 0.9, 1.0, K.wood, 0, 0.45, 0);
  gb.box(1.9, 0.08, 1.1, K.cream, 0, 0.92, 0);
  for (const x of [-0.85, 0.85]) for (const z of [-0.45, 0.45]) gb.cyl(0.04, 0.04, 1.9, 0x777777, x, 0.95, z, 6);
  for (let i = 0; i < 6; i++) gb.box(0.36, 0.06, 1.4, i % 2 ? roof : 0xffffff, -0.9 + i * 0.36 + 0.18, 1.95, 0.15, 0, 0.25, 0);
  gl.sph(0.14, 0xffb24a, -0.7, 1.65, 0.6, 1, 1.2, 1, 8); gl.sph(0.14, 0xffb24a, 0.7, 1.65, 0.6, 1, 1.2, 1, 8);
  return { gb, gl };
}
function mUmbrella(col = 0xe8789a) {
  const gb = new GB();
  gb.cyl(0.04, 0.04, 2.0, 0xffffff, 0, 1.0, 0, 6);
  for (let i = 0; i < 8; i++) gb.add(cylGeo(0.001, 1.2, 0.4, 3), i % 2 ? col : 0xffffff, 0, 2.0, 0, 0, i * Math.PI / 4, 0);
  gb.box(0.6, 0.08, 1.4, i2c(col), 0.9, 0.15, 0.3, 0.3);
  return { gb };
}
function i2c(c) { return new THREE.Color(c).offsetHSL(0, 0, 0.12); }
function mCasuarina(s = 1) {   // 木麻黃
  const gb = new GB();
  gb.cyl(0.08 * s, 0.13 * s, 2.2 * s, 0x7b6250, 0, 1.1 * s, 0, 6);
  for (let i = 0; i < 3; i++) gb.cone(0.75 * s - i * 0.16 * s, 1.5 * s, [0x4f7f4a, 0x5d8d52, 0x6c9a5c][i], 0, 1.6 * s + i * 0.75 * s, 0, 7);
  return gb;
}
function mBush(s = 1) {
  const gb = new GB();
  for (let i = 0; i < 3; i++) gb.sph(rr(0.35, 0.55) * s, [K.leaf, K.leafL, 0x7aa95e][i], rr(-0.4, 0.4) * s, 0.3 * s, rr(-0.4, 0.4) * s, 1, 0.8, 1, 8);
  return gb;
}
function mLamp(gl) {
  const gb = new GB();
  gb.cyl(0.05, 0.07, 2.6, 0x3e5a60, 0, 1.3, 0, 6); gb.box(0.5, 0.06, 0.06, 0x3e5a60, 0.22, 2.6, 0);
  gl.sph(0.14, 0xfff0c0, 0.45, 2.5, 0, 1, 0.7, 1, 8);
  return gb;
}
