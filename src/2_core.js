'use strict';
/* =========================================================
   證券大亨 — core：城市小行星的數學、街道、時間
   ========================================================= */
const R = 26;
const V3 = THREE.Vector3;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry32(19870);
const rr = (a, b) => a + (b - a) * rnd();
const IS_TOUCH = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
const angDist = (a, b) => Math.acos(clamp(a.dot(b), -1, 1)) * R;
const tangentize = (v, up) => { v.addScaledVector(up, -v.dot(up)); return v.normalize(); };

/* 兩條大街：橫向「城中路」（赤道）與縱向「館前街」（經線），交會於 A（證券行前）與 B（車站前） */
const ROADS = {
  E: { name: '城中路', n: new V3(0, 1, 0), u: new V3(0, 0, 1), v: new V3(1, 0, 0) },
  M: { name: '館前街', n: new V3(1, 0, 0), u: new V3(0, 0, 1), v: new V3(0, 1, 0) },
};
const PT_A = new V3(0, 0, 1), PT_B = new V3(0, 0, -1);
const ROAD_W = 1.75, WALK_W = 4.25, FRONT = 4.6;   // 車道半寬、可走範圍（含騎樓）、店面牆
// s：沿街距離（單位），A 點為 0；side：+1/-1 街道兩側
function roadPoint(road, s, out = new V3()) {
  const a = s / R, r = ROADS[road];
  return out.copy(r.u).multiplyScalar(Math.cos(a)).addScaledVector(r.v, Math.sin(a)).normalize();
}
function slot(road, s, side, off) {
  const d0 = roadPoint(road, s), r = ROADS[road];
  const nrm = tangentize(r.n.clone().multiplyScalar(side), d0);
  const axis = new V3().crossVectors(d0, nrm).normalize();
  const dir = d0.clone().applyAxisAngle(axis, off / R).normalize();
  const fwd = tangentize(nrm.clone().negate(), dir);
  return { dir, fwd };
}
function roadDist(p) {
  return Math.min(Math.asin(Math.min(1, Math.abs(p.dot(ROADS.E.n)))) * R, Math.asin(Math.min(1, Math.abs(p.dot(ROADS.M.n)))) * R);
}
const OPEN = [{ d: PT_A, r: 6.5 }, { d: PT_B, r: 6.5 }];   // 廣場、公園、廟埕
function walkable(p) {
  if (roadDist(p) < WALK_W) return true;
  for (const o of OPEN) if (angDist(p, o.d) < o.r) return true;
  return false;
}
function camOpen(p, h) {
  if (h > 9.5) return true;
  if (roadDist(p) < 3.3) return true;
  for (const o of OPEN) if (angDist(p, o.d) < o.r - 0.5) return true;
  return false;
}

/* ---------- 時間：一天＝盤前跑街 → 盤中 → 盤後跑街 → 收工 ---------- */
const TIME = { min: 6 * 60 };
const PHASE = () => { const h = TIME.min / 60; return h < 9 ? 'pre' : h < 13.5 ? 'open' : h < 18 ? 'post' : 'night'; };
// 每真實秒前進幾分鐘（不同時段不同速度，讓盤中看得清楚）
const RATE = { pre: 5, open: 3, post: 6, night: 6 };
const fmtTime = () => { const m = Math.floor(TIME.min); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const money = n => (n < 0 ? '-' : '') + Math.round(Math.abs(n)).toLocaleString('zh-TW');
const wan = n => { const a = Math.abs(n); const s = a >= 1e8 ? (a / 1e8).toFixed(2) + ' 億' : a >= 1e4 ? (a / 1e4).toFixed(a >= 1e6 ? 0 : 1) + ' 萬' : Math.round(a) + ''; return (n < 0 ? '-' : '') + s; };
