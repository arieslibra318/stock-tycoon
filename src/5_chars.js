/* =========================================================
   characters: Q 版人物（手繪臉、頭髮、帽子、衣服花紋、動作）
   ========================================================= */
const FW = 512, FH = 256;
function rgba(hex, a) { const c = new THREE.Color(hex); return `rgba(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0},${a})`; }
function drawFace(g, L, state, ox = 0, oy = 0, sc = 1) {
  g.save(); g.translate(ox, oy); g.scale(sc, sc);
  const cx = 128, ey = 146, sp = L.eyeSp || 27;
  // 腮紅
  for (const s of [-1, 1]) {
    const gr = g.createRadialGradient(cx + s * 44, 166, 1, cx + s * 44, 166, 17);
    gr.addColorStop(0, 'rgba(244,120,130,.55)'); gr.addColorStop(1, 'rgba(244,120,130,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx + s * 44, 166, 18, 11, 0, 0, Math.PI * 2); g.fill();
  }
  // 眉毛
  g.strokeStyle = L.brow || '#4a3428'; g.lineCap = 'round'; g.lineWidth = L.thickBrow ? 5 : 3.2;
  for (const s of [-1, 1]) { g.beginPath(); const bx = cx + s * sp, by = ey - 24 + (L.browUp || 0); g.moveTo(bx - 9, by + (L.worried ? s * -2 : 2)); g.quadraticCurveTo(bx, by - 4, bx + 9, by + (L.worried ? s * 2 : 2)); g.stroke(); }
  // 眼睛
  for (const s of [-1, 1]) {
    const x = cx + s * sp;
    if (state === 'blink' || L.happyEyes) {
      g.strokeStyle = '#2b1d18'; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 9, ey + 1); g.quadraticCurveTo(x, ey - 9, x + 9, ey + 1); g.stroke();
    } else {
      const ew = L.eyeW || 9.5, eh = L.eyeH || 12.5;
      g.fillStyle = '#2b1d18'; g.beginPath(); g.ellipse(x, ey, ew, eh, 0, 0, Math.PI * 2); g.fill();
      const gr = g.createLinearGradient(0, ey - eh, 0, ey + eh); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, L.iris || 'rgba(140,90,60,.9)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, ey + 2, ew * 0.78, eh * 0.75, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x + s * -2.5 + 2, ey - 5, ew * 0.38, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(x - 3, ey + 5, ew * 0.18, 0, Math.PI * 2); g.fill();
      if (L.lash) { g.strokeStyle = '#2b1d18'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x + s * (ew - 1), ey - eh * 0.55); g.lineTo(x + s * (ew + 5), ey - eh * 0.85); g.stroke(); }
    }
  }
  // 嘴巴
  const my = 178;
  if (L.mask) {
    // 澎湖婦女的花布包巾（蒙面）
    g.fillStyle = L.mask; g.beginPath(); g.moveTo(0, 162); g.quadraticCurveTo(cx, 156, 256, 162); g.lineTo(256, 256); g.lineTo(0, 256); g.fill();
    flowerDots(g, 0, 160, 256, 96, L.maskDot || '#fff3', 18);
  } else if (state === 'talk') {
    g.fillStyle = '#7a2f2a'; g.beginPath(); g.ellipse(cx, my + 2, 8, 6.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8737a'; g.beginPath(); g.ellipse(cx, my + 5, 5, 2.6, 0, 0, Math.PI * 2); g.fill();
  } else {
    g.strokeStyle = '#7a3a2f'; g.lineWidth = 3.2; g.beginPath();
    if (L.mouth === 'o') { g.ellipse(cx, my, 4, 4.5, 0, 0, Math.PI * 2); }
    else if (L.mouth === 'grin') { g.moveTo(cx - 9, my - 2); g.quadraticCurveTo(cx, my + 9, cx + 9, my - 2); g.closePath(); g.fillStyle = '#7a2f2a'; g.fill(); }
    else { g.moveTo(cx - 7, my - 1); g.quadraticCurveTo(cx, my + 6, cx + 7, my - 1); }
    g.stroke();
  }
  if (L.shades) { g.fillStyle = '#1d1d22'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * sp, ey, 17, 13, 0, 0, Math.PI * 2); g.fill(); } g.fillRect(cx - sp + 10, ey - 5, sp * 2 - 20, 4); g.fillStyle = 'rgba(255,255,255,.5)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * sp - 5, ey - 5, 5, 3, -0.5, 0, Math.PI * 2); g.fill(); } }
  if (L.beard) {
    g.fillStyle = L.beard; g.beginPath(); g.moveTo(cx - 34, 168); g.quadraticCurveTo(cx, 238, cx + 34, 168); g.quadraticCurveTo(cx + 18, 186, cx + 10, 184); g.quadraticCurveTo(cx, 190, cx - 10, 184); g.quadraticCurveTo(cx - 18, 186, cx - 34, 168); g.fill();
    if (state === 'talk') { g.fillStyle = '#7a2f2a'; g.beginPath(); g.ellipse(cx, 192, 6, 4, 0, 0, Math.PI * 2); g.fill(); }
  }
  if (L.stache) { g.fillStyle = L.stache; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 8, 170, 10, 4, s * -0.3, 0, Math.PI * 2); g.fill(); } }
  if (L.freckle) { g.fillStyle = 'rgba(160,100,70,.5)'; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(cx + s * (40 + i * 5), 158 + (i % 2) * 4, 1.6, 0, 7); g.fill(); } }
  if (L.wrinkle) { g.strokeStyle = 'rgba(120,80,60,.45)'; g.lineWidth = 2; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * (sp + 13), ey - 3); g.lineTo(cx + s * (sp + 19), ey - 6); g.moveTo(cx + s * (sp + 13), ey + 3); g.lineTo(cx + s * (sp + 19), ey + 5); g.stroke(); } }
  g.restore();
}
function flowerDots(g, x, y, w, h, col, n) {
  const r = mulberry32(7);
  for (let i = 0; i < n; i++) {
    const fx = x + r() * w, fy = y + r() * h;
    g.fillStyle = col; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; g.beginPath(); g.arc(fx + Math.cos(a) * 4, fy + Math.sin(a) * 4, 3, 0, 7); g.fill(); }
    g.fillStyle = '#f5c245'; g.beginPath(); g.arc(fx, fy, 2, 0, 7); g.fill();
  }
}
function faceTex(L, state) {
  const c = document.createElement('canvas'); c.width = FW; c.height = FH; const g = c.getContext('2d');
  g.fillStyle = L.skin; g.fillRect(0, 0, FW, FH);
  drawFace(g, L, state);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
function patTex(kind, a, b) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = a; g.fillRect(0, 0, 128, 128);
  if (kind === 'stripe') { g.fillStyle = b; for (let y = 0; y < 128; y += 22) g.fillRect(0, y, 128, 9); }
  else if (kind === 'flower') { flowerDots(g, 0, 0, 128, 128, b, 22); }
  else if (kind === 'check') { g.fillStyle = b; for (let i = 0; i < 128; i += 32) { g.globalAlpha = 0.5; g.fillRect(i, 0, 14, 128); g.fillRect(0, i, 128, 14); } g.globalAlpha = 1; }
  else if (kind === 'aloha') { const r = mulberry32(3); for (let i = 0; i < 9; i++) { const x = r() * 128, y = r() * 128; g.fillStyle = b; g.beginPath(); g.ellipse(x, y, 10, 4, r() * 3, 0, 7); g.fill(); g.beginPath(); g.ellipse(x + 6, y + 4, 10, 4, r() * 3, 0, 7); g.fill(); } }
  else if (kind === 'dots') { g.fillStyle = b; for (let y = 8; y < 128; y += 20) for (let x = (y / 20 % 2) * 10 + 6; x < 128; x += 20) { g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); return t;
}
const texCache = {};
function patMat(kind, a, b) { const k = kind + a + b; return texCache[k] || (texCache[k] = new THREE.MeshToonMaterial({ map: patTex(kind, a, b), gradientMap: GRAD })); }

// 幾何
const CG = {
  head: new THREE.SphereGeometry(0.42, 32, 22),
  ball: new THREE.SphereGeometry(1, 16, 12),
  torso: new THREE.LatheGeometry([[0, 0], [0.2, 0.0], [0.255, 0.07], [0.27, 0.22], [0.25, 0.36], [0.19, 0.46], [0.08, 0.5], [0, 0.5]].map(([x, y]) => new THREE.Vector2(x, y)), 20),
  skirt: new THREE.LatheGeometry([[0.25, 0.22], [0.3, 0.08], [0.36, -0.08], [0.0, -0.08]].map(([x, y]) => new THREE.Vector2(x, y)), 20),
  shorts: new THREE.LatheGeometry([[0, 0.06], [0.24, 0.07], [0.27, -0.02], [0.27, -0.1], [0, -0.1]].map(([x, y]) => new THREE.Vector2(x, y)), 18),
  limb: (() => { const pts = []; for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + i / 6 * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a), -1 + Math.sin(a))); } for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a), Math.sin(a) * 0.4)); } return new THREE.LatheGeometry(pts.map(v => new THREE.Vector2(v.x * 0.075, v.y * 0.15 - 0.0)), 12); })(),
  brim: new THREE.CylinderGeometry(0.78, 0.82, 0.05, 28),
  dome: new THREE.SphereGeometry(0.44, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  cone: new THREE.ConeGeometry(0.85, 0.42, 28, 1, true),
  torus: new THREE.TorusGeometry(0.3, 0.06, 8, 24),
  hairCap: new THREE.SphereGeometry(0.455, 28, 16, 0, Math.PI * 2, 0, 1.05),
  hairBack: new THREE.SphereGeometry(0.46, 28, 18, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, 2.15),
  hairBackLong: new THREE.SphereGeometry(0.47, 28, 20, Math.PI / 2 + 1.0, Math.PI * 2 - 2.0, 0, 2.55),
  scarf: new THREE.SphereGeometry(0.465, 28, 18, Math.PI / 2 + 0.9, Math.PI * 2 - 1.8, 0, 2.3),
  scarfTop: new THREE.SphereGeometry(0.47, 28, 14, 0, Math.PI * 2, 0, 1.15),
};
function part(geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, outline = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true;
  if (outline) m.add(new THREE.Mesh(geo, OUTLINE_THIN));
  return m;
}
class Character {
  constructor(L) {
    this.L = L; this.t = rnd() * 10; this.phase = 0; this.blinkT = rr(1, 4); this.talking = 0; this.mode = 'idle'; this.speed = 0; this.wave = 0; this.look = 0;
    const g = this.root = new THREE.Group(); const body = this.body = new THREE.Group(); g.add(body);
    const skin = toon(L.skin);
    const shirtMat = L.pattern ? patMat(L.pattern, L.shirt, L.shirt2) : toon(L.shirt);
    const sc = L.scale || 1; g.scale.setScalar(sc);
    // 腿
    this.legs = [];
    for (const s of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(s * 0.1, 0.3, 0); body.add(hip);
      hip.add(part(CG.limb, L.pants && L.longPants ? toon(L.pants) : skin, 0, 0, 0, 1.15, 0.78, 1.15));
      if (L.boots) hip.add(part(CG.ball, toon(L.boots), 0, -0.2, 0, 0.1, 0.12, 0.1));
      else hip.add(part(CG.ball, toon(L.sock || 0xffffff), 0, -0.21, 0, 0.083, 0.04, 0.083, false));
      hip.add(part(CG.ball, toon(L.shoe || 0x6b4a3a), 0, -0.27, 0.035, 0.095, 0.065, 0.14));
      hip.add(part(CG.ball, toon(0xf3efe6), 0, -0.315, 0.035, 0.1, 0.02, 0.145, false));
      this.legs.push(hip);
    }
    // 下半身
    if (L.skirt) body.add(part(CG.skirt, toon(L.pants), 0, 0.3, 0));
    else body.add(part(CG.shorts, toon(L.pants || 0x34507a), 0, 0.33, 0));
    // 身體
    const torso = this.torso = new THREE.Group(); torso.position.y = 0.3; body.add(torso);
    torso.add(part(CG.torso, shirtMat, 0, 0, 0, 1, 1, 0.9));
    if (L.collar) { const co = part(CG.torus, toon(L.collar), 0, 0.46, 0, 0.62, 0.62, 0.62, false); co.rotation.x = Math.PI / 2; torso.add(co); }
    if (L.apron) { const ap = part(CG.ball, toon(L.apron), 0, 0.18, 0.17, 0.2, 0.24, 0.08); torso.add(ap); }
    if (L.vest) { for (const s of [-1, 1]) { const v = part(CG.ball, toon(L.vest), s * 0.14, 0.24, 0.12, 0.13, 0.22, 0.13); torso.add(v); } }
    if (L.necktie) { const nt = part(CG.ball, toon(L.necktie), 0, 0.26, 0.24, 0.05, 0.2, 0.03, false); torso.add(nt); }
    if (L.towel) { const tw = part(CG.torus, toon(L.towel), 0, 0.45, 0, 0.75, 0.75, 0.9); tw.rotation.x = Math.PI / 2 - 0.15; torso.add(tw); }
    if (L.backpack) { torso.add(part(CG.ball, toon(L.backpack), 0, 0.26, -0.24, 0.2, 0.22, 0.12)); torso.add(part(CG.ball, toon(0xffffff), 0, 0.2, -0.33, 0.1, 0.06, 0.03, false)); }
    if (L.camera) { torso.add(part(new THREE.BoxGeometry(0.16, 0.11, 0.08), toon(0x333333), 0.05, 0.22, 0.25)); }
    // 手
    this.arms = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(s * 0.25, 0.4, 0); torso.add(sh);
      sh.add(part(CG.ball, shirtMat, 0, -0.04, 0, 0.1, 0.11, 0.1));
      const arm = part(CG.limb, L.longSleeve ? shirtMat : skin, 0, -0.02, 0, 0.92, 0.9, 0.92); sh.add(arm);
      sh.add(part(CG.ball, skin, 0, -0.3, 0, 0.075, 0.08, 0.075));
      sh.rotation.z = s * 0.12;
      this.arms.push(sh);
    }
    if (L.hold) { this.hold = L.hold(); this.arms[1].add(this.hold); }
    // 頭
    const head = this.head = new THREE.Group(); head.position.y = 0.3 + 0.48 + 0.33; body.add(head);
    this.faceT = { open: faceTex(L, 'open'), blink: faceTex(L, 'blink'), talk: faceTex(L, 'talk') };
    this.faceM = new THREE.MeshToonMaterial({ map: this.faceT.open, gradientMap: GRAD });
    head.add(part(CG.head, this.faceM, 0, 0, 0, 1, 0.94, 0.96));
    for (const s of [-1, 1]) head.add(part(CG.ball, skin, s * 0.41, -0.02, 0, 0.07, 0.09, 0.06));
    this.buildHair(head, L);
    if (L.glasses) for (const s of [-1, 1]) { const gl = part(CG.torus, toon(L.glasses), s * 0.14, -0.06, 0.39, 0.28, 0.28, 0.28, false); head.add(gl); }
    g.traverse(o => { o.frustumCulled = true; });
  }
  buildHair(head, L) {
    const hm = toon(L.hair || 0x3b2a22);
    const st = L.hairStyle || 'short';
    if (st === 'scarf' || L.scarf) {
      const sm = patMat('flower', L.scarf || '#3d7fb5', L.scarf2 || '#ffffffcc');
      head.add(part(CG.scarfTop, sm, 0, 0.02, 0, 1, 1, 1));
      const b = part(CG.scarf, sm, 0, 0, 0); head.add(b);
      head.add(part(CG.ball, sm, 0, -0.3, -0.36, 0.12, 0.1, 0.1));   // 結
    } else if (st !== 'bald') {
      head.add(part(CG.hairCap, hm, 0, 0.0, 0, 1, 1, 1));
      const back = part(st === 'long' || st === 'twin' ? CG.hairBackLong : CG.hairBack, hm, 0, 0, -0.005); head.add(back);
      // 瀏海
      const n = st === 'spiky' ? 5 : 4;
      for (let i = 0; i < n; i++) {
        const a = (i - (n - 1) / 2) * 0.32, b = part(CG.ball, hm, Math.sin(a) * 0.36, 0.2 - Math.abs(a) * 0.08, Math.cos(a) * 0.3, 0.13, st === 'spiky' ? 0.18 : 0.13, 0.11);
        b.rotation.set(-0.5, a, -a * 0.6); head.add(b);
      }
      if (st === 'bun') head.add(part(CG.ball, hm, 0, 0.36, -0.22, 0.18, 0.16, 0.18));
      if (st === 'perm') for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, y = 0.18 + (i % 3) * 0.08; head.add(part(CG.ball, hm, Math.cos(a) * 0.36, y, Math.sin(a) * 0.34 - 0.04, 0.13, 0.12, 0.13, false)); }
      if (st === 'slick') head.add(part(CG.ball, hm, 0, 0.3, 0.05, 0.36, 0.14, 0.36));
      if (st === 'pony') { const t = part(CG.ball, hm, 0, 0.0, -0.5, 0.12, 0.26, 0.12); t.rotation.x = 0.5; head.add(t); head.add(part(CG.ball, toon(L.tie || 0xe8789a), 0, 0.16, -0.43, 0.07, 0.07, 0.07)); }
      if (st === 'twin') for (const s of [-1, 1]) { head.add(part(CG.ball, hm, s * 0.42, -0.14, -0.12, 0.12, 0.24, 0.12)); head.add(part(CG.ball, toon(L.tie || 0xe8789a), s * 0.4, 0.06, -0.1, 0.07, 0.07, 0.07)); }
      if (st === 'long') for (const s of [-1, 1]) head.add(part(CG.ball, hm, s * 0.36, -0.22, -0.08, 0.12, 0.28, 0.14));
    } else {
      for (const s of [-1, 1]) head.add(part(CG.ball, hm, s * 0.38, 0.0, -0.12, 0.1, 0.14, 0.16));
      head.add(part(CG.ball, hm, 0, -0.02, -0.4, 0.22, 0.14, 0.08));
    }
    // 帽子
    const hat = L.hat;
    if (hat === 'straw') {
      const m = toon(0xf0d79a); head.add(part(CG.brim, m, 0, 0.26, 0, 0.92, 1, 0.92)); head.add(part(CG.dome, m, 0, 0.27, 0, 0.98, 0.72, 0.98));
      const band = part(CG.torus, toon(L.ribbon || 0xe8789a), 0, 0.31, 0, 1.43, 1.43, 0.6, false); band.rotation.x = Math.PI / 2; head.add(band);
      const bow = part(CG.ball, toon(L.ribbon || 0xe8789a), 0.3, 0.33, -0.28, 0.09, 0.07, 0.05); head.add(bow);
    } else if (hat === 'douli') {   // 斗笠
      const m = toon(0xe2c27a); const c = part(CG.cone, m, 0, 0.42, 0, 1, 1, 1); c.material = new THREE.MeshToonMaterial({ color: 0xe2c27a, gradientMap: GRAD, side: THREE.DoubleSide }); head.add(c);
      head.add(part(CG.ball, toon(0xc9a45e), 0, 0.64, 0, 0.08, 0.05, 0.08, false));
      for (const r of [0.35, 0.6]) { const ring = part(CG.torus, toon(0xb8924d), 0, 0.42 + 0.21 - r * 0.25, 0, r * 2.2, r * 2.2, 0.25, false); ring.rotation.x = Math.PI / 2; head.add(ring); }
    } else if (hat === 'cap') {
      const m = toon(L.hatCol || 0x2f9ea0); head.add(part(CG.dome, m, 0, 0.12, 0, 1.05, 0.95, 1.05)); const v = part(CG.ball, m, 0, 0.14, 0.42, 0.3, 0.03, 0.2); head.add(v);
    } else if (hat === 'captain') {
      head.add(part(new THREE.CylinderGeometry(0.46, 0.42, 0.2, 24), toon(0xffffff), 0, 0.33, 0));
      head.add(part(new THREE.CylinderGeometry(0.43, 0.43, 0.06, 24), toon(0x22374f), 0, 0.24, 0, 1, 1, 1, false));
      head.add(part(CG.ball, toon(0x22374f), 0, 0.22, 0.4, 0.26, 0.03, 0.16)); head.add(part(CG.ball, toon(0xf2c14e), 0, 0.33, 0.44, 0.06, 0.06, 0.02, false));
    } else if (hat === 'helmet') {
      const m = toon(0xf5c245); head.add(part(CG.dome, m, 0, 0.12, 0, 1.1, 1.05, 1.1)); head.add(part(CG.brim, m, 0, 0.13, 0, 0.66, 1, 0.66));
    } else if (hat === 'headband') {
      const hb = part(CG.torus, toon(0xffffff), 0, 0.14, 0, 1.45, 1.45, 0.9, false); hb.rotation.x = Math.PI / 2; head.add(hb);
      head.add(part(CG.ball, toon(0xe0584a), 0, 0.14, 0.44, 0.07, 0.07, 0.03, false));
    } else if (hat === 'safari') {
      const m = toon(0xc9b27d); head.add(part(CG.brim, m, 0, 0.24, 0, 0.75, 1, 0.75)); head.add(part(CG.dome, m, 0, 0.24, 0, 0.98, 0.65, 0.98));
    } else if (hat === 'mask') {   // 潛水面鏡掛在額頭
      head.add(part(CG.ball, toon(0x2f9ea0), 0, 0.22, 0.32, 0.26, 0.12, 0.12)); head.add(part(CG.ball, toon(0xbfe9e6), 0, 0.22, 0.4, 0.2, 0.08, 0.05, false));
      const st2 = part(CG.torus, toon(0x2a2a2a), 0, 0.2, 0, 1.45, 1.45, 0.4, false); st2.rotation.x = Math.PI / 2 - 0.3; head.add(st2);
    }
  }
  say(on) { this.talking = on ? 1 : 0; }
  update(dt, time) {
    this.t += dt;
    const L = this.L, b = this.body, sp = this.speed;
    // 眨眼、說話
    this.blinkT -= dt; let face = 'open';
    if (this.blinkT < 0) { face = 'blink'; if (this.blinkT < -0.12) this.blinkT = rr(2, 5); }
    if (this.talking && Math.sin(this.t * 22) > 0 && face !== 'blink') face = 'talk';
    const tex = this.faceT[face]; if (this.faceM.map !== tex) this.faceM.map = tex;
    const [lL, lR] = this.legs, [aL, aR] = this.arms;
    let bob = 0;
    if (this.mode === 'bike') {
      this.phase += dt * 9;
      lL.rotation.x = -1.0 + Math.sin(this.phase) * 0.55; lR.rotation.x = -1.0 - Math.sin(this.phase) * 0.55;
      aL.rotation.x = aR.rotation.x = -1.05; aL.rotation.z = -0.15; aR.rotation.z = 0.15;
      this.torso.rotation.x = 0.25; b.position.y = 0.42; this.head.rotation.x = -0.15;
    } else if (this.mode === 'sit') {
      lL.rotation.x = lR.rotation.x = -1.45; b.position.y = -0.04; aL.rotation.x = aR.rotation.x = -0.5; this.torso.rotation.x = 0;
      bob = Math.sin(this.t * 1.6) * 0.008;
    } else if (sp > 0.05) {
      this.phase += dt * (5 + sp * 6.5);
      const amp = Math.min(0.85, 0.35 + sp * 0.45);
      lL.rotation.x = Math.sin(this.phase) * amp; lR.rotation.x = -Math.sin(this.phase) * amp;
      aL.rotation.x = -Math.sin(this.phase) * amp * 0.9; aR.rotation.x = Math.sin(this.phase) * amp * 0.9;
      aL.rotation.z = -0.15; aR.rotation.z = 0.15;
      bob = Math.abs(Math.sin(this.phase)) * 0.06 * Math.min(1, sp + 0.3);
      this.torso.rotation.x = sp * 0.12; this.torso.rotation.y = Math.sin(this.phase) * 0.08; this.head.rotation.x = 0; b.position.y = 0;
    } else {
      const k = Math.min(1, dt * 8);
      lL.rotation.x *= 1 - k; lR.rotation.x *= 1 - k; aL.rotation.x *= 1 - k; aR.rotation.x *= 1 - k;
      aL.rotation.z = -0.12 - Math.sin(this.t * 1.7) * 0.03; aR.rotation.z = 0.12 + Math.sin(this.t * 1.7) * 0.03;
      this.torso.rotation.x = 0; this.torso.rotation.y *= 1 - k; b.position.y = 0;
      this.torso.scale.y = 1 + Math.sin(this.t * 2.2) * 0.015;
      this.head.rotation.y = Math.sin(this.t * 0.45 + this.look) * 0.25 + (this.talking ? Math.sin(this.t * 3) * 0.05 : 0);
      this.head.rotation.z = this.talking ? Math.sin(this.t * 5) * 0.05 : Math.sin(this.t * 0.7) * 0.03;
      if (L.pose === 'fish') { aR.rotation.x = -1.0; aL.rotation.x = -0.9; aL.rotation.z = 0.3; }
      if (L.pose === 'hips') { aL.rotation.z = -0.7; aR.rotation.z = 0.7; aL.rotation.x = aR.rotation.x = 0.3; }
      if (L.pose === 'pray') { aL.rotation.x = aR.rotation.x = -1.2; aL.rotation.z = 0.45; aR.rotation.z = -0.45; }
    }
    if (this.wave > 0) { this.wave -= dt; aR.rotation.x = -0.2; aR.rotation.z = 2.5 + Math.sin(this.t * 14) * 0.35; }
    b.position.y += bob + (this.jumpY || 0);
  }
}
// 頭像（對話框用）
function drawPortrait(cv, L) {
  const g = cv.getContext('2d'), W = cv.width; g.clearRect(0, 0, W, W);
  g.save(); g.beginPath(); g.arc(W / 2, W / 2, W / 2, 0, 7); g.clip();
  g.fillStyle = '#cdeee9'; g.fillRect(0, 0, W, W);
  g.fillStyle = '#bfe3dc'; g.beginPath(); g.arc(W / 2, W * 1.15, W * 0.55, 0, 7); g.fill();
  const shirt = typeof L.shirt === 'string' ? L.shirt : '#' + new THREE.Color(L.shirt).getHexString();
  g.fillStyle = shirt; g.beginPath(); g.ellipse(W / 2, W * 1.02, W * 0.34, W * 0.24, 0, 0, 7); g.fill();
  const hair = '#' + new THREE.Color(L.hair || 0x3b2a22).getHexString();
  const cx = W / 2, cy = W * 0.5, r = W * 0.34;
  if (L.scarf) { g.fillStyle = L.scarf; g.beginPath(); g.arc(cx, cy, r * 1.12, 0, 7); g.fill(); flowerDots(g, cx - r, cy - r * 1.1, r * 2, r * 2.2, L.scarf2 || '#ffffffcc', 9); }
  else if ((L.hairStyle || 'short') !== 'bald') { g.fillStyle = hair; g.beginPath(); g.arc(cx, cy - r * 0.05, r * 1.08, Math.PI * 0.95, Math.PI * 2.05); g.fill(); if (L.hairStyle === 'long' || L.hairStyle === 'twin') { g.fillRect(cx - r * 1.08, cy - r * 0.1, r * 0.3, r * 1.1); g.fillRect(cx + r * 0.78, cy - r * 0.1, r * 0.3, r * 1.1); } }
  // 臉：從臉部貼圖裁切
  const fc = document.createElement('canvas'); fc.width = 256; fc.height = 256; const fg = fc.getContext('2d');
  fg.fillStyle = L.skin; fg.fillRect(0, 0, 256, 256); drawFace(fg, L, 'open', 0, 0, 1);
  g.save(); g.beginPath(); g.arc(cx, cy + r * 0.08, r, 0, 7); g.clip();
  g.drawImage(fc, 128 - 74, 146 - 72, 148, 148, cx - r, cy - r + r * 0.08, r * 2, r * 2); g.restore();
  g.lineWidth = W * 0.02; g.strokeStyle = '#29434a'; g.beginPath(); g.arc(cx, cy + r * 0.08, r, 0, 7); g.stroke();
  if (!L.scarf && (L.hairStyle || 'short') !== 'bald') { g.fillStyle = hair; g.beginPath(); g.ellipse(cx, cy - r * 0.62, r * 0.95, r * 0.42, 0, Math.PI, Math.PI * 2); g.fill(); for (let i = -1; i <= 1; i++) { g.beginPath(); g.ellipse(cx + i * r * 0.42, cy - r * 0.6, r * 0.32, r * 0.24, 0, 0, Math.PI); g.fill(); } }
  if (L.hat === 'straw' || L.hat === 'safari') { g.fillStyle = L.hat === 'straw' ? '#f0d79a' : '#c9b27d'; g.beginPath(); g.ellipse(cx, cy - r * 0.78, r * 1.45, r * 0.26, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(cx, cy - r * 0.86, r * 0.82, r * 0.62, 0, Math.PI, Math.PI * 2); g.fill(); if (L.hat === 'straw') { g.fillStyle = '#e8789a'; g.fillRect(cx - r * 0.82, cy - r * 0.98, r * 1.64, r * 0.16); } }
  if (L.hat === 'douli') { g.fillStyle = '#e2c27a'; g.beginPath(); g.moveTo(cx - r * 1.6, cy - r * 0.6); g.lineTo(cx, cy - r * 1.45); g.lineTo(cx + r * 1.6, cy - r * 0.6); g.closePath(); g.fill(); g.strokeStyle = '#b8924d'; g.lineWidth = 2; g.stroke(); }
  if (L.hat === 'cap' || L.hat === 'helmet') { g.fillStyle = L.hat === 'cap' ? '#' + new THREE.Color(L.hatCol || 0x2f9ea0).getHexString() : '#f5c245'; g.beginPath(); g.ellipse(cx, cy - r * 0.55, r * 1.02, r * 0.75, 0, Math.PI, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(cx + r * 0.25, cy - r * 0.55, r * 0.9, r * 0.16, 0, 0, 7); g.fill(); }
  if (L.hat === 'captain') { g.fillStyle = '#fff'; g.fillRect(cx - r, cy - r * 1.15, r * 2, r * 0.55); g.fillStyle = '#22374f'; g.fillRect(cx - r, cy - r * 0.66, r * 2, r * 0.16); }
  if (L.hat === 'headband') { g.fillStyle = '#fff'; g.fillRect(cx - r, cy - r * 0.62, r * 2, r * 0.18); g.fillStyle = '#e0584a'; g.beginPath(); g.arc(cx, cy - r * 0.53, r * 0.1, 0, 7); g.fill(); }
  g.restore();
  g.lineWidth = W * 0.035; g.strokeStyle = '#1f4f57'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - g.lineWidth / 2, 0, 7); g.stroke();
}
function mkRod() { const g = new THREE.Group(); const r = part(new THREE.CylinderGeometry(0.012, 0.02, 1.6, 6), toon(0x5a3b2a), 0, -0.3, 0.75); r.rotation.x = Math.PI / 2 - 0.5; g.add(r); return g; }
function mkBasket() { const g = new THREE.Group(); g.add(part(new THREE.CylinderGeometry(0.16, 0.12, 0.18, 12), toon(0xc9a45e), 0, -0.4, 0.05)); return g; }
function mkBroom() { const g = new THREE.Group(); const s = part(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 6), toon(0x9b6a45), 0, -0.45, 0.1); g.add(s); g.add(part(CG.ball, toon(0xd8c07a), 0, -1.05, 0.1, 0.12, 0.16, 0.06)); return g; }
function mkFlag() { const g = new THREE.Group(); g.add(part(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 6), toon(0x777777), 0, -0.1, 0.05)); g.add(part(new THREE.BoxGeometry(0.02, 0.22, 0.34), toon(0xe8789a), 0, 0.22, 0.22)); return g; }

