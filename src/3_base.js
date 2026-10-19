/* =========================================================
   world: renderer、材質、合併建模器、地形、海、天空、雲、道路
   ========================================================= */
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, IS_TOUCH ? 1.6 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfe8ea, 50, 170);
const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 2000);

const hemi = new THREE.HemisphereLight(0xeaf8ff, 0xb7a882, 0.46);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3dc, 0.72);
sun.castShadow = true;
sun.shadow.mapSize.set(IS_TOUCH ? 1024 : 2048, IS_TOUCH ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 140 });
sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const amb = new THREE.AmbientLight(0xffffff, 0.05); scene.add(amb);

/* ---------- 材質 ---------- */
const GRAD = (() => { const d = new Uint8Array([120, 120, 120, 182, 182, 182, 232, 232, 232, 255, 255, 255]); const t = new THREE.DataTexture(d, 4, 1, THREE.RGBFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; })();
const FOGU = { uFogC: { value: new THREE.Color() }, uFogN: { value: 50 }, uFogF: { value: 170 } };
const OUTLINE = new THREE.ShaderMaterial({
  uniforms: Object.assign({ uColor: { value: new THREE.Color(0x29434a) }, uW: { value: 0.028 } }, FOGU),
  vertexShader: `uniform float uW; varying float vF;
    void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vec3 n = normalize(normalMatrix*normal);
      mv.xyz += n*uW*(1.0+(-mv.z)*0.035); vF=-mv.z; gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 uColor,uFogC; uniform float uFogN,uFogF; varying float vF;
    void main(){ gl_FragColor = vec4(mix(uColor,uFogC,smoothstep(uFogN,uFogF,vF)),1.0); }`,
  side: THREE.BackSide,
});
const OUTLINE_THIN = OUTLINE.clone(); OUTLINE_THIN.uniforms = Object.assign({ uColor: OUTLINE.uniforms.uColor, uW: { value: 0.016 } }, FOGU);
const TOON_VC = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: GRAD });
const GLOW = new THREE.MeshBasicMaterial({ vertexColors: true });
const matCache = {};
function toon(col, extra) {
  const k = col + (extra ? JSON.stringify(extra) : '');
  return matCache[k] || (matCache[k] = new THREE.MeshToonMaterial(Object.assign({ color: col, gradientMap: GRAD }, extra || {})));
}

/* ---------- 合併建模器 ---------- */
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new V3(), _p = new V3();
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sph: [6, 8, 12, 16].reduce((o, n) => (o[n] = new THREE.SphereGeometry(1, n, Math.max(4, n * 0.66 | 0)), o), {}),
};
const cylCache = {};
function cylGeo(r1, r2, h, seg) { const k = [r1, r2, h, seg].join(); return cylCache[k] || (cylCache[k] = new THREE.CylinderGeometry(r1, r2, h, seg)); }
class GB {
  constructor() { this.L = []; this.jit = 0; }
  push(geo, col, m) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(m);
    const c = col instanceof THREE.Color ? col.clone() : new THREE.Color(col);
    if (this.jit) c.offsetHSL(0, 0, (rnd() - 0.5) * this.jit);
    this.L.push([g, c]); return this;
  }
  add(geo, col, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
    return this.push(geo, col, _m);
  }
  box(w, h, d, col, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) { return this.add(GEO.box, col, x, y, z, rx, ry, rz, w, h, d); }
  cyl(r1, r2, h, col, x = 0, y = 0, z = 0, seg = 10, rx = 0, ry = 0, rz = 0) { return this.add(cylGeo(r1, r2, h, seg), col, x, y, z, rx, ry, rz); }
  sph(r, col, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, seg = 12) { return this.add(GEO.sph[seg] || GEO.sph[12], col, x, y, z, 0, 0, 0, r * sx, r * sy, r * sz); }
  cone(r, h, col, x = 0, y = 0, z = 0, seg = 8, rx = 0, ry = 0, rz = 0) { return this.add(cylGeo(0.001, r, h, seg), col, x, y, z, rx, ry, rz); }
  merge(o, m) { for (const [g, c] of o.L) { const g2 = g.clone(); g2.applyMatrix4(m); this.L.push([g2, c]); } return this; }
  geometry() {
    let n = 0; for (const [g] of this.L) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
    let o = 0;
    for (const [g, c] of this.L) {
      const cnt = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
      for (let i = 0; i < cnt; i++) { const k = (o + i) * 3; col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b; }
      o += cnt;
    }
    const G = new THREE.BufferGeometry();
    G.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    G.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    G.setAttribute('color', new THREE.BufferAttribute(col, 3));
    G.computeBoundingSphere(); return G;
  }
  mesh(outline = true, mat = TOON_VC) {
    const m = new THREE.Mesh(this.geometry(), mat); m.castShadow = true; m.receiveShadow = true;
    if (outline) { const o = new THREE.Mesh(m.geometry, OUTLINE); m.add(o); }
    return m;
  }
}
function mkMesh(geo, mat, outline = true, thin = false) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
  if (outline) m.add(new THREE.Mesh(geo, thin ? OUTLINE_THIN : OUTLINE));
  return m;
}

/* ---------- 天空 ---------- */
const SKY_U = { uUp: { value: new V3(0, 0, 1) }, uTop: { value: new THREE.Color(0x58b8e6) }, uHor: { value: new THREE.Color(0xd8f2f0) }, uSun: { value: new V3(0, 1, 0) }, uSunC: { value: new THREE.Color(0xfff2c8) }, uStar: { value: 0 }, uTime: { value: 0 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 20), new THREE.ShaderMaterial({
  uniforms: SKY_U, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vD; void main(){ vD = normalize((modelMatrix*vec4(position,1.0)).xyz - cameraPosition); gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 uUp,uTop,uHor,uSun,uSunC; uniform float uStar,uTime; varying vec3 vD;
    float h31(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
    void main(){ vec3 d = normalize(vD); float h = dot(d,uUp);
      vec3 col = mix(uHor, uTop, smoothstep(-0.02, 0.62, h));
      col = mix(col, uHor*0.92, (1.0-smoothstep(-0.3,0.0,h)));
      float s = max(dot(d,uSun),0.0);
      col += uSunC*(pow(s,700.0)*1.4 + pow(s,30.0)*0.22 + pow(s,4.0)*0.08);
      if (uStar > 0.01){ vec3 q = floor(d*240.0); float st = step(0.9965, h31(q)); float tw = 0.6+0.4*sin(uTime*3.0+h31(q+1.0)*40.0);
        col += vec3(st*tw*uStar*smoothstep(0.0,0.25,h)); }
      gl_FragColor = vec4(col,1.0); }`,
}));
sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