// 小動物：貓、海鷗、綠蠵龜
function mkCat(col = 0xf2a65a) {
  const g = new THREE.Group(), m = toon(col), w = toon(0xffffff);
  g.add(part(CG.ball, m, 0, 0.18, 0, 0.16, 0.13, 0.24));
  g.add(part(CG.ball, m, 0, 0.32, 0.2, 0.14, 0.13, 0.13));
  g.add(part(CG.ball, w, 0, 0.28, 0.31, 0.07, 0.05, 0.03, false));
  for (const s of [-1, 1]) { const e = part(new THREE.ConeGeometry(0.05, 0.1, 4), m, s * 0.08, 0.45, 0.2); g.add(e); g.add(part(CG.ball, toon(0x2b1d18), s * 0.05, 0.34, 0.32, 0.015, 0.025, 0.01, false)); }
  const tail = part(CG.ball, m, 0, 0.3, -0.26, 0.04, 0.16, 0.04); tail.rotation.x = -0.6; g.add(tail); g.userData.tail = tail;
  return g;
}
function mkGull() {
  const g = new THREE.Group(), w = toon(0xffffff), gr = toon(0xb8c4c8);
  g.add(part(CG.ball, w, 0, 0, 0, 0.12, 0.11, 0.28));
  g.add(part(CG.ball, w, 0, 0.08, 0.22, 0.09, 0.09, 0.09));
  g.add(part(new THREE.ConeGeometry(0.03, 0.12, 6), toon(0xf5c245), 0, 0.06, 0.34).rotateX(Math.PI / 2));
  const wings = [];
  for (const s of [-1, 1]) { const wg = new THREE.Group(); wg.position.set(s * 0.08, 0.04, 0); const p = part(CG.ball, gr, s * 0.3, 0, 0, 0.32, 0.025, 0.12); wg.add(p); g.add(wg); wings.push(wg); }
  g.userData.wings = wings; return g;
}
function mkTurtle(s = 1, shell = 0x5f7f45) {
  const g = new THREE.Group();
  g.add(part(CG.ball, toon(shell), 0, 0.08 * s, 0, 0.24 * s, 0.1 * s, 0.3 * s));
  g.add(part(CG.ball, toon(0x9cb87a), 0, 0.07 * s, 0.32 * s, 0.09 * s, 0.07 * s, 0.1 * s));
  const fl = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const f = part(CG.ball, toon(0x9cb87a), sx * 0.24 * s, 0.04 * s, sz * 0.16 * s, 0.13 * s, 0.025 * s, 0.06 * s, false); g.add(f); fl.push(f); }
  g.userData.fl = fl; return g;
}
